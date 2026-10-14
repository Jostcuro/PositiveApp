<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

#[Fillable(['public_id', 'display_name', 'phone_e164', 'provider', 'provider_user_id'])]
class Contact extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Contact $contact) {
            if (empty($contact->public_id)) {
                $contact->public_id = (string) Str::ulid();
            }
        });
    }

    /**
     * The single conversation for this contact (approved rule S1).
     */
    public function conversation(): HasOne
    {
        return $this->hasOne(Conversation::class);
    }
}
