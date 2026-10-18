<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public representation of a conversation (read API, Tarea 06B).
 *
 * `id` is the non-enumerable public ULID (DD-008); internal numeric keys are
 * never exposed. The contact phone is only included where it is functionally
 * required (the detail endpoint), keeping PII out of the list payload.
 */
class ConversationResource extends JsonResource
{
    public function __construct($resource, private readonly bool $includeContactPhone = false)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'status' => $this->status,
            'opened_at' => $this->opened_at?->toIso8601String(),
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'reopened_count' => $this->reopened_count,
            'assigned_user' => $this->whenLoaded('assignedUser', fn () => $this->assignedUser === null ? null : [
                'id' => $this->assignedUser->id,
                'name' => $this->assignedUser->name,
            ]),
            'contact' => $this->whenLoaded('contact', fn () => array_merge([
                'id' => $this->contact->public_id,
                'display_name' => $this->contact->display_name,
            ], $this->includeContactPhone ? ['phone_e164' => $this->contact->phone_e164] : [])),
            'last_message' => $this->whenLoaded('latestMessage', fn () => $this->latestMessage === null
                ? null
                : MessageResource::make($this->latestMessage)->resolve($request)),
        ];
    }
}
