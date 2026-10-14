<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the webhook_events table.
     *
     * Append-only operational log of external events with its own status machine.
     * `external_event_id` (provider-provided) and the canonical `dedupe_hash`
     * are unique to tolerate duplicate deliveries. No Laravel timestamps: the
     * relevant instants are `received_at`, `processing_started_at` and `processed_at`.
     *
     * @see docs/architecture/data-model.md (4.6 webhook_events)
     */
    public function up(): void
    {
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->collation('utf8mb4_0900_ai_ci');
            $table->string('provider', 30);
            $table->string('event_type', 50);
            $table->string('external_event_id', 128)->nullable()->unique();
            $table->char('dedupe_hash', 64)->unique();
            $table->json('payload');
            $table->string('status', 20);
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->dateTime('received_at');
            $table->dateTime('processing_started_at')->nullable();
            $table->dateTime('processed_at')->nullable();

            $table->index(['status', 'received_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
    }
};
