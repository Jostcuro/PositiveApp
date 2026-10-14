<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the conversations table.
     *
     * `UNIQUE(contact_id)` enforces the approved rule of one conversation per
     * contact (S1). The FK on `assigned_user_id` is served by the leftmost column
     * of the `(assigned_user_id, status, last_message_at)` index, so no separate
     * index is created for it.
     *
     * @see docs/architecture/data-model.md (4.3 conversations)
     */
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->collation('utf8mb4_0900_ai_ci');
            $table->ulid('public_id')->unique();
            $table->unsignedBigInteger('contact_id');
            $table->unsignedBigInteger('assigned_user_id')->nullable();
            $table->string('status', 20)->default('open');
            $table->dateTime('last_message_at')->nullable();
            $table->dateTime('last_inbound_at')->nullable();
            $table->dateTime('opened_at');
            $table->dateTime('resolved_at')->nullable();
            $table->unsignedInteger('reopened_count')->default(0);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique('contact_id');
            $table->index(['assigned_user_id', 'status', 'last_message_at']);
            $table->index(['status', 'last_message_at']);

            $table->foreign('contact_id')->references('id')->on('contacts')->restrictOnDelete();
            $table->foreign('assigned_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
