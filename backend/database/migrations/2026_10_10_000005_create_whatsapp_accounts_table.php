<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the whatsapp_accounts table.
     *
     * Stores non-secret metadata only; credentials live in a secret manager and
     * are referenced via `secret_ref` (S7). Adjacent to `messages` only by logic,
     * no FK is added until multi-number support exists (see data-model.md).
     *
     * @see docs/architecture/data-model.md (4.5 whatsapp_accounts, DD-010)
     */
    public function up(): void
    {
        Schema::create('whatsapp_accounts', function (Blueprint $table) {
            $table->id();
            $table->collation('utf8mb4_0900_ai_ci');
            $table->string('provider', 30);
            $table->string('display_number', 32)->nullable();
            $table->string('phone_number_id', 64)->nullable();
            $table->string('business_account_id', 64)->nullable();
            $table->string('status', 20);
            $table->string('secret_ref', 255)->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['provider', 'phone_number_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_accounts');
    }
};
