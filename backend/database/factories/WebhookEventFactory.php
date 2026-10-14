<?php

namespace Database\Factories;

use App\Models\WebhookEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WebhookEvent>
 */
class WebhookEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'provider' => 'meta',
            'event_type' => 'message.received',
            'dedupe_hash' => hash('sha256', (string) fake()->unique()->uuid()),
            'payload' => ['entry' => ['id' => 'fake']],
            'status' => 'received',
            'received_at' => now(),
        ];
    }
}
