# Project Status — Positive

> **Propósito:** fotografía operativa del estado **real** del repositorio para que un agente
> responda rápido a «¿qué existe hoy y qué NO debo asumir que existe?».
> **Fuente de verdad:** el código y los tests actuales. Este documento enlaza a las fuentes y no las
> duplica. Última sincronización documental: 2026-10-19 (tras implementar T09).

## Current state

Base técnica en curso. Ya existen **modelo de datos**, **autenticación SPA (Sanctum)**, una
**API de lectura de conversaciones y mensajes (T06B, aceptada)**, la **integración de lectura del
Inbox (T07)** y las **operaciones internas de escritura (T09)**: asignar/reasignar, desasignar y
cambiar estado. La bandeja `/inbox` consume datos reales (sin datos ficticios en tiempo de ejecución),
con estados de carga/vacío/error y manejo central de 401. El listado pagina de forma incremental con
«Cargar más conversaciones» (offset, dedupe por `public_id`) y refresco (T08); el historial permite
cargar mensajes anteriores con «Cargar mensajes anteriores». **No** existe integración externa real,
mensajería saliente, webhooks, realtime ni listado de usuarios.

## Implemented milestones

- **T03 — Modelo de datos:** migraciones, modelos Eloquent y pruebas de esquema/relaciones/restricciones.
- **T04 — Fundación del frontend:** React + TypeScript + Vite + Material UI, layout responsive y bandeja
  `/inbox` con datos ficticios ([ADR-003](decisions/ADR-003-frontend-foundation.md)).
- **T05 / T06A — Autenticación y autorización:** login/logout/sesión con Sanctum (cookies SPA), CSRF,
  roles `admin`/`agent`, middleware `active` y guarda de rutas
  ([ADR-004](decisions/ADR-004-authentication-sanctum.md)).
- **T06B — Read API de conversaciones y mensajes (aceptada):** `GET /api/v1/conversations`,
  `/conversations/{public_id}` y `/conversations/{public_id}/messages`
  ([ADR-005](decisions/ADR-005-read-api-conversations-messages.md),
  [auditoría T06B-R](testing/t06b-read-api-audit.md)).
- **T07 — Integración de lectura del Inbox (solo lectura):** la bandeja `/inbox` consume la API real
  con `public_id`, estados de carga/vacío/error, reintento y manejo central de 401. Se retiraron los
  datos ficticios ([ADR-006](decisions/ADR-006-frontend-inbox-read-integration.md)).
- **T08 — Paginación incremental del listado:** «Cargar más conversaciones» (offset sobre el contrato
  existente, acumulación con dedupe por `public_id`) y «Refrescar» que recarga la página 1. La limitación
  conocida del offset queda documentada y caracterizada por prueba
  ([ADR-007](decisions/ADR-007-offset-pagination-conversation-list.md)). Sin cambios de backend.
- **T09 — Operaciones internas de escritura:** `users.public_id` (ULID) con migración y backfill;
  `POST`/`DELETE /conversations/{public_id}/assignment` y `PATCH /conversations/{public_id}/status`;
  policy `assign`/`unassign`/`changeStatus`; auditoría atómica en `audit_logs`; concurrencia por
  actualización condicional (`409`); y controles en el Inbox (asignarme/liberar/cambiar estado) con la
  respuesta confirmada del backend ([ADR-008](decisions/ADR-008-internal-write-operations.md)).

## Current API contracts

Fuente: `backend/routes/api.php`, `backend/app/Http/Resources`, `backend/tests/Feature/Api`, ADR-005 y ADR-008.

- **Auth:** `/api/v1/auth/{login,me,logout}` (Sanctum, sesión *stateful* + CSRF). `login` con rate limiting.
  `/auth/me` expone `{id, public_id, name, email, role}` (el `id` interno se conserva por compatibilidad
  del contrato de autenticación).
- **Conversaciones:** lectura (`GET`) y operaciones internas de escritura (T09). Identificadas públicamente
  por `public_id` (ULID); la URL usa `public_id`, nunca el `id` numérico.
