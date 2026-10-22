<?php

namespace Tests\Feature\Auth;

use App\Models\Conversation;
use App\Models\User;
use App\Policies\ConversationPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use ReflectionClass;
use ReflectionMethod;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_any_conversation(): void
    {
        $admin = User::factory()->admin()->create();
        $conversation = new Conversation(['public_id' => 'demo']);

        $this->assertTrue(Gate::forUser($admin)->allows('viewAny', Conversation::class));
        $this->assertTrue(Gate::forUser($admin)->allows('view', $conversation));
    }

    public function test_agent_can_view_any_conversation(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = new Conversation(['public_id' => 'demo']);

        $this->assertTrue(Gate::forUser($agent)->allows('viewAny', Conversation::class));
        $this->assertTrue(Gate::forUser($agent)->allows('view', $conversation));
    }

    /**
     * Decisión vigente: la asignación no restringe la lectura en el MVP.
     */
    public function test_agent_can_view_a_conversation_assigned_to_another_agent(): void
    {
        $otherAgent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create([
            'assigned_user_id' => $otherAgent->id,
        ]);
        $agent = User::factory()->agent()->create();

        $this->assertTrue(Gate::forUser($agent)->allows('view', $conversation));
    }

    /**
     * Salvaguarda de separación de responsabilidades: la policy de conversación
     * solo expone las abilities explícitamente declaradas. T09 añadió las
     * mutaciones internas (`assign`, `unassign`, `changeStatus`); la lista se
     * mantiene cerrada y versionada: si aparece una operación no declarada,
     * esta prueba falla y obliga a una revisión explícita.
     */
    public function test_visibility_policy_only_exposes_declared_abilities(): void
    {
        $methods = array_map(
            fn (ReflectionMethod $method) => $method->getName(),
            (new ReflectionClass(ConversationPolicy::class))->getMethods(ReflectionMethod::IS_PUBLIC),
        );

        sort($methods);

        $this->assertSame(['assign', 'changeStatus', 'unassign', 'view', 'viewAny'], $methods);
    }

    public function test_role_is_always_derived_from_the_database(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $agent->email,
            'password' => 'password',
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.role', 'agent');

        $this->assertFalse($agent->fresh()->isAdmin());
    }

    public function test_user_role_and_status_helpers(): void
    {
        $admin = User::factory()->admin()->create();
        $agent = User::factory()->agent()->create();
        $inactive = User::factory()->agent()->create(['is_active' => false]);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($agent->isAdmin());
        $this->assertTrue($agent->isActive());
        $this->assertFalse($inactive->isActive());
    }
}
