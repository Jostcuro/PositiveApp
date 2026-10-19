# ADR-005 — API de lectura de conversaciones y mensajes (T06B)

> **Estado:** implementado (T06B) y auditado (T06B-R), 2026-10-13
> ([informe de auditoría](../testing/t06b-read-api-audit.md)). Pruebas en
> `backend/tests/Feature/Api`. El Inbox del frontend consume este read API
> desde T07 ([ADR-006](ADR-006-frontend-inbox-read-integration.md)).

## Contexto

Tras T05/T06A existían autenticación, autorización base (`ConversationPolicy`) y el modelo de datos
(T03), pero **ningún endpoint de negocio**. La bandeja del frontend seguía usando datos ficticios.
La decisión vigente [DD-001](../../architecture/design-decisions-pending.md#dd-001) establece que en el
MVP **todos los roles operativos (`admin` y `agent`) leen todas las conversaciones**; la asignación no
restringe la lectura. La integración real con WhatsApp permanece bloqueada, por lo que esta etapa es
**solo de lectura**.

## Decisión

Se expone una API REST **de solo lectura** bajo `/api/v1`, autenticada por sesión Sanctum y protegida
por el middleware `active`, reutilizando `ConversationPolicy`.

| Método | Ruta | Autorización | Paginación |
|---|---|---|---|
| GET | `/api/v1/conversations` | `viewAny` | offset, `last_message_at DESC, id DESC` |
| GET | `/api/v1/conversations/{public_id}` | `view` | — |
| GET | `/api/v1/conversations/{public_id}/messages` | `view` | keyset (`cursorPaginate`), `id DESC` |

### Parámetros y límites

- Listado: `status ∈ {open, pending, resolved}` (opcional, valor inválido → 422);
  `per_page` 1–50 (por defecto 20); `page` ≥ 1 (valor inválido → 422).
- Mensajes: `per_page` 1–100 (por defecto 50); `cursor` opaco devuelto en `meta.next_cursor`.
- El **orden es fijo en el servidor**; no se acepta ningún parámetro de ordenación del cliente, por lo
  que no existe superficie de `orderByRaw`/inyección.

> Messages use keyset/cursor pagination ordered by `id DESC`. The first page contains the most recent
> messages. The frontend renders messages chronologically (oldest → newest) and requests older
> history using `next_cursor`.

- **Primera página = mensajes más recientes.** `meta.next_cursor` avanza hacia mensajes **más
  antiguos** (ids menores); `meta.prev_cursor` es `null` en la primera página.
- El **formato del cursor no cambia** con la dirección (sigue siendo `{id, _pointsToNextItems}`); el
  operador de comparación (`>`/`<`) se deriva del `ORDER BY` en el framework, no del cursor. Por
  tanto, un cursor emitido bajo el contrato anterior (`id ASC`) **no es válido** bajo `id DESC`:
  **los cursores no deben considerarse persistibles entre releases** cuando cambia la semántica de
  orden. Son valores opacos y de vida corta; el cliente debe reiniciar el historial.
- Los identificadores de conversación en la URL son el `public_id` (ULID, no enumerable, DD-008). Un
  `public_id` inexistente o malformado devuelve **404** con mensaje genérico.

### Forma de la respuesta

- Conversación: `id` (= `public_id`), `status`, `opened_at`, `last_message_at`, `resolved_at`,
  `reopened_count`, `assigned_user` (`{id, name}` o `null`), `contact` (`{id, display_name}`; el detalle
  añade `phone_e164`), `last_message` (resumen del último mensaje o `null`).
- Mensaje: `id`, `direction`, `type`, `body`, `sent_by` (nombre o `null`), `created_at`.
- Colecciones con el sobre de Laravel: `data` + `links`/`meta` (offset) o `meta.next_cursor` (keyset).
- **No** se exponen campos internos ni de proveedor (`processing_status`, `provider_status`,
  `provider_message_id`, `idempotency_key`, `error_code`, `error_message`, `media_provider_id`) ni las
  claves foráneas. **No** se exponen `unread` ni `description` porque no existen en el esquema.

## Rendimiento

- El resumen del último mensaje usa `Conversation::latestMessage()` (`hasOne()->latestOfMany()`), que se
  precarga con **una** consulta agregada; no se cargan historiales al listar.
- Prueba de regresión: el número de consultas del listado y del historial es **constante** al crecer el
  número de filas (`ConversationQueryPerformanceTest`).
- Evidencia de índices (SQLite `EXPLAIN QUERY PLAN`, ver [informe de auditoría](../testing/t06b-read-api-audit.md)): el historial usa
  `messages_conversation_id_id_index` y el listado filtrado por `status` usa
  `conversations_status_last_message_at_index`. El listado **sin filtro** ordena por `last_message_at`
  y **no** dispone de un índice que sirva esa ordenación (usa *filesort*/*temp B-tree*); a la escala del
  MVP (3–10 empleados, un número) es aceptable. **No** se ejecutó `EXPLAIN` en MySQL (no hay base de
  pruebas MySQL disponible): la conclusión sobre MySQL es esperada, no medida.

### Contrato de orden y evidencia medida (T06B-R)

- **Contrato del listado:** `last_message_at DESC NULLS LAST`, con `id DESC` como desempate
  determinista. Las conversaciones sin mensajes van **al final** y en orden estable. Prueba de regresión:
  `ConversationListTest::test_conversations_without_messages_come_last_and_are_stable`.
- **Contrato del historial:** keyset `(conversation_id, id DESC)`. La **primera página contiene los
  mensajes más recientes** y `meta.next_cursor` recorre hacia atrás en el tiempo. Evidencia medida en
  SQLite (T06B-R, actualizada a `DESC`): servida por `messages_conversation_id_id_index`, sin *temp
  B-tree*. Pruebas de regresión:
  `ConversationMessagesTest::test_messages_are_returned_in_descending_id_order`,
  `..._a_new_message_appears_on_the_first_page` y
  `..._cursor_pagination_traverses_all_messages_without_duplicates_or_omissions`.
- **Base semántica:** MySQL/MariaDB y SQLite ordenan `NULL` como el valor **más bajo**, por lo que con
  `DESC` quedan al final. **Medido en SQLite**; en MySQL es la semántica documentada del motor,
  **no medida** (no hay base MySQL de pruebas). Si el proyecto migrara a PostgreSQL (no previsto), `DESC`
  pondría los `NULL` primero y habría que forzar el orden.
- **Alternativa descartada con evidencia:** `ORDER BY (last_message_at IS NULL), last_message_at DESC,
  id DESC`. En el plan filtrado por `status` la expresión añade `USE TEMP B-TREE FOR ORDER BY`, mientras
  que el orden por columna lo sirve íntegramente `conversations_status_last_message_at_index`. Por eso se
  mantiene el orden por columnas.
- Planes medidos en SQLite (`EXPLAIN QUERY PLAN`, ver [informe de auditoría](../testing/t06b-read-api-audit.md)):

  | Consulta | Plan |
  | --- | --- |
  | Listado sin filtro | `SCAN conversations` + `USE TEMP B-TREE FOR ORDER BY` |
  | Listado filtrado por `status` | `SEARCH conversations USING INDEX conversations_status_last_message_at_index (status=?)` |
  | Filtrado con `(last_message_at IS NULL)` (descartado) | `SEARCH …` + `USE TEMP B-TREE FOR ORDER BY` |
  | Historial, primera página | `SEARCH messages USING INDEX messages_conversation_id_id_index (conversation_id=?)` |
  | Historial, con cursor (`id DESC`) | `SEARCH messages USING INDEX messages_conversation_id_id_index (conversation_id=? AND id<?)` |
  | Control: `ORDER BY created_at` (no indexado) | `SEARCH …` + `USE TEMP B-TREE FOR ORDER BY` |

## Consecuencias y limitaciones

- El listado de conversaciones usa **paginación por offset**, no keyset: la clave de orden
  (`last_message_at`) es mutable y nullable, y el MVP no la considera un "listado grande"
  (`data-model.md` §5). Queda como riesgo residual la posibilidad de solapamiento entre páginas si el
  orden cambia entre peticiones.
- El historial de mensajes sí usa **keyset** sobre `(conversation_id, id)` (clave estable y no nula),
  con dirección `id DESC` (más reciente primero). Los cursores son opacos y **no persistibles** entre
  releases cuando cambia la semántica de orden.
- `scopeVisibleTo(User)` se mantiene como **único punto de aplicación** de la visibilidad de fila a nivel
  de consulta (permission-matrix §7), porque el listado está paginado y una policy por fila no puede
  filtrar una página ya recortada sin alterar el total y los límites de página. Hoy no filtra nada
  (DD-001). **No autoriza por sí solo:** debe permanecer coherente con `ConversationPolicy::view()`, que
  protege el detalle y el historial; si cambia uno, debe cambiar el otro.
- `assigned_user` expone `{id, name}` usando el **id numérico interno** del usuario (no un `public_id`).
  Es una decisión explícita (clave estable en el cliente, sin PII de contacto); si se extiende a los
  usuarios la identificador público de DD-008, deberá migrarse. **Pendiente de confirmación del
  responsable.**
- El listado por offset **no** limita `page` por arriba: un `page` muy alto genera un `OFFSET` grande. A la
  escala del MVP es aceptable; se recomienda un máximo si el listado crece.
- Los endpoints de lectura **no** tienen limitación de tasa específica (solo la tiene el login). Riesgo bajo
  en el MVP (usuarios autenticados, un solo tenant).
- La coherencia entre `last_message_at` y la existencia de mensajes (`latestMessage`) depende de que las
  futuras rutas de escritura mantengan la columna sincronizada; hoy no hay rutas de escritura.
- La conexión de la bandeja del frontend a esta API **no** forma parte de esta tarea.
