<?php

namespace Tests\Feature\Api;

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class ConversationShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_returns_the_conversation_with_full_contact(): void
    {
        $agent = User::factory()->agent()->create();
        $contact = Contact::factory()->create(['display_name' => 'Ana', 'phone_e164' => '+34600000000']);
        $conversation = Conversation::factory()->create([
            'contact_id' => $contact->id,
            'last_message_at' => now(),
        ]);
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => 'hello']);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('data', fn (AssertableJson $data) => $data
                    ->where('id', $conversation->public_id)
                    ->where('status', 'open')
                    ->where('contact.display_name', 'Ana')
                    ->where('contact.phone_e164', '+34600000000')
                    ->missing('contact.provider')
                    ->missing('contact.provider_user_id')
                    ->where('last_message.body', 'hello')
                    ->etc())
                ->etc());
    }

    public function test_show_reports_unassigned_conversations_as_null(): void
    {
        $agent = User::factory()->agent()->create();
        Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations/'.Conversation::first()->public_id)
            ->assertOk()
            ->assertJsonPath('data.assigned_user', null);
    }

    public function test_show_reports_the_assigned_user_public_profile(): void
    {
        $agent = User::factory()->agent()->create();
        $assignee = User::factory()->agent()->create(['name' => 'María López']);
        $conversation = Conversation::factory()->create(['assigned_user_id' => $assignee->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertOk()
            ->assertJsonPath('data.assigned_user.name', 'María López')
            ->assertJsonPath('data.assigned_user.public_id', $assignee->public_id)
            ->assertJsonMissingPath('data.assigned_user.id')
            ->assertJsonMissingPath('data.assigned_user.email')
            ->assertJsonMissingPath('data.assigned_user.role');
    }

    public function test_show_reports_null_optional_contact_fields(): void
    {
        $agent = User::factory()->agent()->create();
        $contact = Contact::factory()->create(['display_name' => null, 'phone_e164' => null]);
        $conversation = Conversation::factory()->create(['contact_id' => $contact->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertOk()
            ->assertJsonPath('data.contact.display_name', null)
            ->assertJsonPath('data.contact.phone_e164', null);
    }

    public function test_show_reports_null_message_body(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['last_message_at' => now()]);
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => null]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertOk()
            ->assertJsonPath('data.last_message.body', null);
    }

    public function test_show_does_not_expose_internal_fields(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('data', fn (AssertableJson $data) => $data
                    ->missing('contact_id')
                    ->missing('assigned_user_id')
                    ->etc())
                ->etc());
    }
}
