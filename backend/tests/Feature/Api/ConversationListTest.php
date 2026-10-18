<?php

namespace Tests\Feature\Api;

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class ConversationListTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_can_list_conversations(): void
    {
        $agent = User::factory()->agent()->create();
        Conversation::factory()->count(3)->create();

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_list_is_ordered_by_last_activity_then_id_desc(): void
    {
        $agent = User::factory()->agent()->create();

        $oldest = Conversation::factory()->create(['last_message_at' => '2026-10-01 10:00:00']);
        $newest = Conversation::factory()->create(['last_message_at' => '2026-10-05 10:00:00']);
        $middle = Conversation::factory()->create(['last_message_at' => '2026-10-03 10:00:00']);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->public_id)
            ->assertJsonPath('data.1.id', $middle->public_id)
            ->assertJsonPath('data.2.id', $oldest->public_id);
    }

    public function test_conversations_without_messages_come_last_and_are_stable(): void
    {
        $agent = User::factory()->agent()->create();

        $withActivity = Conversation::factory()->create(['last_message_at' => '2026-10-05 10:00:00']);
        $firstNull = Conversation::factory()->create(['last_message_at' => null]);
        $secondNull = Conversation::factory()->create(['last_message_at' => null]);

        // Nulls are last; among them the highest id comes first (id DESC).
        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $withActivity->public_id)
            ->assertJsonPath('data.1.id', $secondNull->public_id)
            ->assertJsonPath('data.2.id', $firstNull->public_id);
    }

    public function test_equal_last_activity_is_broken_by_id_desc(): void
    {
        $agent = User::factory()->agent()->create();

        $first = Conversation::factory()->create(['last_message_at' => '2026-10-05 10:00:00']);
        $second = Conversation::factory()->create(['last_message_at' => '2026-10-05 10:00:00']);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $second->public_id)
            ->assertJsonPath('data.1.id', $first->public_id);
    }

    public function test_list_can_filter_by_status(): void
    {
        $agent = User::factory()->agent()->create();
        Conversation::factory()->create(['status' => 'open']);
        Conversation::factory()->create(['status' => 'resolved']);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations?status=resolved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'resolved');
    }

    public function test_invalid_status_is_rejected(): void
    {
        $agent = User::factory()->agent()->create();

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations?status=archived')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_per_page_bounds_are_enforced(): void
    {
        $agent = User::factory()->agent()->create();

        $this->actingAs($agent)->getJson('/api/v1/conversations?per_page=0')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');

        $this->actingAs($agent)->getJson('/api/v1/conversations?per_page=51')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');

        $this->actingAs($agent)->getJson('/api/v1/conversations?per_page=abc')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');
    }

    public function test_per_page_limits_the_page_and_reports_meta(): void
    {
        $agent = User::factory()->agent()->create();
        Conversation::factory()->count(5)->create();

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5);
    }

    public function test_invalid_page_is_rejected(): void
    {
        $agent = User::factory()->agent()->create();

        $this->actingAs($agent)->getJson('/api/v1/conversations?page=0')
            ->assertUnprocessable()->assertJsonValidationErrors('page');

        $this->actingAs($agent)->getJson('/api/v1/conversations?page=abc')
            ->assertUnprocessable()->assertJsonValidationErrors('page');
    }

    public function test_empty_list_is_a_200_with_empty_data(): void
    {
        $agent = User::factory()->agent()->create();

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_offset_pages_do_not_overlap_or_omit_conversations(): void
    {
        $agent = User::factory()->agent()->create();

        $expected = collect(range(1, 5))
            ->map(fn (int $i) => Conversation::factory()->create([
                'last_message_at' => sprintf('2026-10-%02d 10:00:00', $i),
            ])->public_id)
            ->reverse()
            ->values()
            ->all();

        $pageOne = $this->actingAs($agent)
            ->getJson('/api/v1/conversations?per_page=2&page=1')->assertOk()
            ->json('data');
        $pageTwo = $this->actingAs($agent)
            ->getJson('/api/v1/conversations?per_page=2&page=2')->assertOk()
            ->json('data');
        $pageThree = $this->actingAs($agent)
            ->getJson('/api/v1/conversations?per_page=2&page=3')->assertOk()
            ->json('data');

        $ids = array_merge(
            array_column($pageOne, 'id'),
            array_column($pageTwo, 'id'),
            array_column($pageThree, 'id'),
        );

        $this->assertSame($expected, $ids);
        $this->assertSame(count($expected), count(array_unique($ids)));
    }

    public function test_list_omits_contact_phone_and_includes_last_message_summary(): void
    {
        $agent = User::factory()->agent()->create();
        $contact = Contact::factory()->create(['display_name' => 'Ana', 'phone_e164' => '+34600000000']);
        $conversation = Conversation::factory()->create([
            'contact_id' => $contact->id,
            'last_message_at' => now(),
        ]);
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => 'old']);
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => 'newest']);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('data.0', fn (AssertableJson $conversation) => $conversation
                    ->has('contact', fn (AssertableJson $contact) => $contact
                        ->where('display_name', 'Ana')
                        ->missing('phone_e164')
                        ->missing('provider')
                        ->missing('provider_user_id')
                        ->etc())
                    ->where('last_message.body', 'newest')
                    ->etc())
                ->etc());
    }

    public function test_conversation_without_messages_has_null_last_message(): void
    {
        $agent = User::factory()->agent()->create();
        Conversation::factory()->create(['last_message_at' => null]);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.last_message', null);
    }

    public function test_list_does_not_expose_internal_fields(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['last_message_at' => now()]);
        Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('data.0', fn (AssertableJson $conversation) => $conversation
                    ->missing('contact_id')
                    ->missing('assigned_user_id')
                    ->has('last_message', fn (AssertableJson $message) => $message
                        ->missing('processing_status')
                        ->missing('provider_status')
                        ->missing('provider_message_id')
                        ->missing('idempotency_key')
                        ->missing('error_code')
                        ->missing('error_message')
                        ->missing('media_provider_id')
                        ->missing('conversation_id')
                        ->missing('sent_by_user_id')
                        ->etc())
                    ->etc())
                ->etc());
    }
}
