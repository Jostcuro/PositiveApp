<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/**
 * Autorización base de conversaciones (TAREA 05).
 *
 * Decisión vigente (DD-001, revisada el 2026-10-12): en el MVP **ambos roles
 * operativos** (`admin` y `agent`) pueden consultar **todas** las
 * conversaciones de la empresa. La asignación no restringe la lectura todavía.
 *
 * Cubre la visibilidad de lectura **y** las mutaciones internas de T09
 * (asignación/desasignación y cambio de estado). No concede permisos
 * administrativos (usuarios, roles, configuración): esas operaciones se
 * autorizan por separado y están denegadas por defecto para `agent`
 * (ver docs/security/permission-matrix.md).
 *
 * La salvaguarda de `tests/Feature/Auth/AuthorizationTest.php` exige que el
 * conjunto de abilities públicas sea exactamente el declarado aquí; cualquier
 * operación nueva debe añadirse de forma explícita (nunca implícita).
 */
class ConversationPolicy
{
    /**
     * Determine whether the user can list conversations.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view a specific conversation.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return true;
    }

    /**
     * Determine whether the user may set the conversation's responsible user.
     *
     * `admin` may target any user (assign or reassign). `agent` may only target
     * themselves; the "the conversation must be unassigned" rule is a domain
     * condition resolved by the service (409), not by this ability.
     */
    public function assign(User $user, Conversation $conversation, User $target): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $target->getKey() === $user->getKey();
    }

    /**
     * Determine whether the user may clear the conversation's responsible user.
     *
     * `admin` may release any conversation; `agent` only their own.
     */
    public function unassign(User $user, Conversation $conversation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $conversation->assigned_user_id === $user->getKey();
    }

    /**
     * Determine whether the user may change the conversation status.
     *
     * Visibility is total for both operational roles (DD-001); the transition
     * itself is validated against the state machine in the domain layer.
     */
    public function changeStatus(User $user, Conversation $conversation): bool
    {
        return true;
    }
}
