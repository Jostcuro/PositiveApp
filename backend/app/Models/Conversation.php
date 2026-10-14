<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'public_id',
    'contact_id',
    'assigned_user_id',
    'status',
    'last_message_at',
    'last_inbound_at',
    'opened_at',
    'resolved_at',
    'reopened_count',
])]
class Conversation extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Conversation $conversation) {
            if (empty($conversation->public_id)) {
                $conversation->public_id = (string) Str::ulid();
            }
            if (empty($conversation->opened_at)) {
                $conversation->opened_at = now();
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'last_inbound_at' => 'datetime',
            'opened_at' => 'datetime',
            'resolved_at' => 'datetime',
            'reopened_count' => 'integer',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * The user responsible for this conversation, when assigned.
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
