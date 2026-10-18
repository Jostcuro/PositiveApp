<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public representation of a message (read API, Tarea 06B).
 *
 * Internal and provider fields (`processing_status`, `provider_status`,
 * `provider_message_id`, `idempotency_key`, `error_code`, `error_message`,
 * `media_provider_id` and the foreign keys) are intentionally not exposed:
 * they are not part of the read contract and would leak transport details.
 */
class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'direction' => $this->direction,
            'type' => $this->type,
            'body' => $this->body,
            'sent_by' => $this->whenLoaded('sentBy', fn () => $this->sentBy?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
