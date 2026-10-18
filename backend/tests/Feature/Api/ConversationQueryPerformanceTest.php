<?php

namespace Tests\Feature\Api;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ConversationQueryPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_conversations_uses_a_constant_number_of_queries(): void
    {
        $agent = User::factory()->agent()->create();

        $this->createConversationsWithMessages(3);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($agent)->getJson('/api/v1/conversations')->assertOk();
        $queriesForThree = count(DB::getQueryLog());

        $this->createConversationsWithMessages(7);

        DB::flushQueryLog();
        $this->actingAs($agent)->getJson('/api/v1/conversations')->assertOk();
        $queriesForTen = count(DB::getQueryLog());

        DB::disableQueryLog();

        $this->assertSame(
            $queriesForThree,
            $queriesForTen,
            'El número de consultas no debe crecer con el número de conversaciones (evita N+1).',
        );
    }

    public function test_listing_messages_uses_a_constant_number_of_queries(): void
    {
        $agent = User::factory()->agent()->create();
        $conversation = Conversation::factory()->create();

        Message::factory()->count(3)->create(['conversation_id' => $conversation->id]);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages?per_page=2")
            ->assertOk();
        $queriesForThree = count(DB::getQueryLog());

        Message::factory()->count(20)->create(['conversation_id' => $conversation->id]);

        DB::flushQueryLog();
        $this->actingAs($agent)
            ->getJson("/api/v1/conversations/{$conversation->public_id}/messages?per_page=2")
            ->assertOk();
        $queriesForMany = count(DB::getQueryLog());

        DB::disableQueryLog();

        $this->assertSame($queriesForThree, $queriesForMany);
    }

    private function createConversationsWithMessages(int $count): void
    {
        Conversation::factory()->count($count)->create(['last_message_at' => now()])->each(
            fn (Conversation $conversation) => Message::factory()->create(['conversation_id' => $conversation->id]),
        );
    }
}