- **Escritura (T09):**
  - `POST /api/v1/conversations/{public_id}/assignment` con `{"user": "<user_public_id>"}`.
  - `DELETE /api/v1/conversations/{public_id}/assignment`.
  - `PATCH /api/v1/conversations/{public_id}/status` con `{"status": "open|pending|resolved"}`.
  - Responden con el detalle confirmado (`ConversationResource` con teléfono). **No** existe envío de
    mensajes ni listado de usuarios (`GET /api/v1/users` no está implementado).
- **Mensajes:** solo lectura. Identificados por su `id` **numérico interno** (no tienen `public_id`).
- **`assigned_user`:** expone `{public_id, name}` o `null` (T09). El `public_id` es el ULID de `User`; el
  id numérico interno **ya no** forma parte del contrato público.
- **`contact`:** `{id, display_name}`; el detalle añade `phone_e164`. En el listado **no** se expone `phone_e164`.
- **Paginación del listado (conversaciones):** *offset* (`LengthAwarePaginator`): `data`, `links` y `meta`
  (`current_page`, `per_page`, `total`, `last_page`, `from`, `to`, `path`, URLs de página).
- **Paginación de mensajes:** *keyset* (`CursorPaginator`): `data`, `links` y `meta`
  (`path`, `per_page`, `next_cursor`, `prev_cursor`; **sin** `total`). Orden fijo del servidor
  **`id DESC`**: la primera página trae los mensajes **más recientes** y `next_cursor` avanza hacia
  los **más antiguos**. La UI los presenta en orden cronológico (antiguo → reciente) y pide el
  historial anterior con `next_cursor` ("Cargar mensajes anteriores"). Cursores **no persistibles**
  entre releases cuando cambia la semántica de orden.
- **Autorización:** `ConversationPolicy` (`viewAny`, `view`, `assign`, `unassign`, `changeStatus`) es la
  autoridad por recurso. `Conversation::scopeVisibleTo()` centraliza la visibilidad de fila del listado y
  **no autoriza por sí solo**.
- **Errores:** 401 sin sesión/cuenta inactiva; 403 sin permiso; 404 genérico (`Recurso no encontrado.`) para
  `public_id` inexistente/malformado; 422 para parámetros inválidos o transición no permitida; 409 para
  conflicto de concurrencia.
- **No** se exponen campos internos ni de proveedor ni claves foráneas.

## Current frontend architecture

`frontend/src`:

- React 19 + TypeScript + Vite, **Material UI** como sistema de componentes y **React Router**.
- **No** hay TanStack Query, Axios, Redux ni Zustand. El cliente HTTP es `apiRequest`
  (`src/features/auth/apiClient.ts`): `fetch` con `credentials: 'include'` y cabecera `X-XSRF-TOKEN`
  en peticiones que cambian estado; normaliza errores en `ApiError` (`status`, `message`, `errors`).
- Sesión: `AuthProvider`/`useAuth` (`src/features/auth`). Guarda de rutas con `RequireAuth`.
- **Manejo central de 401:** `apiClient` invoca `setUnauthorizedHandler` en cualquier respuesta 401;
  `AuthProvider` registra `resetSession` (idempotente) y así se descarta la sesión local sin lógica
  duplicada por feature.
- Bandeja `/inbox` (T07): capa de API tipada en `src/features/inbox/api.ts`, contrato en
  `src/features/inbox/types.ts` y hook `useInboxData` (lista, detalle, mensajes, selección por
  `public_id` y cancelación de respuestas obsoletas). Sin datos ficticios ni *fallback* a mocks.
  El listado pagina de forma incremental con «Cargar más conversaciones» y refresco; la lista acumulada
  la gestiona `useConversationList` (offset, dedupe por `public_id`, guard de concurrencia y descarte de
  respuestas tardías). Del historial consume la primera página (más recientes, presentados en orden
  cronológico) y permite cargar páginas anteriores con «Cargar mensajes anteriores». No hay búsqueda ni filtros.
