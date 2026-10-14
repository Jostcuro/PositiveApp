<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'conversation_id',
    'sent_by_user_id',
    'direction',
    'type',
    'body',
    'media_provider_id',
    'provider_message_id',
    'idempotency_key',
    'processing_status',
    'provider_status',
    'error_code',
    'error_message',
    'attempts',
    'last_error_at',
    'provider_timestamp',
    'provider_status_at',
])]
class Message extends Model
{
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'last_error_at' => 'datetime',
            'provider_timestamp' => 'datetime',
            'provider_status_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }
}
