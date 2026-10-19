<?php

namespace Tests\Feature\Api;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class ConversationMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_are_isolated_per_conversation(): void
    {
        $agent = User::factory()->agent()->create();
        $conversationA = Conversation::factory()->create();
        $conversationB = Conversation::factory()->create();
        Message::factory()->count(2)->create(['conversation_id' => $conversationA->id]);
        Message::factory()->count(3)->create(['conversation_id' => $conversationB->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversationA->public_id}/messages")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_messages_are_returned_in_descending_id_order(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => 'first']);
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => 'second']);
        Message::factory()->create(['conversation_id' => $conversation->id, 'body' => 'third']);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJsonPath('meta.prev_cursor', null)
            ->assertJsonPath('data.0.body', 'third')
            ->assertJsonPath('data.1.body', 'second')
            ->assertJsonPath('data.2.body', 'first');
    }

    public function test_a_new_message_appears_on_the_first_page(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->count(2)->create(['conversation_id' => $conversation->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk();

        // A newer message has a greater `id` and must surface at the top of the
        // first page under the `id DESC` keyset contract.
        $newest = Message::factory()->create([
            'conversation_id' => $conversation->id,
            'body' => 'newest',
        ]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('data.0.body', 'newest');
    }

    public function test_cursor_pagination_traverses_all_messages_without_duplicates_or_omissions(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        $expectedIds = Message::factory()
            ->count(5)
            ->create(['conversation_id' => $conversation->id])
            ->pluck('id')
            ->all();

        $collected = [];
        $cursor = null;

        do {
            $url = "/api/v1/conversations/{$conversation->public_id}/messages?per_page=2";
            if ($cursor !== null) {
                $url .= '&cursor='.urlencode($cursor);
            }

            $response = $this->actingAs($agent)->getJson($url)->assertOk();
            $collected = array_merge($collected, array_column($response->json('data'), 'id'));
            $cursor = $response->json('meta.next_cursor');
        } while ($cursor !== null);

        $this->assertSame(array_reverse($expectedIds), $collected);
        $this->assertSame(count($expectedIds), count(array_unique($collected)));
        // The traversal walks towards older messages, so the last id is the
        // smallest one.
        $this->assertGreaterThan($collected[count($collected) - 1], $collected[0]);
    }

    public function test_malformed_cursor_is_rejected(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id]);

        $base = "/api/v1/conversations/{$conversation->public_id}/messages";

        $this->actingAs($agent)->getJson($base.'?cursor=not-a-valid-cursor')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cursor');

        // A cursor that decodes but lacks the ordering parameter must not reach
        // the paginator (it would raise when reading the missing parameter).
        $crafted = rtrim(strtr(base64_encode('{"_pointsToNextItems":true}'), '+/', '-_'), '=');

        $this->actingAs($agent)->getJson($base.'?cursor='.urlencode($crafted))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cursor');
    }

    public function test_per_page_bounds_are_enforced(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        $base = "/api/v1/conversations/{$conversation->public_id}/messages";

        $this->actingAs($agent)->getJson($base.'?per_page=0')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');

        $this->actingAs($agent)->getJson($base.'?per_page=101')
            ->assertUnprocessable()->assertJsonValidationErrors('per_page');
    }

    public function test_a_conversation_without_messages_returns_empty_data(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_outbound_messages_expose_the_sender_name(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->outbound($agent)->create(['conversation_id' => $conversation->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJsonPath('data.0.sent_by', $agent->name);
    }

    public function test_inbound_messages_have_no_sender(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id, 'direction' => 'inbound']);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJsonPath('data.0.sent_by', null);
    }

    public function test_messages_do_not_expose_internal_fields(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages")
            ->assertOk()
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('data.0', fn (AssertableJson $message) => $message
                    ->hasAll(['id', 'direction', 'type', 'body', 'created_at'])
                    ->missing('processing_status')
                    ->missing('provider_status')
                    ->missing('provider_message_id')
                    ->missing('idempotency_key')
                    ->missing('error_code')
                    ->missing('error_message')
                    ->missing('media_provider_id')
                    ->missing('conversation_id')
                    ->missing('sent_by_user_id')
                    ->etc())
                ->etc());
    }
}
