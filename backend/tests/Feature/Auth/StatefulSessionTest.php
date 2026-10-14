<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Tests\TestCase;

/**
 * Guarda de regresión del flujo de sesión *stateful* de la SPA (AUTH-AUDIT-001/002).
 *
 * El origen del frontend en desarrollo (Vite, http://localhost:5173) debe
 * reconocerse como *stateful* para que Sanctum aplique la sesión y el CSRF a
 * través del proxy. Si deja de reconocerse, el login responde 200 pero no
 * persiste sesión.
 *
 * Nota: `ValidateCsrfToken` omite la verificación cuando la aplicación corre en
 * pruebas (`runningUnitTests()`), por lo que aquí no se puede reproducir un 419
 * de CSRF; el efecto observable del pipeline *stateful* es el arranque de
 * sesión (cookie de sesión en la respuesta).
 */
class StatefulSessionTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND_ORIGIN = 'http://localhost:5173';

    private function requestFrom(string $origin): Request
    {
        $request = Request::create('http://localhost:8000/api/v1/auth/login', 'POST');
        $request->headers->set('Origin', $origin);

        return $request;
    }

    private function assertSetsSessionCookie(TestResponse $response, bool $expected): void
    {
        $cookie = $response->getCookie((string) config('session.cookie'));

        if ($expected) {
            $this->assertNotNull($cookie, 'La respuesta debería iniciar una sesión (cookie de sesión).');
        } else {
            $this->assertNull($cookie, 'La respuesta no debería iniciar sesión para un origen no *stateful*.');
        }
    }

    public function test_vite_dev_origin_is_stateful_by_default(): void
    {
        $this->assertContains('localhost:5173', config('sanctum.stateful'));
        $this->assertTrue(
            EnsureFrontendRequestsAreStateful::fromFrontend($this->requestFrom(self::FRONTEND_ORIGIN)),
        );
    }

    public function test_unknown_origin_is_not_stateful(): void
    {
        $this->assertFalse(
            EnsureFrontendRequestsAreStateful::fromFrontend($this->requestFrom('http://attacker.example')),
        );
    }

    public function test_login_from_the_frontend_origin_starts_a_session(): void
    {
        $user = User::factory()->create();

        $response = $this->withHeaders(['Origin' => self::FRONTEND_ORIGIN])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertOk();

        $this->assertSetsSessionCookie($response, true);
    }

    public function test_login_from_an_unknown_origin_does_not_start_a_session(): void
    {
        $user = User::factory()->create();

        $response = $this->withHeaders(['Origin' => 'http://attacker.example'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertOk();

        $this->assertSetsSessionCookie($response, false);
    }
}
