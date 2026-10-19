# Project Status — Positive

> **Propósito:** fotografía operativa del estado **real** del repositorio para que un agente
> responda rápido a «¿qué existe hoy y qué NO debo asumir que existe?».
> **Fuente de verdad:** el código y los tests actuales. Este documento enlaza a las fuentes y no las
> duplica. Última sincronización documental: 2026-10-17 (tras implementar T07).

## Current state

Base técnica en curso. Ya existen **modelo de datos**, **autenticación SPA (Sanctum)**, una
**API de lectura de conversaciones y mensajes (T06B, aceptada)** y la **integración de lectura del
Inbox (T07)**. La bandeja `/inbox` consume datos reales (sin datos ficticios en tiempo de ejecución),
con estados de carga/vacío/error y manejo central de 401. No existe integración externa real ni
operaciones de escritura; el listado del Inbox consume solo la primera página y el historial permite
cargar mensajes anteriores con «Cargar mensajes anteriores».

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

## Current API contracts

Fuente: `backend/routes/api.php`, `backend/app/Http/Resources`, `backend/tests/Feature/Api` y ADR-005.

- **Auth:** `/api/v1/auth/{login,me,logout}` (Sanctum, sesión *stateful* + CSRF). `login` con rate limiting.
- **Conversaciones:** solo lectura. Identificadas públicamente por `public_id` (ULID); la URL usa `public_id`,
  nunca el `id` numérico.
- **Mensajes:** solo lectura. Identificados por su `id` **numérico interno** (no tienen `public_id`).
- **`assigned_user`:** actualmente expone `{id, name}` o `null`. El `id` corresponde al identificador
  **interno** de `User`. Actualmente `User` no dispone de un identificador público. Cualquier cambio de este
  contrato deberá realizarse mediante una **tarea backend explícita** que actualice código, tests y ADR
  correspondiente. No se debe tratar `assigned_user.id` como identidad pública ni usarlo en URLs.
- **`contact`:** `{id, display_name}`; el detalle añade `phone_e164`. En el listado **no** se expone `phone_e164`.
- **Paginación del listado (conversaciones):** *offset* (`LengthAwarePaginator`): `data`, `links` y `meta`
  (`current_page`, `per_page`, `total`, `last_page`, `from`, `to`, `path`, URLs de página).
- **Paginación de mensajes:** *keyset* (`CursorPaginator`): `data`, `links` y `meta`
  (`path`, `per_page`, `next_cursor`, `prev_cursor`; **sin** `total`). Orden fijo del servidor
  **`id DESC`**: la primera página trae los mensajes **más recientes** y `next_cursor` avanza hacia
  los **más antiguos**. La UI los presenta en orden cronológico (antiguo → reciente) y pide el
  historial anterior con `next_cursor` ("Cargar mensajes anteriores"). Cursores **no persistibles**
  entre releases cuando cambia la semántica de orden.
- **Autorización:** `ConversationPolicy` (`viewAny`/`view`) es la autoridad por recurso.
  `Conversation::scopeVisibleTo()` centraliza la visibilidad de fila del listado y **no autoriza por sí solo**.
- **Errores:** 401 sin sesión; 404 genérico (`Recurso no encontrado.`) para `public_id` inexistente/malformado;
  422 para parámetros inválidos.
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
  La UI consume **solo la primera página** del listado; del historial consume la primera página (más
  recientes, presentados en orden cronológico) y permite cargar páginas anteriores con «Cargar mensajes
  anteriores». No hay búsqueda ni filtros.

## Next task

**Operaciones de escritura** (asignación/reasignación, cambios de estado y envío de mensajes) con su
autorización, cuando se autoricen expresamente. La UI todavía no pagina más allá de la primera página
del listado; el historial ya permite cargar mensajes anteriores.

## Pending integrations

- **WhatsApp / Meta:** **no** integrado; bloqueado hasta validar decisiones
  ([meta-integration-pending](integrations/meta-integration-pending.md)).
- **Mensajería saliente (outbound):** no implementada.
- **Webhook de WhatsApp:** no implementado.
- **Realtime / polling / WebSockets / Reverb:** no implementados.
- **Telegram:** posible adaptador/proveedor de prueba **futuro**; **no** forma parte de T07.

## Explicitly out of scope

Para el estado actual y T07 (ya implementada): Meta/WhatsApp, Telegram, envío o cualquier escritura,
cambios de estado, asignación, notas/tags/media, webhooks, polling, WebSockets/Reverb/realtime,
Redis/colas, Docker/Nginx, nuevas migraciones, nuevos roles, multitenencia, cambios de
`.env`/secretos y despliegue.

## Important architectural decisions

- [ADR-001](decisions/ADR-001-initial-architecture.md) — arquitectura inicial (monolito modular).
- [ADR-002](decisions/ADR-002-development-toolchain.md) — toolchain y versiones.
- [ADR-003](decisions/ADR-003-frontend-foundation.md) — fundación del frontend.
- [ADR-004](decisions/ADR-004-authentication-sanctum.md) — autenticación Sanctum (SPA stateful).
- [ADR-005](decisions/ADR-005-read-api-conversations-messages.md) — read API de conversaciones y mensajes.
- [ADR-006](decisions/ADR-006-frontend-inbox-read-integration.md) — integración de lectura del Inbox.
- [DD-001](architecture/design-decisions-pending.md#dd-001) — visibilidad: en el MVP **todos** los roles
  operativos leen **todas** las conversaciones.
- [DD-008](architecture/design-decisions-pending.md#dd-008) — `public_id` ULID en `contacts`/`conversations`
  (no en `users`).
- [Matriz de permisos](security/permission-matrix.md) — autorización por rol y anti-IDOR.

## Verification status

- **Backend (reportado en la auditoría T06B-R, no re-ejecutado en esta sincronización documental):**
  `php artisan test tests/Feature/Api` → 45 passed; suite completa → 107 tests, 106 passed, 1 skipped.
- **Frontend (ejecutado 2026-10-17):** `npm run lint` sin avisos; `npm run test:run` → 5 archivos,
  21 tests passed; `npm run build` (`tsc -b` + `vite build`) OK. Incluye pruebas de integración del
  Inbox contra la read API con `fetch` simulado (lista, selección, 404, error/reintento, respuestas
  obsoletas, móvil y 401 central).
- **Manual:** integración Inbox↔API real (backend en ejecución) **no verificada manualmente**; las
  pruebas frontend usan `fetch` simulado.
