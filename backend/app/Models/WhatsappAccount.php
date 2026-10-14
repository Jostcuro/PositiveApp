<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider',
    'display_number',
    'phone_number_id',
    'business_account_id',
    'status',
    'secret_ref',
])]
class WhatsappAccount extends Model
{
    use HasFactory;
}
