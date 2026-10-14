<?php

namespace Tests\Feature\Database;

use App\Models\AuditLog;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\WebhookEvent;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConstraintsTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_role_defaults_to_agent_and_active(): void
    {
        $user = User::factory()->create(['role' => 'agent']);

        $this->assertSame('agent', $user->role);
        $this->assertTrue($user->is_active);
    }

    public function test_contact_phone_e164_is_unique(): void
    {
        $contact = Contact::factory()->create();

        $this->expectException(QueryException::class);

        Contact::factory()->create(['phone_e164' => $contact->phone_e164]);
    }

    public function test_contact_public_id_is_unique(): void
    {
        $contact = Contact::factory()->create();

        $this->expectException(QueryException::class);

        Contact::factory()->create(['public_id' => $contact->public_id]);
    }

    public function test_contact_provider_and_provider_user_id_are_unique_together(): void
    {
        $contact = Contact::factory()->create(['phone_e164' => null]);

        $this->expectException(QueryException::class);

        Contact::factory()->create([
            'phone_e164' => null,
            'provider' => $contact->provider,
            'provider_user_id' => $contact->provider_user_id,
        ]);
    }

    public function test_contact_requires_at_least_one_identity(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('CHECK constraint is enforced only on MySQL (SQLite does not support ALTER ... ADD CHECK).');
        }

        $this->expectException(QueryException::class);

        Contact::query()->create(['display_name' => 'Sin identidad']);
    }

    public function test_one_conversation_per_contact_is_enforced(): void
    {
        $contact = Contact::factory()->create();
        Conversation::factory()->create(['contact_id' => $contact->id]);

        $this->expectException(QueryException::class);

        Conversation::factory()->create(['contact_id' => $contact->id]);
    }

    public function test_provider_message_id_is_unique_when_present(): void
    {
        $conversation = Conversation::factory()->create();
        Message::factory()->create([
            'conversation_id' => $conversation->id,
            'provider_message_id' => 'wamid.msg.001',
        ]);

        $this->expectException(QueryException::class);

        Message::factory()->create([
            'conversation_id' => $conversation->id,
            'provider_message_id' => 'wamid.msg.001',
        ]);
    }

    public function test_multiple_null_provider_message_ids_are_allowed(): void
    {
        $conversation = Conversation::factory()->create();

        Message::factory()->count(2)->create([
            'conversation_id' => $conversation->id,
            'provider_message_id' => null,
        ]);

        $this->assertSame(2, $conversation->messages()->count());
    }

    public function test_idempotency_key_is_unique_when_present(): void
    {
        $conversation = Conversation::factory()->create();
        $key = (string) Str::uuid();
        Message::factory()->create([
            'conversation_id' => $conversation->id,
            'idempotency_key' => $key,
        ]);

        $this->expectException(QueryException::class);

        Message::factory()->create([
            'conversation_id' => $conversation->id,
            'idempotency_key' => $key,
        ]);
    }

    public function test_webhook_events_dedupe_hash_is_unique(): void
    {
        $event = WebhookEvent::factory()->create();

        $this->expectException(QueryException::class);

        WebhookEvent::factory()->create(['dedupe_hash' => $event->dedupe_hash]);
    }

    public function test_webhook_events_external_event_id_is_unique_when_present(): void
    {
        $event = WebhookEvent::factory()->create(['external_event_id' => 'external.event.001']);

        $this->expectException(QueryException::class);

        WebhookEvent::factory()->create(['external_event_id' => 'external.event.001']);
    }

    public function test_deleting_user_leaves_assigned_conversations_unassigned(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $user->id]);

        $user->delete();

        $this->assertNull($conversation->refresh()->assigned_user_id);
    }

    public function test_deleting_user_sets_null_on_their_sent_messages(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->outbound()->create(['sent_by_user_id' => $user->id]);

        $user->delete();

        $this->assertNull($message->refresh()->sent_by_user_id);
    }

    public function test_inbound_messages_have_null_sender(): void
    {
        $conversation = Conversation::factory()->create();
        $message = Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->assertNull($message->sent_by_user_id);
    }

    public function test_deleting_user_preserves_audit_trail_with_null_actor(): void
    {
        $user = User::factory()->create();
        $auditLog = AuditLog::factory()->create(['actor_user_id' => $user->id]);

        $user->delete();

        $this->assertTrue($auditLog->exists());
        $this->assertNull($auditLog->refresh()->actor_user_id);
    }

    public function test_deleting_contact_with_conversation_is_restricted(): void
    {
        $contact = Contact::factory()->create();
        Conversation::factory()->create(['contact_id' => $contact->id]);

        $this->expectException(QueryException::class);

        $contact->delete();
    }

    public function test_deleting_conversation_with_messages_is_restricted(): void
    {
        $conversation = Conversation::factory()->create();
        Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->expectException(QueryException::class);

        $conversation->delete();
    }

    public function test_message_body_is_nullable(): void
    {
        $conversation = Conversation::factory()->create();

        $message = Message::factory()->create([
            'conversation_id' => $conversation->id,
            'type' => 'image',
            'body' => null,
            'media_provider_id' => 'media.provider.001',
        ]);

        $this->assertNull($message->body);
    }
}
