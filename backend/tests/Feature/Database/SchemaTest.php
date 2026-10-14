<?php

namespace Tests\Feature\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_table_exposes_role_and_status_columns(): void
    {
        $this->assertTrue(Schema::hasColumn('users', 'role'));
        $this->assertTrue(Schema::hasColumn('users', 'is_active'));
        $this->assertTrue(Schema::hasColumn('users', 'deactivated_at'));
        $this->assertFalse(Schema::hasColumn('users', 'email_verified_at'));
    }

    public function test_contacts_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('contacts'));

        foreach (['public_id', 'display_name', 'phone_e164', 'provider', 'provider_user_id'] as $column) {
            $this->assertTrue(Schema::hasColumn('contacts', $column));
        }
    }

    public function test_conversations_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('conversations'));

        foreach ([
            'public_id', 'contact_id', 'assigned_user_id', 'status',
            'last_message_at', 'last_inbound_at', 'opened_at', 'resolved_at', 'reopened_count',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('conversations', $column));
        }
    }

    public function test_messages_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('messages'));

        foreach ([
            'conversation_id', 'sent_by_user_id', 'direction', 'type', 'body', 'media_provider_id',
            'provider_message_id', 'idempotency_key', 'processing_status', 'provider_status',
            'error_code', 'error_message', 'attempts', 'last_error_at',
            'provider_timestamp', 'provider_status_at',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('messages', $column));
        }
    }

    public function test_whatsapp_accounts_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('whatsapp_accounts'));

        foreach ([
            'provider', 'display_number', 'phone_number_id',
            'business_account_id', 'status', 'secret_ref',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('whatsapp_accounts', $column));
        }
    }

    public function test_webhook_events_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('webhook_events'));

        foreach ([
            'provider', 'event_type', 'external_event_id', 'dedupe_hash',
            'payload', 'status', 'attempts', 'last_error',
            'received_at', 'processing_started_at', 'processed_at',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('webhook_events', $column));
        }
    }

    public function test_audit_logs_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('audit_logs'));

        foreach ([
            'actor_type', 'actor_user_id', 'action', 'resource_type',
            'resource_id', 'metadata', 'ip_address', 'created_at',
        ] as $column) {
            $this->assertTrue(Schema::hasColumn('audit_logs', $column));
        }
    }
}
