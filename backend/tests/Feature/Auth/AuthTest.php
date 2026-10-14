<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_LOGIN_MESSAGE = 'Las credenciales proporcionadas son incorrectas.';

    public function test_agent_can_log_in_and_receives_a_public_profile(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('data', fn (AssertableJson $data) => $data
                    ->where('id', $user->id)
                    ->where('name', $user->name)
                    ->where('email', $user->email)
                    ->where('role', 'agent')
                    ->etc())
                ->etc());
    }

    public function test_admin_can_log_in_with_their_role(): void
    {
        $admin = User::factory()->admin()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');
    }

    public function test_login_response_does_not_expose_sensitive_fields(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonMissing(['password', 'remember_token']);
    }

    public function test_invalid_credentials_are_rejected_with_a_generic_message(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJson(fn (AssertableJson $json) => $json
                ->where('message', self::GENERIC_LOGIN_MESSAGE)
                ->has('errors.email')
                ->etc());
    }

    public function test_deactivated_account_cannot_log_in(): void
    {
        User::factory()->create(['is_active' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email' => User::first()->email,
            'password' => 'password',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', self::GENERIC_LOGIN_MESSAGE);
    }

    public function test_login_validates_required_fields(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => '',
            'password' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertStatus(429);
    }

    public function test_client_sent_role_does_not_elevate_privileges(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $agent->email,
            'password' => 'password',
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.role', 'agent');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_deactivated_user_cannot_use_an_existing_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);
        $user->update(['is_active' => false]);

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_active_user_keeps_access_with_a_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/auth/me')
            ->assertOk();
    }

    public function test_me_returns_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJson(function (AssertableJson $json) use ($user) {
                $json->has('data', fn (AssertableJson $data) => $data
                    ->where('id', $user->id)
                    ->where('role', 'agent')
                    ->etc())
                    ->etc();
            })
            ->assertJsonMissing(['password', 'remember_token']);
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
    }

    public function test_logout_invalidates_the_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->assertNull(Auth::guard('web')->user());

        // Emula un request nuevo: en producción cada request arranca con una
        // aplicación (y guards) fresca, sin el usuario cacheado del request previo.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
