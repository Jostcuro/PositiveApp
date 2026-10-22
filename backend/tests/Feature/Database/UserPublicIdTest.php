<?php

namespace Tests\Feature\Database;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class UserPublicIdTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_receive_a_unique_ulid_public_id_on_creation(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->assertSame(26, strlen($first->public_id));
        $this->assertTrue(Str::isUlid($first->public_id));
        $this->assertNotSame($first->public_id, $second->public_id);
        $this->assertNotSame($first->public_id, (string) $first->id);
    }

    public function test_public_id_is_server_controlled_and_ignores_mass_assignment(): void
    {
        $attempted = (string) Str::ulid();

        $user = User::create([
            'name' => 'Mass Assignment',
            'email' => 'mass-assignment@example.test',
            'password' => 'password',
            'role' => 'agent',
            'is_active' => true,
            'public_id' => $attempted,
        ]);

        $this->assertNotSame($attempted, $user->public_id);
        $this->assertTrue(Str::isUlid($user->public_id));

        $generated = $user->public_id;
        $replacement = (string) Str::ulid();

        $user->update(['public_id' => $replacement]);

        $this->assertSame($generated, $user->refresh()->public_id);
        $this->assertNotSame($replacement, $user->public_id);
    }

    public function test_public_id_is_not_null_at_database_level(): void
    {
        $this->expectException(QueryException::class);

        DB::table('users')->insert([
            'name' => 'Sin identidad pública',
            'email' => 'sin-identidad@example.test',
            'password' => bcrypt('password'),
            'role' => 'agent',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
