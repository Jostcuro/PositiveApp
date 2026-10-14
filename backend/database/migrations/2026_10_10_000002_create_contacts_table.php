<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the contacts table.
     *
     * Identity is `provider + provider_user_id` or `phone_e164` (E.164, optional).
     * The CHECK constraint guarantees at least one identity and is only enforced
     * on MySQL (SQLite does not support adding CHECK constraints via ALTER TABLE).
     *
     * @see docs/architecture/data-model.md (4.2 contacts, DD-008, DD-009)
     */
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->collation('utf8mb4_0900_ai_ci');
            $table->ulid('public_id')->unique();
            $table->string('display_name', 255)->nullable();
            $table->string('phone_e164', 16)->nullable()->unique();
            $table->string('provider', 30)->nullable();
            $table->string('provider_user_id', 64)->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['provider', 'provider_user_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                'ALTER TABLE contacts ADD CONSTRAINT contacts_identity_check '
                .'CHECK (phone_e164 IS NOT NULL OR provider_user_id IS NOT NULL)'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
