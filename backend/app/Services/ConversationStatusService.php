<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Internal status transitions for conversations (T09).
 *
 * Only the transitions declared in TRANSITIONS are permitted. Setting the
 * current status again is an idempotent no-op (no timestamp, counter or audit
 * changes). Concurrency is resolved with a conditional update constrained to
 * the status that was read; a mismatch yields 409.
 */
class ConversationStatusService
{
    /**
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        Conversation::STATUS_OPEN => [
            Conversation::STATUS_PENDING,
            Conversation::STATUS_RESOLVED,
        ],
        Conversation::STATUS_PENDING => [
            Conversation::STATUS_OPEN,
            Conversation::STATUS_RESOLVED,
        ],
        Conversation::STATUS_RESOLVED => [
            Conversation::STATUS_OPEN,
        ],
    ];

    /**
     * Apply a manual status change to the conversation.
     */
    public function change(Conversation $conversation, User $actor, string $status, ?string $ipAddress = null): Conversation
    {
        $current = $conversation->status;

        if ($current === $status) {
            return $conversation;
        }

        if (! in_array($status, self::TRANSITIONS[$current] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => ['La transición de estado no está permitida.'],
            ]);
        }

        return DB::transaction(function () use ($conversation, $actor, $status, $current, $ipAddress) {
            $affected = Conversation::whereKey($conversation->getKey())
                ->where('status', $current)
                ->update([
                    'status' => $status,
                    'resolved_at' => $status === Conversation::STATUS_RESOLVED ? now() : null,
                    'updated_at' => now(),
                ]);

            if ($affected === 0) {
                abort(409, 'La conversación fue modificada por otra operación.');
            }

            AuditLogger::conversation($actor, 'conversation.status_changed', $conversation, [
                'from' => $current,
                'to' => $status,
            ], $ipAddress);

            return $conversation->refresh()->load(['contact', 'assignedUser', 'latestMessage.sentBy']);
        });
    }
}
