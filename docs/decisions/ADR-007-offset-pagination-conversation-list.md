# ADR-007 — Paginación incremental del listado de conversaciones (T08)

- **Estado:** aceptada por el responsable; implementada en `feat/t08-inbox-load-more` (pendiente de commit)
- **Fecha:** 2026-10-18
- **Decisión relacionada:** [ADR-005](ADR-005-read-api-conversations-messages.md),
  [ADR-006](ADR-006-frontend-inbox-read-integration.md)

## Contexto

El listado de conversaciones se sirve con paginación **offset** sobre el orden fijo del servidor
`last_message_at DESC, id DESC` ([ADR-005](ADR-005-read-api-conversations-messages.md)). Hasta T08, el Inbox consumía
**solo la primera página** ([ADR-006](ADR-006-frontend-inbox-read-integration.md)), de modo que las conversaciones
más antiguas no eran accesibles desde la UI.

`last_message_at` es una **clave de ordenación mutable**: cada mensaje nuevo actualiza la posición de una
conversación. Combinada con offset, esa mutabilidad puede desplazar la ventana de resultados entre dos peticiones de
página consecutivas y provocar duplicados u omisiones.

## Decisión

Se implementa paginación incremental del listado **sin cambios en el contrato del backend**, reutilizando el offset
existente:

- **Botón «Cargar más conversaciones»** que solicita la página siguiente (`?page=N`, solo `page`; `per_page` queda en
  el default del servidor). La página siguiente se deriva **exclusivamente** de `meta.current_page` del servidor,
  nunca de input del usuario.
- **Acumulación con deduplicación por `public_id`**: al anexar una página se conserva la primera aparición de cada
  conversación.
- **Botón «Refrescar»** que recarga la **página 1** y reemplaza la lista acumulada.
- **Concurrencia y respuestas tardías:** un `ref` de generación invalida las peticiones en vuelo cuando se refresca;
  un `ref` booleano evita cargas concurrentes de la misma página; un `ref` de montaje descarta respuestas que llegan
  tras el desmontaje. La carga inicial se dispara una sola vez aunque React (StrictMode) ejecute los efectos dos veces.
- **Manejo de errores:** un fallo al cargar la página siguiente conserva los items y el `meta`, muestra un error
  inline y permite reintentar la **misma** página. Un fallo al refrescar **con datos ya cargados** conserva la lista,
  no cambia el estado a error y muestra un aviso inline con «Reintentar»; si no hay datos, se muestra el estado de
  error con reintento.

## Limitación aceptada (explícita)

Una conversación que **sube de posición** entre la carga de la página 1 y la de la página 2 puede **duplicarse** o
**quedar oculta hasta refrescar**. El deduplicado elimina los duplicados visibles, pero **no recupera las omisiones**:
el ítem desplazado a una ventana ya recorrida no se vuelve a solicitar hasta que el usuario pulsa «Refrescar».

Esta limitación queda **caracterizada por una prueba permanente**:
`backend/tests/Feature/Api/ConversationListOffsetLimitationTest.php`. Si esa prueba deja de pasar, revisa esta ADR
antes de cambiar la expectativa.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Keyset sobre `last_message_at` | La clave es **mutable y nullable**; requiere cambio de contrato, un cursor compuesto `(last_message_at, id)` y cursores no persistibles. Fuera del alcance de T08 (sin cambios de backend). |
| Scroll infinito | No resuelve el riesgo de offset; añade complejidad de observadores de scroll sin beneficio para el volumen actual. |
| Mantener solo la primera página | Deja inaccesibles las conversaciones antiguas desde la UI. |

## Consecuencias

- El **refresco** descarta las páginas acumuladas y vuelve a la página 1 (posición del usuario en la lista se reinicia).
- La **selección** de conversación no cambia por `loadMore` ni por `refresh`: el detalle y el historial se solicitan por
  `public_id`, por lo que siguen funcionando aunque la conversación seleccionada ya no aparezca en la página 1.
- Un «Cargar más» pulsado durante un refresco en vuelo se ignora (refreshingRef); el orden refresh + loadMore está cubierto por ConversationList.paging T13.
- Sin nuevas dependencias, sin cambios de contrato, sin nuevos endpoints ni migraciones.

## Trabajo futuro (fuera de alcance)

- **Tope superior de `page` en el backend** (hoy solo `min:1`): mitiga offsets profundos.
- **Keyset de conversaciones** si el volumen o los requisitos lo exigen.
- **Filtro de `status` en la UI** (la API ya lo soporta).

## Pruebas

- Backend: `ConversationListOffsetLimitationTest.php` (caracteriza la limitación del offset).
- Frontend: `ConversationList.paging.test.tsx` (carga inicial sin query, visibilidad de «Cargar más», `page=2`
  exacto y anexado, dedupe, doble clic, refresco, descarte de respuesta tardía, error con reintento, selección
  estable y desaparición de la seleccionada).
