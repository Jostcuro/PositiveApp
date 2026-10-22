<?php

namespace Tests\Feature\Api;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationWriteSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_assignment_ignores_extra_fields_and_does_not_mass_assign(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->agent()->create();
        $other = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create([
            'assigned_user_id' => null,
            'status' => 'open',
        ]);
        $originalPublicId = $conversation->public_id;

        $this->actingAs($admin)
            ->postJson("/api/v1/conversations/{$conversation->public_id}/assignment", [
                'user' => $target->public_id,
                'assigned_user_id' => $other->id,
                'status' => 'resolved',
                'public_id' => 'not-the-public-id',
                'contact_id' => 999,
            ])
            ->assertOk();

        $conversation->refresh();

        $this->assertSame($target->id, $conversation->assigned_user_id);
        $this->assertSame('open', $conversation->status);
        $this->assertSame($originalPublicId, $conversation->public_id);
    }

    public function test_status_change_ignores_extra_fields_and_does_not_mass_assign(): void
    {
        $agent = User::factory()->agent()->create();
        $other = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create([
            'assigned_user_id' => null,
            'status' => 'open',
        ]);

        $this->actingAs($agent)
            ->patchJson("/api/v1/conversations/{$conversation->public_id}/status", [
                'status' => 'pending',
                'assigned_user_id' => $other->id,
                'public_id' => 'not-the-public-id',
            ])
            ->assertOk();

        $conversation->refresh();

        $this->assertSame('pending', $conversation->status);
        $this->assertNull($conversation->assigned_user_id);
    }

    public function test_malformed_public_id_is_not_found_for_write_endpoints(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->agent()->create();

        $this->actingAs($admin)
            ->postJson('/api/v1/conversations/not-a-ulid/assignment', ['user' => $target->public_id])
            ->assertNotFound();

        $this->actingAs($admin)
            ->deleteJson('/api/v1/conversations/not-a-ulid/assignment')
            ->assertNotFound();

        $this->actingAs($admin)
            ->patchJson('/api/v1/conversations/not-a-ulid/status', ['status' => 'pending'])
            ->assertNotFound();
    }

    public function test_write_responses_do_not_expose_internal_identifiers(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($admin)
            ->postJson("/api/v1/conversations/{$conversation->public_id}/assignment", ['user' => $target->public_id])
            ->assertOk()
            ->assertJsonMissingPath('data.assigned_user_id')
            ->assertJsonMissingPath('data.assigned_user.id')
            ->assertJsonMissingPath('data.contact_id');
    }
}
