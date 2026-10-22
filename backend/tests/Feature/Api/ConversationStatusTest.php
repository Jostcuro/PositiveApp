<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\ConversationStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ConversationStatusTest extends TestCase
{
    use RefreshDatabase;

    private function statusUrl(Conversation $conversation): string
    {
        return "/api/v1/conversations/{$conversation->public_id}/status";
    }

    public function test_status_endpoint_requires_authentication(): void
    {
        $conversation = Conversation::factory()->create();

        $this->patchJson($this->statusUrl($conversation), ['status' => 'pending'])
            ->assertUnauthorized();
    }

    public function test_deactivated_user_cannot_change_status(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($agent);
        $agent->update(['is_active' => false]);

        $this->patchJson($this->statusUrl($conversation), ['status' => 'pending'])
            ->assertUnauthorized();
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function allowedTransitions(): array
    {
        return [
            'open to pending' => ['open', 'pending'],
            'open to resolved' => ['open', 'resolved'],
            'pending to open' => ['pending', 'open'],
            'pending to resolved' => ['pending', 'resolved'],
            'resolved to open' => ['resolved', 'open'],
        ];
    }

    #[DataProvider('allowedTransitions')]
    public function test_allowed_transitions_are_applied_and_audited(string $from, string $to): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['status' => $from]);

        $this->actingAs($agent)
            ->patchJson($this->statusUrl($conversation), ['status' => $to])
            ->assertOk()
            ->assertJsonPath('data.status', $to);

        $this->assertSame($to, $conversation->refresh()->status);

        $audit = AuditLog::query()->latest('id')->firstOrFail();
        $this->assertSame('conversation.status_changed', $audit->action);
        $this->assertSame($agent->id, $audit->actor_user_id);
        $this->assertSame(['from' => $from, 'to' => $to], $audit->metadata);
    }

    public function test_resolved_transition_sets_resolved_at(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['status' => 'open', 'resolved_at' => null]);

        $this->actingAs($agent)
            ->patchJson($this->statusUrl($conversation), ['status' => 'resolved'])
            ->assertOk();

        $this->assertNotNull($conversation->refresh()->resolved_at);
    }

    public function test_manual_reopen_clears_resolved_at_without_touching_reopened_count(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create([
            'status' => 'resolved',
            'resolved_at' => now()->subDay(),
            'reopened_count' => 3,
        ]);

        $this->actingAs($agent)
            ->patchJson($this->statusUrl($conversation), ['status' => 'open'])
            ->assertOk();

        $conversation->refresh();
        $this->assertSame('open', $conversation->status);
        $this->assertNull($conversation->resolved_at);
        $this->assertSame(3, $conversation->reopened_count);
    }

    public function test_resolved_to_pending_is_rejected(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create([
            'status' => 'resolved',
            'resolved_at' => now()->subDay(),
        ]);

        $this->actingAs($agent)
            ->patchJson($this->statusUrl($conversation), ['status' => 'pending'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame('resolved', $conversation->refresh()->status);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_unknown_status_value_is_rejected(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($agent)
            ->patchJson($this->statusUrl($conversation), ['status' => 'archived'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame('open', $conversation->refresh()->status);
    }

    public function test_setting_the_current_status_is_an_idempotent_no_op(): void
    {
        $agent = User::factory()->agent()->create();
        $resolvedAt = now()->subDay();
        $conversation = Conversation::factory()->create([
            'assigned_user_id' => $agent->id,
            'status' => 'resolved',
            'resolved_at' => $resolvedAt,
            'reopened_count' => 2,
        ]);
        $message = Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($agent)
            ->patchJson($this->statusUrl($conversation), ['status' => 'resolved'])
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

        $conversation->refresh();
        $this->assertSame('resolved', $conversation->status);
        $this->assertSame($resolvedAt->toDateTimeString(), $conversation->resolved_at->toDateTimeString());
        $this->assertSame(2, $conversation->reopened_count);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_unknown_conversation_is_not_found(): void
    {
        $agent = User::factory()->agent()->create();
        $missing = (string) Str::ulid();

        $this->actingAs($agent)
            ->patchJson("/api/v1/conversations/{$missing}/status", ['status' => 'pending'])
            ->assertNotFound()
            ->assertJsonPath('message', 'Recurso no encontrado.');
    }

    /**
     * Simulates the losing side of a concurrent status change: the service
     * receives an instance read before another operation changed the status.
     */
    public function test_stale_status_change_loses_with_a_conflict(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create(['status' => 'open']);

        $stale = Conversation::findOrFail($conversation->id);
        Conversation::whereKey($conversation->id)->update(['status' => 'pending']);

        try {
            app(ConversationStatusService::class)->change($stale, $agent, 'resolved');
            $this->fail('Se esperaba un conflicto de concurrencia.');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
        }

        $this->assertSame('pending', $conversation->refresh()->status);
        $this->assertDatabaseCount('audit_logs', 0);
    }
}
