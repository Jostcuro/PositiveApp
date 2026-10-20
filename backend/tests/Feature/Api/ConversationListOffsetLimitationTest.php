<?php

namespace Tests\Feature\Api;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Caracteriza una limitación conocida del offset (ADR-007). Si este test deja
 * de pasar, revisa ADR-007 antes de cambiar la expectativa.
 */
class ConversationListOffsetLimitationTest extends TestCase
{
    use RefreshDatabase;

    public function test_offset_pages_duplicate_boundary_and_omit_moved_conversation_known_limitation(): void
    {
        $agent = User::factory()->agent()->create();

        // Conversación n con last_message_at = 2026-10-01 nn:00:00 → orden DESC inicial: c12 … c1.
        $pid = [];
        foreach (range(1, 12) as $i) {
            $pid[$i] = Conversation::factory()->create([
                'last_message_at' => sprintf('2026-10-01 %02d:00:00', $i),
            ])->public_id;
        }

        // Página 1 ANTES de la mutación: c12, c11, c10, c9, c8.
        $page1 = array_column(
            $this->actingAs($agent)
                ->getJson('/api/v1/conversations?per_page=5&page=1')
                ->assertOk()
                ->json('data'),
            'id'
        );

        // Mutación: c7 sube al frente, desplazando la ventana de la página 2.
        Conversation::where('public_id', $pid[7])
            ->update(['last_message_at' => '2026-12-01 00:00:00']);

        // Página 2 DESPUÉS de la mutación: offset 5 → c8, c6, c5, c4, c3.
        $page2 = array_column(
            $this->actingAs($agent)
                ->getJson('/api/v1/conversations?per_page=5&page=2')
                ->assertOk()
                ->json('data'),
            'id'
        );

        // Ventana original de las dos primeras páginas (10 ítems) antes de la mutación.
        $originalWindow = [
            $pid[12], $pid[11], $pid[10], $pid[9], $pid[8],
            $pid[7], $pid[6], $pid[5], $pid[4], $pid[3],
        ];

        $collected = array_merge($page1, $page2);
        $dupes     = array_values(array_intersect($page1, $page2));
        $omitted   = array_values(array_diff($originalWindow, $collected));

        $this->assertCount(5, $page1);
        $this->assertCount(5, $page2);
        $this->assertSame([$pid[12], $pid[11], $pid[10], $pid[9], $pid[8]], $page1);
        $this->assertSame([$pid[8], $pid[6], $pid[5], $pid[4], $pid[3]], $page2);
        // El ítem de frontera (c8) reaparece en la página 2: duplicado visible.
        $this->assertSame([$pid[8]], $dupes);
        // La conversación desplazada (c7) queda fuera de ambas páginas: limitación aceptada.
        $this->assertSame([$pid[7]], $omitted);
    }
}
