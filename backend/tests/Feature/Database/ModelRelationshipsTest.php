<?php

namespace Tests\Feature\Database;

use App\Models\AuditLog;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_has_one_conversation(): void
    {
        $contact = Contact::factory()->create();
        $conversation = Conversation::factory()->create(['contact_id' => $contact->id]);

        $this->assertTrue($conversation->is($contact->conversation));
    }

    public function test_conversation_belongs_to_contact(): void
    {
        $contact = Contact::factory()->create();
        $conversation = Conversation::factory()->create(['contact_id' => $contact->id]);

        $this->assertTrue($contact->is($conversation->contact));
    }

    public function test_conversation_belongs_to_assigned_user(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $user->id]);

        $this->assertTrue($user->is($conversation->assignedUser));
    }

    public function test_user_has_many_assigned_conversations(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['assigned_user_id' => $user->id]);

        $this->assertTrue($conversation->is($user->conversations->first()));
        $this->assertCount(1, $user->conversations);
    }

    public function test_conversation_has_many_messages(): void
    {
        $conversation = Conversation::factory()->create();
        $message = Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->assertTrue($message->is($conversation->messages->first()));
        $this->assertCount(1, $conversation->messages);
    }

    public function test_message_belongs_to_conversation(): void
    {
        $conversation = Conversation::factory()->create();
        $message = Message::factory()->create(['conversation_id' => $conversation->id]);

        $this->assertTrue($conversation->is($message->conversation));
    }

    public function test_message_belongs_to_sent_by_user(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->outbound()->create(['sent_by_user_id' => $user->id]);

        $this->assertTrue($user->is($message->sentBy));
    }

    public function test_user_has_many_sent_messages(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->outbound()->create(['sent_by_user_id' => $user->id]);

        $this->assertTrue($message->is($user->sentMessages->first()));
        $this->assertCount(1, $user->sentMessages);
    }

    public function test_user_has_many_audit_logs(): void
    {
        $user = User::factory()->create();
        $auditLog = AuditLog::factory()->create(['actor_user_id' => $user->id]);

        $this->assertTrue($auditLog->is($user->auditLogs->first()));
        $this->assertCount(1, $user->auditLogs);
    }

    public function test_audit_log_belongs_to_actor(): void
    {
        $user = User::factory()->create();
        $auditLog = AuditLog::factory()->create(['actor_user_id' => $user->id]);

        $this->assertTrue($user->is($auditLog->actor));
    }

    public function test_contact_and_conversation_generate_public_ulid(): void
    {
        $contact = Contact::factory()->create();
        $conversation = Conversation::factory()->create(['contact_id' => $contact->id]);

        $this->assertSame(26, strlen((string) $contact->public_id));
        $this->assertSame(26, strlen((string) $conversation->public_id));
    }
}
