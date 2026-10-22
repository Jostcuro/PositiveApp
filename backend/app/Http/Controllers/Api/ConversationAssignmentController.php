<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AssignConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ConversationAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Internal assignment endpoints (T09).
 *
 * The actor is always taken from the authenticated request; the target user is
 * resolved from its public ULID. Internal numeric ids are never accepted.
 */
class ConversationAssignmentController extends Controller
{
    public function __construct(private readonly ConversationAssignmentService $assignments) {}

    /**
     * Assign or reassign the conversation to a user.
     */
    public function store(AssignConversationRequest $request, Conversation $conversation): ConversationResource
    {
        $target = User::where('public_id', $request->string('user')->toString())->firstOrFail();

        if (! $target->isActive()) {
            throw ValidationException::withMessages([
                'user' => ['El usuario seleccionado no está activo.'],
            ]);
        }

        Gate::authorize('assign', [$conversation, $target]);

        $updated = $this->assignments->assign(
            $conversation,
            $request->user(),
            $target,
            $request->ip(),
        );

        return ConversationResource::detail($updated);
    }

    /**
     * Clear the conversation's responsible user.
     */
    public function destroy(Request $request, Conversation $conversation): ConversationResource
    {
        Gate::authorize('unassign', $conversation);

        $updated = $this->assignments->unassign(
            $conversation,
            $request->user(),
            $request->ip(),
        );

        return ConversationResource::detail($updated);
    }
}
