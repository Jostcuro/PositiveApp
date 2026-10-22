<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Add a public ULID identity to users (T09 / DD-008 ampliado).
     *
     * The internal numeric `id` remains the primary key and the target of
     * foreign keys (`conversations.assigned_user_id`, `messages.sent_by_user_id`,
     * `audit_logs.actor_user_id`). `public_id` is the non-enumerable identity
     * used by public contracts (e.g. `assigned_user.public_id`).
     *
     * The migration is safe on populated environments: the column is added as
     * nullable, existing rows are backfilled in chunks, and only then the
     * NOT NULL constraint and the unique index are applied.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->ulid('public_id')->nullable()->after('id');
        });

        DB::table('users')->whereNull('public_id')->orderBy('id')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                DB::table('users')->where('id', $user->id)->update([
                    'public_id' => (string) Str::ulid(),
                ]);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->ulid('public_id')->nullable(false)->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('public_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['public_id']);
            $table->dropColumn('public_id');
        });
    }
};
