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
 * Esta policy cubre **solo visibilidad de lectura**. No concede —ni debe
 * conceder— permisos administrativos (usuarios, roles, configuración): esas
 * operaciones se autorizan por separado y están denegadas por defecto para
 * `agent` (ver docs/security/permission-matrix.md). Las capacidades de
 * mutación (asignar, cambiar estado, enviar) se añadirán cuando existan sus
 * endpoints, sin ampliar esta policy de forma implícita.
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
}
