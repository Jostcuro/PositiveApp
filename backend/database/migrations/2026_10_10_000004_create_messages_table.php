<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the messages table.
     *
     * `processing_status` (internal) and `provider_status` (transport) are two
     * independent axes; `provider_status` only applies to outbound messages.
     * `sent_by_user_id` attributes an outbound message to the responsible user;
     * NULL means inbound or a system/automation send.
     * The composite `(conversation_id, id)` index serves the FK and keyset
     * pagination of the history.
     *
     * @see docs/architecture/data-model.md (4.4 messages, 5)
     */
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->collation('utf8mb4_0900_ai_ci');
            $table->unsignedBigInteger('conversation_id');
            $table->unsignedBigInteger('sent_by_user_id')->nullable();
            $table->string('direction', 10);
            $table->string('type', 20);
            $table->text('body')->nullable();
            $table->string('media_provider_id', 255)->nullable();
            $table->string('provider_message_id', 255)->nullable()->unique();
            $table->uuid('idempotency_key')->nullable()->unique();
            $table->string('processing_status', 20);
            $table->string('provider_status', 20)->nullable();
            $table->string('error_code', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->dateTime('last_error_at')->nullable();
            $table->dateTime('provider_timestamp')->nullable();
            $table->dateTime('provider_status_at')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->index(['conversation_id', 'id']);
            $table->index(['processing_status', 'last_error_at']);

            $table->foreign('conversation_id')->references('id')->on('conversations')->restrictOnDelete();
            $table->foreign('sent_by_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
