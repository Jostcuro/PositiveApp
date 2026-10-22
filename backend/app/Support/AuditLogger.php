<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\Conversation;
use App\Models\User;

/**
 * Minimal writer for the existing append-only `audit_logs` table (T09).
 *
 * It does not implement a persistence engine: it centralizes the shape of the
 * entries produced by the internal write operations so mutations can record
 * them inside the same transaction. Secrets and message contents are never
 * stored.
 */
final class AuditLogger
{
    /**
     * Record a user-driven action over a conversation.
     *
     * @param  array<string, mixed>  $metadata
     */
    public static function conversation(
        User $actor,
        string $action,
        Conversation $conversation,
        array $metadata,
        ?string $ipAddress = null,
    ): void {
        AuditLog::create([
            'actor_type' => 'user',
            'actor_user_id' => $actor->getKey(),
            'action' => $action,
            'resource_type' => 'conversation',
            'resource_id' => $conversation->public_id,
            'metadata' => $metadata,
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }
}
