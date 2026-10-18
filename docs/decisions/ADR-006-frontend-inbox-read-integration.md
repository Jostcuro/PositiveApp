# ADR-006 — Integración de la bandeja del Inbox con el read API (T07)

- **Estado:** implementado
- **Fecha:** 2026-10-17
- **Decisión relacionada:** [ADR-003](ADR-003-frontend-foundation.md), [ADR-004](ADR-004-authentication-sanctum.md),
  [ADR-005](ADR-005-read-api-conversations-messages.md)

## Contexto

La [API de lectura de conversaciones y mensajes (T06B)](ADR-005-read-api-conversations-messages.md) ya existía,
autenticada por sesión Sanctum y autorizada con `ConversationPolicy`, pero la bandeja `/inbox` seguía mostrando
**datos ficticios** (`src/data/mockConversations.ts`). T07 autoriza exclusivamente la **integración de lectura** del
frontend: sin escritura, envío, realtime ni polling.

El contrato real difiere del modelo de demostración: la conversación se identifica por `public_id` (ULID), el
mensaje por su `id` numérico interno, `assigned_user` es `{id, name} | null`, el contacto solo incluye
`phone_e164` en el detalle y la API **no ofrece búsqueda textual**.

## Decisión

- **Capa de API tipada:** `src/features/inbox/api.ts` reutiliza el cliente HTTP existente (`apiRequest`, cookies de
  sesión + CSRF) y expone `fetchConversations`, `fetchConversation(publicId)` y
  `fetchConversationMessages(publicId)`. No se añade un segundo cliente ni una librería de *data fetching*.
- **Tipos del contrato:** `src/features/inbox/types.ts` refleja literalmente lo expuesto por
  `ConversationResource`/`MessageResource`. La URL usa **siempre** `public_id`; `assigned_user.id` no se usa como
  identidad pública.
- **Hook de feature `useInboxData`:** concentra lista, detalle y mensajes. Modela el estado como
  `loading | success | error`, cancela respuestas obsoletas al cambiar de conversación (ignora el resultado de una
  petición anterior aunque llegue después) y permite reintentar la lista o el detalle+mensajes.
- **Selección:** se usa la conversación seleccionada explícitamente o, si no hay, la primera de la lista. En móvil,
  el historial solo aparece tras seleccionar una conversación.
- **Manejo central de 401:** `apiClient` invoca un handler global (`setUnauthorizedHandler`) registrado por
  `AuthProvider`, que descarta la sesión local (`resetSession`). Evita que cada feature reimplemente el logout y
  cubre la expiración de sesión mientras se navega. `resetSession` es idempotente y se reutiliza en el logout
  explícito.
- **Estados de UI:** carga, lista vacía, error con reintento y error 404 específico («Conversación no encontrada»).
  Mensajes sin texto se muestran como «Mensaje sin texto». Fechas con `Intl.DateTimeFormat('es-ES')`.
- **Búsqueda eliminada:** el buscador del Inbox se retira porque la API no ofrece búsqueda textual y filtrar en
  cliente sobre una página ya paginada sería engañoso. No se sustituye por un filtro de estado en esta tarea.
- **Datos ficticios retirados:** se elimina `src/data/mockConversations.ts`. En tiempo de ejecución **no** hay
  *fallback* a mocks: si la API falla, la UI muestra el error.
- **Reutilización de UI:** se amplía `EmptyState` con una acción opcional y se reutiliza `ConversationStatusChip`;
  los tipos de estado pasan de los mocks a `features/inbox/types.ts`.
- **Sin dependencias nuevas:** no se incorpora TanStack Query, Axios, Redux ni Zustand.

### Fuera de esta decisión

- Escritura, envío de mensajes, cambios de estado y asignación.
- Realtime, WebSockets, polling o Reverb.
- Búsqueda, filtros avanzados, paginación incremental en UI y notas/tags/media.
- Cambios en el contrato del backend, nuevas migraciones o `public_id` para usuarios.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| TanStack Query | El caso (una lista y dos recursos por selección) se resuelve con un hook de feature sin nueva dependencia. Se reevaluará si crecen la caché o la invalidación. |
| `useAsyncResource` genérico | Abstracción especulativa para tres llamadas; el hook de feature mantiene el contexto y la cancelación cerca del dominio. |
| Mantener el buscador filtrando en cliente | La lista está paginada en servidor; filtrar solo la página visible daría resultados incompletos y engañosos. |
| Fallback a los datos ficticios ante error | Mezclaría datos simulados con reales y ocultaría fallos de integración. Contradice el principio de no presentar simulación como integración. |
| Añadir un filtro de estado en la UI | La API lo soporta, pero no formaba parte del alcance acordado de T07; queda como mejora futura. |

## Consecuencias y limitaciones

- **Solo primera página:** la UI consume la primera página del listado (offset) y del historial (keyset). Los metadatos
  de paginación están tipados, pero no hay controles de «página siguiente» ni *scroll* infinito todavía.
- **Sin búsqueda ni filtros:** el Inbox muestra la lista tal como la entrega la API.
- **`assigned_user`:** se muestra el nombre; su `id` interno no se usa en URLs ni como identidad pública. Un cambio de
  contrato exige una tarea backend explícita.
- **Sesión expirada:** un 401 en cualquier lectura redirige a `/login` mediante el handler central; las features no
  duplican esa lógica.
- **Solo lectura:** el compositor sigue deshabilitado; no se habilitan acciones no soportadas por la API.
- **Pruebas:** `InboxPage.test.tsx` cubre lista, selección por defecto, cambio de conversación, estado vacío, error y
  reintento, 404, respuestas obsoletas, compositor deshabilitado y comportamiento móvil. `App.test.tsx` cubre el 401
  central y el layout autenticado.
