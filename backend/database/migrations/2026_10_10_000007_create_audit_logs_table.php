<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the audit_logs table (append-only).
     *
     * Only `created_at` is present; records are never updated or deleted from the
     * application. The FK on `actor_user_id` is served by the leftmost column of
     * the `(actor_user_id, created_at)` index.
     *
     * @see docs/architecture/data-model.md (4.7 audit_logs)
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->collation('utf8mb4_0900_ai_ci');
            $table->string('actor_type', 10);
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->string('action', 64);
            $table->string('resource_type', 40);
            $table->string('resource_id', 40)->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->dateTime('created_at');

            $table->index(['resource_type', 'resource_id', 'created_at']);
            $table->index(['actor_user_id', 'created_at']);
            $table->index(['action', 'created_at']);

            $table->foreign('actor_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
