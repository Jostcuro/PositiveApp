<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListConversationsRequest;
use App\Http\Requests\ListMessagesRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Read-only API for conversations and their message history (Tarea 06B).
 *
 * Visibility is total for both operational roles (DD-001); authorization is
 * enforced through ConversationPolicy. No write or send operations are exposed.
 */
class ConversationController extends Controller
{
    /**
     * List conversations ordered by last activity (`last_message_at` desc,
     * then `id` desc as a deterministic tie-break). Conversations without any
     * message (`last_message_at` null) come last, deterministically.
     *
     * The plain column ordering is deliberate: an explicit
     * `(last_message_at IS NULL)` expression adds a temp B-tree to the
     * `status`-filtered plan, whereas the current form is served by
     * `conversations_status_last_message_at_index` (ADR-005, "Rendimiento").
     */
    public function index(ListConversationsRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Conversation::class);

        $conversations = Conversation::query()
            ->visibleTo($request->user())
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->with(['contact', 'assignedUser', 'latestMessage.sentBy'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20))
            ->withQueryString();

        return ConversationResource::collection($conversations);
    }

    /**
     * Show a single conversation, including the contact phone (functionally
     * required on the detail view).
     */
    public function show(Request $request, Conversation $conversation): ConversationResource
    {
        Gate::authorize('view', $conversation);

        $conversation->load(['contact', 'assignedUser', 'latestMessage.sentBy']);

        return new ConversationResource($conversation, includeContactPhone: true);
    }

    /**
     * Message history of a conversation, newest first, keyset paginated.
     *
     * The keyset order is `id DESC`: the first page contains the most recent
     * messages and `meta.next_cursor` walks backwards through older history.
     * The cursor itself is unchanged; only the direction differs from the
     * previous `id ASC` contract (see ADR-005, "Contrato de orden").
     */
    public function messages(ListMessagesRequest $request, Conversation $conversation): AnonymousResourceCollection
    {
        Gate::authorize('view', $conversation);

        $messages = $conversation->messages()
            ->with('sentBy')
            ->orderByDesc('id')
            ->cursorPaginate($request->integer('per_page', 50));

        return MessageResource::collection($messages);
    }
}
