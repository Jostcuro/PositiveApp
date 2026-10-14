<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'actor_type' => 'user',
            'actor_user_id' => User::factory(),
            'action' => 'conversation.assigned',
            'resource_type' => 'conversation',
            'resource_id' => (string) Str::ulid(),
            'metadata' => null,
            'ip_address' => fake()->ipv4(),
            'created_at' => now(),
        ];
    }
}
