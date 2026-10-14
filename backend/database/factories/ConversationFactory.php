<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'contact_id' => Contact::factory(),
            'assigned_user_id' => null,
            'status' => 'open',
            'opened_at' => now(),
            'reopened_count' => 0,
        ];
    }
}
