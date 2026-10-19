<?php

namespace Tests\Feature\Api;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Contrato endurecido de los endpoints de lectura (T06B-R).
 *
 * Cubre propiedades que no estaban garantizadas por las suites existentes:
 * ausencia de superficie de ordenación controlada por el cliente, rechazo de
 * tipos no escalares, aislamiento del cursor manipulado, contrato GET-only
 * (no hay endpoints de escritura/lectura implícitos) y paridad de la policy
 * para ambos roles operativos.
 */
class ConversationReadContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_supplied_sorting_parameters_are_ignored(): void
    {
        $agent = User::factory()->agent()->create();
        $older = Conversation::factory()->create(['last_message_at' => '2026-10-01 10:00:00']);
        $newer = Conversation::factory()->create(['last_message_at' => '2026-10-05 10:00:00']);

        // Ninguno de estos parámetros debe influir en el orden del servidor.
        foreach ([
            '?sort=id',
            '?order=asc',
            '?order_by=last_message_at',
            '?direction=asc',
            '?sort=id&order=asc&order_by=status',
        ] as $query) {
            $this->actingAs($agent)
                ->getJson('/api/v1/conversations'.$query)
                ->assertOk()
                ->assertJsonPath('data.0.id', $newer->public_id)
                ->assertJsonPath('data.1.id', $older->public_id);
        }
    }

    public function test_status_must_be_a_single_canonical_scalar(): void
    {
        $agent = User::factory()->agent()->create();

        foreach (['?status=OPEN', '?status=Open', '?status=1', '?status[]=open', '?status=active'] as $query) {
            $this->actingAs($agent)
                ->getJson('/api/v1/conversations'.$query)
                ->assertUnprocessable()
                ->assertJsonValidationErrors('status');
        }
    }

    public function test_a_forged_cursor_cannot_read_messages_from_another_conversation(): void
    {
        $agent = User::factory()->agent()->create();
        $target = Conversation::factory()->create();
        $other = Conversation::factory()->create();

        Message::factory()->count(2)->create(['conversation_id' => $target->id]);
        $foreignIds = Message::factory()->count(3)->create(['conversation_id' => $other->id])->pluck('id')->all();

        // Cursor construido a mano que apunta desde el extremo superior del
        // historial (`id DESC`) e intenta arrastrar el identificador de otra
        // conversación. Un `id` alto garantiza que el keyset devuelva la
        // primera página bajo el orden descendente actual.
        $forged = rtrim(strtr(base64_encode(json_encode([
            'id' => PHP_INT_MAX,
            'conversation_id' => $other->id,
            '_pointsToNextItems' => true,
        ])), '+/', '-_'), '=');

        $response = $this->actingAs($agent)->getJson(
            "/api/v1/conversations/{$target->public_id}/messages?per_page=50&cursor=".urlencode($forged),
        );

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        $this->assertEmpty(
            array_intersect(array_column($response->json('data'), 'id'), $foreignIds),
            'Un cursor manipulado filtró mensajes de otra conversación.',
        );
    }

    public function test_a_valid_cursor_from_another_conversation_stays_scoped_to_the_target(): void
    {
        $agent = User::factory()->agent()->create();
        $target = Conversation::factory()->create();
        $other = Conversation::factory()->create();

        // Se crean primero los mensajes de `target`, de modo que el cursor
        // legítimo de `other` tenga un `id` mayor y demuestre que el keyset no
        // arrastra filas de la conversación de la URL hacia otra conversación.
        $targetIds = Message::factory()->count(2)
            ->create(['conversation_id' => $target->id])->pluck('id')->all();
        $foreignIds = Message::factory()->count(3)
            ->create(['conversation_id' => $other->id])->pluck('id')->all();

        // Cursor real emitido por el servidor para otra conversación (no se
        // fabrica a mano, a diferencia del caso del cursor manipulado).
        $cursor = $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$other->public_id}/messages?per_page=2")
            ->assertOk()
            ->json('meta.next_cursor');
        $this->assertNotNull($cursor);

        $response = $this->actingAs($agent)->getJson(
            "/api/v1/conversations/{$target->public_id}/messages?per_page=50&cursor=".urlencode($cursor),
        );

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertEqualsCanonicalizing($targetIds, $ids);
        $this->assertEmpty(
            array_intersect($ids, $foreignIds),
            'Un cursor válido de otra conversación filtró mensajes ajenos.',
        );
    }

    public function test_non_scalar_cursor_is_rejected(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages?cursor[]=abc")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cursor');
    }

    public function test_read_endpoints_only_accept_get(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($agent)->postJson('/api/v1/conversations')->assertMethodNotAllowed();
        $this->actingAs($agent)->deleteJson('/api/v1/conversations')->assertMethodNotAllowed();
        $this->actingAs($agent)
            ->postJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertMethodNotAllowed();
        $this->actingAs($agent)
            ->postJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertMethodNotAllowed();
    }

    public function test_admin_can_use_the_detail_and_history_endpoints(): void
    {
        $admin = User::factory()->admin()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($admin)
            ->getJson("/api/v1/conversations/{$conversation->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $conversation->public_id);

        $this->actingAs($admin)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_page_beyond_the_last_page_is_empty_and_well_formed(): void
    {
        $agent = User::factory()->agent()->create();
        Conversation::factory()->create(['last_message_at' => now()]);

        $this->actingAs($agent)
            ->getJson('/api/v1/conversations?per_page=20&page=999999999')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.current_page', 999999999);
    }

    public function test_keyset_traversal_never_omits_or_duplicates_older_messages(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        $base = "/api/v1/conversations/{$conversation->public_id}/messages";

        $originalIds = Message::factory()
            ->count(5)
            ->create(['conversation_id' => $conversation->id])
            ->pluck('id')
            ->all();

        $firstPage = $this->actingAs($agent)->getJson($base.'?per_page=2')->assertOk();
        $collected = array_column($firstPage->json('data'), 'id');
        $cursor = $firstPage->json('meta.next_cursor');
        $this->assertNotNull($cursor);

        // Bajo `id DESC`, un mensaje nuevo tiene el `id` mayor y entra al
        // inicio de la primera página (antes del cursor); no pertenece a las
        // páginas ya recorridas y por tanto no desplaza ni oculta lo ya visto.
        Message::factory()->create(['conversation_id' => $conversation->id]);

        while ($cursor !== null) {
            $response = $this->actingAs($agent)
                ->getJson($base.'?per_page=2&cursor='.urlencode($cursor))
                ->assertOk();
            $collected = array_merge($collected, array_column($response->json('data'), 'id'));
            $cursor = $response->json('meta.next_cursor');
        }

        $this->assertSame(count($collected), count(array_unique($collected)), 'El recorrido del cursor duplicó mensajes.');
        foreach ($originalIds as $id) {
            $this->assertSame(1, array_count_values($collected)[$id] ?? 0, "El mensaje {$id} se omitió o duplicó.");
        }
    }
}
