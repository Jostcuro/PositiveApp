<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateConversationStatusRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Services\ConversationStatusService;
use Illuminate\Support\Facades\Gate;

/**
 * Internal status endpoint (T09).
 *
 * Applies the manual state machine; the actor is always the authenticated user.
 */
class ConversationStatusController extends Controller
{
    public function __construct(private readonly ConversationStatusService $statuses) {}

    public function update(UpdateConversationStatusRequest $request, Conversation $conversation): ConversationResource
    {
        Gate::authorize('changeStatus', $conversation);

        $updated = $this->statuses->change(
            $conversation,
            $request->user(),
            $request->string('status')->toString(),
            $request->ip(),
        );

        return ConversationResource::detail($updated);
    }
}
