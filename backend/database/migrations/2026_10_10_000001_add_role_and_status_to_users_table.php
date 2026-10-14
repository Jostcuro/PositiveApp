<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the role and operational status columns required by the approved MVP model.
     *
     * `email_verified_at` is dropped because the panel is internal and has no
     * email-verification flow. `remember_token` is kept: its final removal depends
     * on the approved authentication model (DD-013).
     *
     * @see docs/architecture/data-model.md (4.1 users)
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('agent')->after('password');
            $table->boolean('is_active')->default(true)->after('role');
            $table->dateTime('deactivated_at')->nullable()->after('is_active');
            $table->dropColumn('email_verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->dropColumn(['role', 'is_active', 'deactivated_at']);
        });
    }
};
