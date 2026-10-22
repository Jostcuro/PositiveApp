<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public profile of an authenticated user.
 *
 * Only the fields strictly required by the SPA are exposed; the model already
 * hides `password` and `remember_token` via the #[Hidden] attribute.
 */
class UserResource extends JsonResource
{
    /**
     * @return array{id: int, public_id: string, name: string, email: string, role: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'public_id' => $this->resource->public_id,
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'role' => $this->resource->role,
        ];
    }
}
