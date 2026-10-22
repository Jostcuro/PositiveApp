<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;

/**
 * Internal assignment operations for conversations (T09).
 *
 * Concurrency is resolved with conditional `UPDATE` statements plus an
 * affected-rows check, not with `DB::transaction` alone: if another operation
 * changed the row since it was read, the conditional update matches zero rows
 * and the loser receives a 409 instead of silently overwriting state.
 */
class ConversationAssignmentService
{
    /**
     * Assign or reassign a conversation to the target user.
     */
    public function assign(Conversation $conversation, User $actor, User $target, ?string $ipAddress = null): Conversation
    {
        return DB::transaction(function () use ($conversation, $actor, $target, $ipAddress) {
            $current = $conversation->assigned_user_id;

            if (! $actor->isAdmin() && $current !== null) {
                abort(409, 'La conversación ya está asignada.');
            }

            if ($current === $target->getKey()) {
                return $conversation;
            }

            $query = Conversation::whereKey($conversation->getKey());

            if ($current === null) {
                $query->whereNull('assigned_user_id');
                $action = 'conversation.assigned';
                $from = null;
            } else {
                $query->where('assigned_user_id', $current);
                $action = 'conversation.reassigned';
                $from = User::whereKey($current)->value('public_id');
            }

            $affected = $query->update([
                'assigned_user_id' => $target->getKey(),
                'updated_at' => now(),
            ]);

            if ($affected === 0) {
                abort(409, 'La conversación fue modificada por otra operación.');
            }

            AuditLogger::conversation($actor, $action, $conversation, [
                'from' => $from,
                'to' => $target->public_id,
            ], $ipAddress);

            return $conversation->refresh()->load(['contact', 'assignedUser', 'latestMessage.sentBy']);
        });
    }

    /**
     * Clear the conversation's responsible user.
     */
    public function unassign(Conversation $conversation, User $actor, ?string $ipAddress = null): Conversation
    {
        return DB::transaction(function () use ($conversation, $actor, $ipAddress) {
            $current = $conversation->assigned_user_id;

            if ($current === null) {
                return $conversation;
            }

            $affected = Conversation::whereKey($conversation->getKey())
                ->where('assigned_user_id', $current)
                ->update([
                    'assigned_user_id' => null,
                    'updated_at' => now(),
                ]);

            if ($affected === 0) {
                abort(409, 'La conversación fue modificada por otra operación.');
            }

            AuditLogger::conversation($actor, 'conversation.unassigned', $conversation, [
                'from' => User::whereKey($current)->value('public_id'),
                'to' => null,
            ], $ipAddress);

            return $conversation->refresh()->load(['contact', 'assignedUser', 'latestMessage.sentBy']);
        });
    }
}
