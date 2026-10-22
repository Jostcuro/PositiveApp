<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\ConversationAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ConversationAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private function assignmentUrl(Conversation $conversation): string
    {
        return "/api/v1/conversations/{$conversation->public_id}/assignment";
    }

    public function test_assignment_endpoints_require_authentication(): void
    {
        $conversation = Conversation::factory()->create();
        $target = User::factory()->create();

        $this->postJson($this->assignmentUrl($conversation), ['user' => $target->public_id])
            ->assertUnauthorized();
        $this->deleteJson($this->assignmentUrl($conversation))->assertUnauthorized();
    }

    public function test_deactivated_user_cannot_mutate_assignments(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($agent);
        $agent->update(['is_active' => false]);

        $this->postJson($this->assignmentUrl($conversation), ['user' => $agent->public_id])
            ->assertUnauthorized();
        $this->deleteJson($this->assignmentUrl($conversation))->assertUnauthorized();
    }

    public function test_agent_can_claim_an_unassigned_conversation(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($agent)
            ->postJson($this->assignmentUrl($conversation), ['user' => $agent->public_id])
            ->assertOk()
            ->assertJsonPath('data.assigned_user.public_id', $agent->public_id)
            ->assertJsonMissingPath('data.assigned_user.id');

        $this->assertSame($agent->id, $conversation->refresh()->assigned_user_id);

        $audit = AuditLog::query()->latest('id')->firstOrFail();
        $this->assertSame('conversation.assigned', $audit->action);
        $this->assertSame($agent->id, $audit->actor_user_id);
        $this->assertSame($conversation->public_id, $audit->resource_id);
        $this->assertSame(['from' => null, 'to' => $agent->public_id], $audit->metadata);
    }

    public function test_agent_cannot_assign_the_conversation_to_another_user(): void
    {
        $agent = User::factory()->agent()->create();
        $other = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($agent)
            ->postJson($this->assignmentUrl($conversation), ['user' => $other->public_id])
            ->assertForbidden();

        $this->assertNull($conversation->refresh()->assigned_user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_agent_cannot_claim_an_already_assigned_conversation(): void
    {
        $owner = User::factory()->agent()->create();
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $owner->id]);

        $this->actingAs($agent)
            ->postJson($this->assignmentUrl($conversation), ['user' => $agent->public_id])
            ->assertStatus(409);

        $this->assertSame($owner->id, $conversation->refresh()->assigned_user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_agent_claiming_a_conversation_already_assigned_to_themselves_is_a_conflict(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $agent->id]);

        $this->actingAs($agent)
            ->postJson($this->assignmentUrl($conversation), ['user' => $agent->public_id])
            ->assertStatus(409);

        $this->assertSame($agent->id, $conversation->refresh()->assigned_user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_agent_cannot_reassign_a_conversation_they_own(): void
    {
        $agent = User::factory()->agent()->create();
        $other = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $agent->id]);

        $this->actingAs($agent)
            ->postJson($this->assignmentUrl($conversation), ['user' => $other->public_id])
            ->assertForbidden();

        $this->assertSame($agent->id, $conversation->refresh()->assigned_user_id);
    }

    public function test_admin_can_assign_an_unassigned_conversation(): void
    {
        $admin = User::factory()->admin()->create();
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => $agent->public_id])
            ->assertOk()
            ->assertJsonPath('data.assigned_user.public_id', $agent->public_id);

        $this->assertSame($agent->id, $conversation->refresh()->assigned_user_id);
    }

    public function test_admin_can_reassign_and_the_audit_records_public_identities(): void
    {
        $admin = User::factory()->admin()->create();
        $from = User::factory()->agent()->create();
        $to = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $from->id]);

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => $to->public_id])
            ->assertOk()
            ->assertJsonPath('data.assigned_user.public_id', $to->public_id);

        $this->assertSame($to->id, $conversation->refresh()->assigned_user_id);

        $audit = AuditLog::query()->latest('id')->firstOrFail();
        $this->assertSame('conversation.reassigned', $audit->action);
        $this->assertSame(['from' => $from->public_id, 'to' => $to->public_id], $audit->metadata);
    }

    public function test_assigning_the_current_responsible_is_an_idempotent_no_op(): void
    {
        $admin = User::factory()->admin()->create();
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $agent->id]);
        $message = Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => $agent->public_id])
            ->assertOk()
            ->assertJsonPath('data.assigned_user.public_id', $agent->public_id)
            ->assertJsonPath('data.contact.phone_e164', $conversation->contact->phone_e164)
            ->assertJsonPath('data.last_message.id', $message->id)
            ->assertJsonStructure([
                'data' => [
                    'assigned_user' => ['public_id', 'name'],
                    'contact' => ['id', 'display_name', 'phone_e164'],
                    'last_message' => ['id', 'direction', 'type', 'body', 'sent_by', 'created_at'],
                ],
            ]);

        $this->assertSame($agent->id, $conversation->refresh()->assigned_user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_admin_can_unassign_a_conversation(): void
    {
        $admin = User::factory()->admin()->create();
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $agent->id]);

        $this->actingAs($admin)
            ->deleteJson($this->assignmentUrl($conversation))
            ->assertOk()
            ->assertJsonPath('data.assigned_user', null);

        $this->assertNull($conversation->refresh()->assigned_user_id);

        $audit = AuditLog::query()->latest('id')->firstOrFail();
        $this->assertSame('conversation.unassigned', $audit->action);
        $this->assertSame(['from' => $agent->public_id, 'to' => null], $audit->metadata);
    }

    public function test_agent_can_release_their_own_conversation(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $agent->id]);

        $this->actingAs($agent)
            ->deleteJson($this->assignmentUrl($conversation))
            ->assertOk();

        $this->assertNull($conversation->refresh()->assigned_user_id);
    }

    public function test_agent_cannot_release_a_conversation_assigned_to_someone_else(): void
    {
        $owner = User::factory()->agent()->create();
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $owner->id]);

        $this->actingAs($agent)
            ->deleteJson($this->assignmentUrl($conversation))
            ->assertForbidden();

        $this->assertSame($owner->id, $conversation->refresh()->assigned_user_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_unassigning_an_unassigned_conversation_is_an_idempotent_no_op(): void
    {
        $admin = User::factory()->admin()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);
        $message = Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($admin)
            ->deleteJson($this->assignmentUrl($conversation))
            ->assertOk()
            ->assertJsonPath('data.assigned_user', null)
            ->assertJsonPath('data.contact.phone_e164', $conversation->contact->phone_e164)
            ->assertJsonPath('data.last_message.id', $message->id)
            ->assertJsonStructure([
                'data' => [
                    'assigned_user',
                    'contact' => ['id', 'display_name', 'phone_e164'],
                    'last_message' => ['id', 'direction', 'type', 'body', 'sent_by', 'created_at'],
                ],
            ]);

        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_target_must_be_an_active_user(): void
    {
        $admin = User::factory()->admin()->create();
        $inactive = User::factory()->agent()->create();
        $inactive->update(['is_active' => false]);
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => $inactive->public_id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');

        $this->assertNull($conversation->refresh()->assigned_user_id);
    }

    public function test_target_must_exist(): void
    {
        $admin = User::factory()->admin()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => (string) Str::ulid()])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');
    }

    public function test_internal_numeric_user_id_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => $agent->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');

        $this->actingAs($admin)
            ->postJson($this->assignmentUrl($conversation), ['user' => (string) $agent->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');
    }

    public function test_unknown_conversation_is_not_found(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->agent()->create();
        $missing = (string) Str::ulid();

        $this->actingAs($admin)
            ->postJson("/api/v1/conversations/{$missing}/assignment", ['user' => $target->public_id])
            ->assertNotFound()
            ->assertJsonPath('message', 'Recurso no encontrado.');

        $this->actingAs($admin)
            ->deleteJson("/api/v1/conversations/{$missing}/assignment")
            ->assertNotFound();
    }

    /**
     * Simulates the losing side of a claim: the service receives a conversation
     * instance read before another operation assigned it. The conditional
     * update matches zero rows and yields a 409.
     */
    public function test_stale_claim_loses_with_a_conflict(): void
    {
        $agent = User::factory()->agent()->create();
        $other = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => null]);

        $stale = Conversation::findOrFail($conversation->id);
        Conversation::whereKey($conversation->id)->update(['assigned_user_id' => $other->id]);

        try {
            app(ConversationAssignmentService::class)->assign($stale, $agent, $agent);
            $this->fail('Se esperaba un conflicto de concurrencia.');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
        }

        $this->assertSame($other->id, $conversation->refresh()->assigned_user_id);
    }
}
