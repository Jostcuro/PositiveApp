<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider',
    'event_type',
    'external_event_id',
    'dedupe_hash',
    'payload',
    'status',
    'attempts',
    'last_error',
    'received_at',
    'processing_started_at',
    'processed_at',
])]
#[WithoutTimestamps]
class WebhookEvent extends Model
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
            'payload' => 'array',
            'attempts' => 'integer',
            'received_at' => 'datetime',
            'processing_started_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }
}
