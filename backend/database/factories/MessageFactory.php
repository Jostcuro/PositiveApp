<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'sent_by_user_id' => null,
            'direction' => 'inbound',
            'type' => 'text',
            'body' => fake()->sentence(),
            'processing_status' => 'processed',
            'attempts' => 0,
        ];
    }

    /**
     * Attribute an outbound message to a user (or a new one by default).
     */
    public function outbound(?User $sentBy = null): static
    {
        return $this->state(fn () => [
            'direction' => 'outbound',
            'sent_by_user_id' => $sentBy?->id ?? User::factory(),
        ]);
    }
}
