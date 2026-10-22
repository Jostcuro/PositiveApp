# Matriz de permisos — MVP de Positive

> **Estado:** propuesta. **Implementado (TAREA 05, 06B y 09).** Implementado hoy:
> autenticación de sesión SPA (login/logout/me), rate limiting de login, una **autorización base** con
> `ConversationPolicy` que refleja la política de visibilidad **vigente** ([DD-001](#dd-001), actualizada
> el 2026-10-12 — ver §3), la **API de lectura de conversaciones y mensajes** (T06B) con **scoping
> centralizado** (`Conversation::scopeVisibleTo`) y autorización por recurso
> ([ADR-005](../decisions/ADR-005-read-api-conversations-messages.md)), y las **operaciones internas de
> escritura** de asignación/desasignación y cambio de estado (T09,
> [ADR-008](../decisions/ADR-008-internal-write-operations.md)). **Pendiente de implementar:** el envío
> de mensajes, la administración de usuarios y el listado de usuarios (`GET /api/v1/users` no existe).
> Roles, visibilidad y desactivación/reasignación ([DD-002], [DD-014]) siguen como decisiones aprobadas.
> Fuente de estados: [`../architecture/state-machines.md`](../architecture/state-machines.md). Modelo:
> [`../architecture/data-model.md`](../architecture/data-model.md).

## 1. Principios de autorización

1. **La autorización se aplica en el backend.** Ocultar un botón en React **no** es un control de seguridad.
2. **Denegar por defecto.** Toda acción no concedida explícitamente se deniega.
3. **Mínimo privilegio.** Cada rol recibe solo lo necesario para su función.
4. **Scoping en la consulta, no solo en el detalle** (anti-IDOR): los listados, búsquedas, historial y errores
   deben filtrar por visibilidad **en la consulta**, no solo al abrir un recurso por id.
5. **Sin secretos.** Ningún rol operativo puede leer tokens, credenciales ni claves. Residen en un gestor de
   secretos y se referencian por `secret_ref` (`whatsapp_accounts`).
6. **Todo lo sensible se audita** (`audit_logs`), sin secretos ni contenido de mensajes.

## 2. Roles

| Rol | Descripción |
|---|---|
| `admin` | Administra usuarios y configuración permitida; supervisa conversaciones según la política aprobada. |
| `agent` | Atiende conversaciones; en el MVP puede consultar todas las conversaciones (§3). |

Los roles son **preliminares** hasta aprobar esta matriz.

## 3. Política de visibilidad de conversaciones (MVP)

> **[DD-001](design-decisions-pending.md#dd-001) actualizada el 2026-10-12 (TAREA 05).** En el MVP, **todos los
> roles operativos consultan todas las conversaciones** de la empresa. **Reemplaza** la regla anterior
> «`agent`: sin asignar + propias». Implementado en `ConversationPolicy`.

| Rol | Alcance de visibilidad vigente (MVP) |
|---|---|
| `admin` | Puede consultar **todas** las conversaciones del MVP. |
| `agent` | Puede consultar **todas** las conversaciones del MVP. |
| Cualquier rol operativo | **No** puede leer directamente secretos o tokens de integración. |

- La visibilidad de un rol operativo **no** concede permisos administrativos (usuarios, roles, configuración);
  se mantienen separados y denegados por defecto para `agent` (§4).
- La asignación (`assigned_user_id`) **no restringe** la lectura en el MVP; se conserva como información de
  responsabilidad operativa. Las restricciones por asignación podrán introducirse más adelante como decisión nueva.
- Cuando existan los endpoints, la visibilidad se aplicará como **filtro de consulta** reutilizable en listado,
  búsqueda, detalle, historial, envío y consulta de errores. Hoy la visibilidad es total para roles operativos
  (ver §6).

## 4. Matriz de operaciones

Convención: **Sí** = permitido · **No** = denegado · **Cond.** = condicionado (se detalla debajo).

| # | Operación | `admin` | `agent` | Condición / notas |
|---|---|---|---|---|
| 1 | Consultar el propio perfil | Sí | Sí | Solo el propio; nunca campos sensibles. |
| 2 | Listar usuarios | Sí | No | **No implementado** (sin `GET /api/v1/users`; fuera de T09). |
| 3 | Crear usuarios | Sí | No | Rol inicial asignable solo por `admin`. |
| 4 | Modificar usuarios (nombre, email) | Sí | No | |
| 5 | Activar/desactivar usuarios | Sí | No | Ver §5 (conversaciones asignadas). |
| 6 | Cambiar roles | Sí | No | Ver §5 (mínimo privilegio, auditoría). |
| 7 | Consultar contactos | Sí | **Cond.** | Solo los contactos de conversaciones visibles. |
| 8 | Crear contactos | Sí | **Cond.** | Vía conversación entrante; creación manual evaluar. |
| 9 | Modificar contactos | Sí | **Cond.** | Solo contactos visibles; evaluar si `agent` puede editar. |
| 10 | Consultar conversaciones | Sí | Sí | §3: visibilidad total para roles operativos en el MVP. |
| 11 | Asignar/reasignar conversaciones | Sí | **Cond.** | **Implementado (T09).** `agent` solo *claim* de **sin asignar** hacia sí mismo; reasignar a otro → solo `admin`. Desasignar: `admin` cualquiera; `agent` solo la suya. |
| 12 | Cambiar estado de conversación | Sí | **Cond.** | **Implementado (T09).** Cualquier conversación visible y transición válida. |
| 13 | Consultar historial de mensajes | Sí | **Cond.** | Solo de conversaciones visibles. |
| 14 | Enviar mensajes | Sí | **Cond.** | Solo en conversaciones visibles/responsable. |
| 15 | Consultar errores de envío | Sí | **Cond.** | Solo de conversaciones visibles. |
| 16 | Administrar configuración de integración | Sí | No | Metadatos no secretos; secretos vía gestor. |
| 17 | Consultar auditoría | Sí | No | Filtrar por recurso si se habilita a futuro. |
| 18 | Gestionar usuarios en bloque / importación | No | No | Fuera de alcance del MVP. |
| 19 | Reasignación masiva | No | No | Fuera de alcance del MVP. |
| 20 | Leer/exportar secretos o tokens | No | No | **Nunca**, para ningún rol. |

## 5. Reglas condicionadas y casos especiales

### 5.1 Desactivar un usuario con conversaciones asignadas

- **[Decisión 2026-10-10 — DD-002](design-decisions-pending.md#dd-002).** Aprobada la opción (a): dejar las
  conversaciones **sin asignar** automáticamente en una **transacción** que además registra auditoría
  (`user.deactivated`, `conversation.unassigned`).
- Al desactivar, el usuario **no puede** iniciar sesión; no se borra su historial.

### 5.2 Cambiar roles

- Solo `admin`. Un `admin` **no puede quitarse a sí mismo** el único rol `admin` del sistema (evitar quedarse sin
  administrador). Se audita el cambio.

### 5.3 Reasignación

> **[Decisión 2026-10-10 — DD-014](design-decisions-pending.md#dd-014).** Aprobada la opción (a).

- `admin` puede reasignar a cualquier usuario **activo**.
- `agent` solo puede **tomar** (claim) una conversación **sin asignar** hacia sí mismo.
- Un `agent` que intenta reclamar una conversación **ya asignada** recibe **409**, incluso si el
  responsable actual es él mismo (no hay no-op de asignación para `agent`).
- `agent` solo puede **desasignar** una conversación asignada **a sí mismo**; `admin` puede desasignar
  cualquiera. Un `agent` sobre una conversación **sin asignar** recibe **403** (no es suya); para
  `admin` es un no-op **200**.
- Reasignar a un usuario **inactivo** se **rechaza** (`422`).
- La operación usa **update condicional** en transacción (evita carreras entre dos agentes; ver
  [data-model §6](../architecture/data-model.md)). Un perdedor recibe `409`. Se audita
  `conversation.assigned`/`conversation.reassigned`/`conversation.unassigned` con identificadores
  públicos (`user_public_id`), nunca con el id interno. Implementado en T09
  ([ADR-008](../decisions/ADR-008-internal-write-operations.md)).

### 5.4 Envío de mensajes

- Requiere ser un rol operativo que pueda consultar la conversación (§3: visibilidad total en el MVP).
- Si el contrato aprueba que `agent` envíe en conversaciones **sin asignar** sin tomarlas, se reflejará aquí; hoy
  la recomendación es que **tomar la conversación** sea requisito para responder.

## 6. Prevención de fuga de información (anti-IDOR)

- **Listados:** aplicar el filtro de visibilidad antes de paginar (hoy total para roles operativos; centralizado
  para poder restringirlo sin tocar cada endpoint).
- **Búsqueda:** limitar resultados y filtrar por visibilidad; no exponer el directorio completo de contactos.
- **Detalle:** revalidar autorización por recurso (no confiar en que el id no se conozca).
- **Historial y errores:** heredan la visibilidad de su conversación.
- **Identificadores públicos:** `contacts`, `conversations` y `users` usan `public_id` ULID (no enumerables).
  Los contratos públicos no exponen el id numérico interno (T09: `assigned_user.public_id`). Ver
  [DD-008](design-decisions-pending.md#dd-008).
- **Errores de API:** formato consistente que **no** revela si un recurso existe o no para un usuario sin acceso
  (evitar oráculos de existencia).
- **Secretos:** nunca incluidos en respuestas, logs ni auditoría.

## 7. Aplicación en backend (requisitos de implementación)

- Policies/Gates por recurso y por acción, con comprobación explícita en cada endpoint de `/api/v1`.
  Implementado: `ConversationPolicy` (`viewAny`, `view`, `assign`, `unassign`, `changeStatus`) y
  `Gate::authorize` en cada endpoint de lectura y escritura. La salvaguarda de
  `AuthorizationTest` fija el conjunto de abilities declaradas.
- Un **filtro de visibilidad** único y reutilizado en todas las consultas de conversaciones (hoy total para roles
  operativos; centralizado para poder restringirse más adelante sin reescribir cada endpoint). Implementado como
  `Conversation::scopeVisibleTo(User)`, aplicado en el listado; el acceso por recurso se revalida con la policy. El
  filtro centralizado **no** sustituye a la policy: `ConversationPolicy::view()` debe reflejar la misma regla, ya que
  el listado (paginado) no puede aplicar una comprobación por fila después de recortar la página.
- **Rate limiting** en autenticación y en endpoints sensibles.
- **Auditoría** de las acciones marcadas como sensibles en esta matriz.
- Pruebas obligatorias de **permisos denegados** de las operaciones administrativas (p. ej. un `agent` no puede
  administrar usuarios, cambiar roles ni modificar la configuración), además de los casos válidos.

## 8. Referencias

- Visibilidad revisada (DD-001) e implementada como autorización base (TAREA 05); asignación, desasignación
  y cambio de estado (DD-014) **implementados** en T09. La desactivación con conversaciones asignadas
  (DD-002) sigue **decidida pero pendiente** de implementar:
  [`../architecture/design-decisions-pending.md`](../architecture/design-decisions-pending.md).
- Transiciones permitidas y quién puede ejecutarlas: [`../architecture/state-machines.md`](../architecture/state-machines.md).
- Controles técnicos pendientes: [`security-baseline.md`](security-baseline.md).
