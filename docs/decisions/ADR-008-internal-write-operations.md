# ADR-008 — Operaciones internas de escritura del Inbox (T09)

- **Estado:** implementada (T09), 2026-10-19
- **Decisión relacionada:** [ADR-004](ADR-004-authentication-sanctum.md),
  [ADR-005](ADR-005-read-api-conversations-messages.md), [ADR-006](ADR-006-frontend-inbox-read-integration.md)
- **Documentos actualizados:** `docs/architecture/data-model.md`,
  `docs/architecture/state-machines.md`, `docs/security/permission-matrix.md`,
  `docs/architecture/design-decisions-pending.md`

## Contexto

Hasta T08 el producto era **solo de lectura**: existían autenticación, `ConversationPolicy` de
visibilidad, el read API de conversaciones/mensajes y el Inbox conectado a él. La asignación de
responsable y el estado (`open`, `pending`, `resolved`) existían en el modelo de datos (T03) pero **no
había forma de modificarlos** desde la aplicación.

T09 autoriza **solo** las operaciones internas del Inbox: asignar/reasignar, desasignar y cambiar el
estado. **No** autoriza mensajería saliente, integración con WhatsApp/Meta, webhooks, realtime, polling
ni el catálogo de usuarios.

## Decisión

### Identidad pública de usuario (D1)

Se añade `users.public_id` (ULID) mediante migración versionada, con PK y FK internas sin cambios
(`conversations.assigned_user_id`, `messages.sent_by_user_id`, `audit_logs.actor_user_id` siguen
apuntando a `users.id`). El contrato público `assigned_user` pasa de `{id, name}` a **`{public_id,
name}`** y **no** expone el id numérico interno. `UserResource` (`/auth/me`) añade `public_id` y
conserva `id` por compatibilidad del contrato de autenticación. No se usa email ni id interno como
identidad pública.

La migración es segura en entornos poblados: añade la columna como *nullable*, **backfillea** las filas
existentes por lotes con `Str::ulid()`, y solo entonces aplica `NOT NULL` y el índice único.

`public_id` es **server-controlled**: no está en `$fillable` y el hook `creating` del modelo lo genera
automáticamente. Un valor enviado por el cliente se ignora (mass assignment), sin poder fijar ni
sobrescribir la identidad pública.

### Endpoints

Autenticados por sesión Sanctum y protegidos por el middleware `active`.

| Método | Ruta | Autorización | Cuerpo |
|---|---|---|---|
| POST | `/api/v1/conversations/{conversation_public_id}/assignment` | `assign` (`ConversationPolicy`) | `{ "user": "<user_public_id>" }` |
| DELETE | `/api/v1/conversations/{conversation_public_id}/assignment` | `unassign` | — |
| PATCH | `/api/v1/conversations/{conversation_public_id}/status` | `changeStatus` | `{ "status": "open|pending|resolved" }` |

- El actor es **siempre** `$request->user()`; nunca un identificador del cliente.
- El destino se resuelve por `users.public_id`; **no** se acepta el id numérico interno (`422`).
- Las respuestas usan `ConversationResource` con `includeContactPhone: true`, de modo que el frontend
  pueda aplicar la respuesta confirmada como detalle sin una petición adicional.
- Todos los caminos exitosos, **incluidos los no-ops**, cargan las mismas relaciones (`assigned_user`,
  `contact.phone_e164`, `last_message`) mediante `ConversationResource::detail()`; la forma del JSON es
  idéntica en todos ellos.

### Reglas de asignación (D2)

| Actor | Estado previo | Destino | Resultado |
|---|---|---|---|
| `agent` | sin asignar | sí mismo | **200**, asigna |
| `agent` | sin asignar | otro | **403** (policy) |
| `agent` | asignada a otro | cualquiera | **403** si es a otro; **409** si intenta reclamar |
| `agent` | asignada a sí mismo | sí mismo | **409**, no puede reclamar una conversación ya asignada |
| `admin` | cualquiera | cualquiera | **200**, asigna, reasigna o no-op si el destino ya es el responsable |
| cualquiera | — | usuario inexistente | **422** |
| cualquiera | — | usuario inactivo | **422** |

`agent` **nunca** reasigna. El destino debe existir y estar activo. El no-op de asignación
(**200**) solo aplica a `admin`: un `agent` no puede reclamar una conversación ya asignada, ni
siquiera cuando el responsable actual es él mismo (**409**).

### Desasignación (D2)

- `agent`: solo si la conversación está asignada **a sí mismo** → **200**.
- `agent` + conversación asignada a otro → **403**.
- `agent` + conversación sin asignar → **403** (no es suya).
- `admin`: cualquiera, incluida una conversación ya sin asignar → **200** (no-op, sin auditoría).

