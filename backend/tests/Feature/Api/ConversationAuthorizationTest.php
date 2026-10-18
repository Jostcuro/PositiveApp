<?php

namespace Tests\Feature\Api;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConversationAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_read_endpoints_require_authentication(): void
    {
        $conversation = Conversation::factory()->create();

        $this->getJson('/api/v1/conversations')->assertUnauthorized();
        $this->getJson("/api/v1/conversations/{$conversation->public_id}")->assertUnauthorized();
        $this->getJson("/api/v1/conversations/{$conversation->public_id}/messages")->assertUnauthorized();
    }

    public function test_a_deactivated_user_loses_access_to_the_read_endpoints(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($user);
        $user->update(['is_active' => false]);

        $this->getJson('/api/v1/conversations')->assertUnauthorized();
        $this->getJson("/api/v1/conversations/{$conversation->public_id}")->assertUnauthorized();
        $this->getJson("/api/v1/conversations/{$conversation->public_id}/messages")->assertUnauthorized();
    }

    /**
     * DD-001: every operational role reads every conversation; assignment does
     * not restrict visibility in the MVP.
     */
    public function test_agent_sees_conversations_assigned_to_other_users(): void
    {
        $otherAgent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $otherAgent->id]);
        $agent = User::factory()->agent()->create();

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $conversation->public_id);
    }

    public function test_admin_can_read_conversations(): void
    {
        $admin = User::factory()->admin()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($admin)
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $conversation->public_id);
    }

    public function test_unknown_public_id_is_not_found(): void
    {
        $agent = User::factory()->agent()->create();
        $missing = (string) Str::ulid();

        $this->actingAs($agent)->getJson("/api/v1/conversations/{$missing}")
            ->assertNotFound()
            ->assertJsonPath('message', 'Recurso no encontrado.')
            ->assertJsonMissing(['App\\Models\\Conversation']);

        $this->actingAs($agent)->getJson("/api/v1/conversations/{$missing}/messages")
            ->assertNotFound()
            ->assertJsonPath('message', 'Recurso no encontrado.');
    }

    public function test_malformed_public_id_is_not_found(): void
    {
        $agent = User::factory()->agent()->create();

        $this->actingAs($agent)->getJson('/api/v1/conversations/not-a-ulid')->assertNotFound();
        $this->actingAs($agent)->getJson('/api/v1/conversations/not-a-ulid/messages')->assertNotFound();
    }
}