- **Acciones del Inbox (T09):** `ConversationActions` ofrece «Asignarme»/«Liberar» y un selector con las
  transiciones permitidas. `useInboxData` aplica la **respuesta confirmada** del backend al detalle y a la
  lista (`updateItem`), sin cambios optimistas, y descarta resultados tardíos si cambió la selección. El
  compositor de mensajes sigue deshabilitado.

## Next task

Pendiente de autorización expresa: **mensajería saliente** (envío de mensajes) y las capacidades
administrativas que la requieran (p. ej. listado de usuarios para reasignar a un responsable arbitrario).
La integración con WhatsApp/Meta sigue bloqueada. No iniciar automáticamente.

## Pending integrations

- **WhatsApp / Meta:** **no** integrado; bloqueado hasta validar decisiones
  ([meta-integration-pending](integrations/meta-integration-pending.md)).
- **Mensajería saliente (outbound):** no implementada.
- **Webhook de WhatsApp:** no implementado.
- **Realtime / polling / WebSockets / Reverb:** no implementados.
- **Telegram:** posible adaptador/proveedor de prueba **futuro**; **no** forma parte de T07.

## Explicitly out of scope

Para el estado actual (tras T09): Meta/WhatsApp, Telegram, envío de mensajes, webhooks, polling,
WebSockets/Reverb/realtime, listado/administración de usuarios, notas/tags/media, Redis/colas,
Docker/Nginx, nuevos roles, multitenencia, cambios de `.env`/secretos y despliegue. Las operaciones de
asignación/desasignación y cambio de estado **sí** están implementadas, pero limitadas a lo descrito en
ADR-008.

## Important architectural decisions

- [ADR-001](decisions/ADR-001-initial-architecture.md) — arquitectura inicial (monolito modular).
- [ADR-002](decisions/ADR-002-development-toolchain.md) — toolchain y versiones.
- [ADR-003](decisions/ADR-003-frontend-foundation.md) — fundación del frontend.
- [ADR-004](decisions/ADR-004-authentication-sanctum.md) — autenticación Sanctum (SPA stateful).
- [ADR-005](decisions/ADR-005-read-api-conversations-messages.md) — read API de conversaciones y mensajes.
- [ADR-006](decisions/ADR-006-frontend-inbox-read-integration.md) — integración de lectura del Inbox.
- [ADR-007](decisions/ADR-007-offset-pagination-conversation-list.md) — paginación incremental del listado.
- [ADR-008](decisions/ADR-008-internal-write-operations.md) — operaciones internas de escritura (T09).
- [DD-001](architecture/design-decisions-pending.md#dd-001) — visibilidad: en el MVP **todos** los roles
  operativos leen **todas** las conversaciones.
- [DD-008](architecture/design-decisions-pending.md#dd-008) — `public_id` ULID en
  `contacts`/`conversations`/`users`.
- [Matriz de permisos](security/permission-matrix.md) — autorización por rol y anti-IDOR.

## Verification status

- **Backend (ejecutado 2026-10-19, tras T09 y su corrección post-auditoría):** `php artisan test` →
  **150 tests, 149 passed, 1 skipped, 642 assertions** (el skip es la limitación preexistente que
  requiere MySQL dedicado).
- **Frontend (ejecutado 2026-10-19, tras T09):** `npm run test:run` → **7 archivos, 44 tests passed**;
  `npm run lint` sin avisos; `npm run build` (`tsc -b` + `vite build`) OK.
- **Pint:** `./vendor/bin/pint --test` reporta una incidencia de formato **preexistente** en
  `backend/tests/Feature/Api/ConversationListOffsetLimitationTest.php`, ajena a T09 y no modificada.
  Los archivos de T09 pasan Pint.
- **Manual:** integración Inbox↔API real (backend en ejecución) **no verificada manualmente**; las
  pruebas frontend usan `fetch` simulado. La concurrencia se valida por la semántica de la actualización
  condicional (SQLite en memoria), no con una carrera real de procesos.