### Estados (máquina de estados)

Transiciones manuales permitidas: `open → pending`, `open → resolved`, `pending → open`,
`pending → resolved`, `resolved → open`. Cualquier otra (`resolved → pending`, mismo estado
salvo idempotencia, valores desconocidos) → **422** (valor desconocido lo rechaza la validación; la
transición inválida la rechaza el dominio).

- Aplicar el estado actual es un **no-op idempotente**: **200**, sin tocar `resolved_at` ni
  `reopened_count`, sin auditoría.
- Entrar en `resolved` fija `resolved_at = now()`; volver manualmente a `open` lo limpia (`null`).
- `reopened_count` **no** se modifica en operaciones manuales. La reapertura por actividad entrante
  queda fuera de T09 (documentada como comportamiento futuro).
- Ambos roles pueden cambiar el estado de cualquier conversación visible (DD-001).

### Concurrencia

`DB::transaction` por sí solo **no** resuelve la concurrencia; se usa una **actualización condicional**
con comprobación de filas afectadas:

- Reclamar: `UPDATE ... WHERE id = ? AND assigned_user_id IS NULL`.
- Liberar (agent): `WHERE id = ? AND assigned_user_id = <actor>`.
- Estado: `WHERE id = ? AND status = <estado leído>`.

Si el número de filas afectadas es **0**, otra operación cambió la fila desde que se leyó: el perdedor
recibe **409** (no se sobreescribe el estado). La auditoría se inserta en la **misma transacción** que
la mutación.

### Auditoría

Se reutiliza la tabla existente `audit_logs` (append-only) mediante `App\Support\AuditLogger`. Acciones:
`conversation.assigned`, `conversation.reassigned`, `conversation.unassigned`,
`conversation.status_changed`. Metadatos `{from, to}` con **`user_public_id`**/estados (nunca el id
interno del usuario); `actor_user_id` es el id interno del actor; `resource_id` es el `public_id` de la
conversación. **No** se auditan los no-ops.

### Frontend

- `ConversationActions` ofrece «Asignarme» (si no hay responsable), «Liberar» (si es del usuario o el
  usuario es `admin`) y un selector con **solo las transiciones permitidas** (el backend sigue siendo la
  autoridad).
- Se usa la **respuesta confirmada** del backend para actualizar el detalle y el elemento de la lista
  (`useConversationList.updateItem`); **no** hay actualización optimista.
- Si la selección cambió mientras la mutación estaba en vuelo, solo se actualiza la lista: el resultado
  tardío **no** se aplica a la conversación activa.
- Los errores `403/409/422/404` se traducen a mensajes de UI; `409` muestra el mensaje del servidor.

## Fuera de alcance (explícito)

- Envío de mensajes, integración con WhatsApp/Meta, webhooks, realtime, polling, WebSockets/Reverb.
- **Listado de usuarios** (`GET /api/v1/users`): no autorizado en T09. La UI opera con el **usuario
  actual** (asignar a sí mismo, liberar) y no permite elegir un responsable arbitrario; el `admin` puede
  liberar cualquier conversación. Un selector multiusuario requiere una tarea backend explícita.
- Búsqueda y filtros del listado.
- Administración de usuarios/roles.
- Limitación de tasa en los endpoints de escritura (hardening futuro).

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Exponer `users.id` en `assigned_user` | Identificador enumerable; se alinea con DD-008 usando ULID. |
| Resolver la concurrencia solo con `DB::transaction` | No evita que dos lecturas concurrentes sobreescriban estado; se necesita una actualización condicional. |
| Devolver 422 también en conflictos de estado | Un conflicto de concurrencia no es un error de validación del cliente; `409` es semánticamente correcto. |
| Verificación optimista en el frontend | Puede mostrar un estado que el servidor rechazó; se prefiere la respuesta confirmada. |
| Endpoint de listado de usuarios en T09 | Fuera de alcance; ampliaría el contrato público de usuarios sin decisión aprobada. |

## Consecuencias y limitaciones

- Cambio de contrato público: `assigned_user` deja de exponer el id interno (ADR-005 y ADR-006
  actualizadas). Cualquier consumidor que dependiera de `assigned_user.id` debe migrar.
- `reopened_count` y la reapertura por actividad entrante no se cubren aquí.
- La prueba de concurrencia valida la **semántica** de la actualización condicional (409), no una carrera
  real de procesos: la suite backend se ejecuta sobre SQLite en memoria.
- El frontend no permite reasignar a un usuario arbitrario; depende de una futura tarea de listado de
  usuarios.
- Pruebas: `ConversationAssignmentTest`, `ConversationStatusTest`, `ConversationWriteSecurityTest`,
  `UserPublicIdTest` (backend) y `ConversationActions.test.tsx` (frontend).
