# Informe de auditoría T06B-R — API de lectura de conversaciones y mensajes

> **Estado:** completado. **Defectos confirmados: ninguno.** Se aplicaron mejoras de
> endurecimiento y documentación. Fecha: 2026-10-13. Alcance: solo backend (decisión del
> responsable). Relacionado: [ADR-005](../decisions/ADR-005-read-api-conversations-messages.md).

## 1. Alcance y método

Auditoría adversarial de los endpoints de lectura de T06B (`GET /api/v1/conversations`,
`GET /api/v1/conversations/{public_id}`, `GET /api/v1/conversations/{public_id}/messages`):
autorización, aislamiento de datos, validación de entrada, contrato de paginación, exposición
de PII/campos internos y uso de índices.

Método:

- Lectura íntegra de controladores, resources, form requests, modelo, policy, migraciones y las
  cinco suites de `tests/Feature/Api`.
- Evidencia de planes de consulta con `EXPLAIN QUERY PLAN` en SQLite `:memory:` (aislado; **no**
  se tocó la base MySQL de desarrollo) y captura del SQL real ejecutado por los endpoints.
- Sondas adversariales temporales (retiradas tras la auditoría): confusión de tipos,
  parámetros de ordenación del cliente, cursor manipulado, métodos no-GET, páginas extremas y
  barrido de fugas de campos.

## 2. Resultado

- **Defectos confirmados: ninguno.** Ninguna de las sondas produjo acceso indebido, error 5xx,
  fuga de datos internos ni comportamiento no determinista.
- La verificación del estado de la conversación coincide con el modelo de datos: el whitelist de
  `status` del API (`open | pending | resolved`) es exactamente el documentado en
  [`data-model.md` §5](../architecture/data-model.md).
- Una sonda marcó como fallo `?per_page=+1` / `?page=+1`; **no es un defecto**: Laravel acepta
  `+1` como entero válido y lo normaliza a `1`. La expectativa de la sonda era incorrecta.

## 3. Evidencia de consultas e índices

Tabla completa en [ADR-005 § Rendimiento](../decisions/ADR-005-read-api-conversations-messages.md).
Resumen medido (SQLite):

- Historial (primera página y con cursor `id DESC`): `messages_conversation_id_id_index`, sin *temp B-tree*.
  Con cursor, el plan usa `conversation_id=? AND id<?`.
- Listado filtrado por `status`: `conversations_status_last_message_at_index`, sin *temp B-tree*.
- Listado sin filtro: `SCAN conversations` + *temp B-tree* (esperado; sin índice que sirva la
  ordenación a esta escala).
- Alternativa `ORDER BY (last_message_at IS NULL)` **descartada**: degrada el plan filtrado a
  *temp B-tree*. El orden se mantiene por columnas, con `id DESC` como desempate determinista.
- Control independiente (`ORDER BY created_at`): *temp B-tree*, lo que confirma que el método
  detecta ordenaciones no indexadas.
- **Limitación:** los planes se midieron en SQLite. **No** se ejecutó `EXPLAIN` en MySQL (no hay
  base MySQL de pruebas disponible); la conclusión sobre MySQL es esperada, no medida.

## 4. Mejoras aplicadas

- **Pruebas de regresión** (`tests/Feature/Api/ConversationReadContractTest.php`, 8 casos):
  parámetros de ordenación del cliente ignorados; `status` no escalar/no canónico → 422;
  cursor manipulado que **no** accede a otra conversación y cursor no escalar → 422; métodos
  distintos de GET → 405 (confirma que no existen rutas de escritura implícitas); paridad de
  `admin` en detalle/historial; `page` fuera de rango como 200 vacío bien formado; y estabilidad
  del keyset ante inserciones nuevas entre páginas (sin duplicados ni omisiones) bajo el orden
  vigente `id DESC`.
- **Comentarios de salvaguarda** en `Conversation::scopeVisibleTo` y en `ConversationController::index`
  (por qué el orden no usa una expresión `IS NULL`; que el scope no autoriza por sí solo y debe
  permanecer coherente con `ConversationPolicy::view()`).
- **Documentación:** contrato de orden y evidencia en ADR-005; requisito de coherencia en
  [`permission-matrix.md` §7](../security/permission-matrix.md); mención de las nuevas pruebas en
  [`testing-strategy.md`](../testing/testing-strategy.md).

## 5. Riesgos residuales y pendientes

- **Identificadores internos:** `assigned_user` expone `{id, name}` con el id numérico interno del
  usuario. Es una decisión explícita; si se extiende a los usuarios el `public_id` de
  [DD-008](../architecture/design-decisions-pending.md#dd-008), deberá migrarse. **Pendiente de
  confirmación.**
- **`page` sin cota superior:** un `page` muy alto genera un `OFFSET` grande. Aceptable en el MVP;
  se recomienda un máximo si el listado crece.
- **Sin rate limiting específico** en los endpoints de lectura (solo el login lo tiene). Riesgo bajo
  en el MVP (usuarios autenticados, un solo tenant).
- **Coherencia `last_message_at` ↔ `latestMessage`:** depende de que las futuras rutas de escritura
  sincronicen la columna; hoy no hay rutas de escritura.
- **Paginación por offset del listado:** posible solapamiento entre páginas si el orden cambia entre
  peticiones (documentado en ADR-005).
- **Verificación en MySQL:** los planes y el orden con nulos se probaron en SQLite; falta
  reproducirlos en MySQL cuando exista base de pruebas dedicada.

## 6. Verificaciones ejecutadas

- `php artisan test tests/Feature/Api` → 45 tests, 45 passed (37 base + 8 nuevos).
- `php artisan test` (suite completa) → 107 tests, 106 passed, 1 skipped, 425 assertions.
- `vendor/bin/pint --test` → passed.
- Evidencia `EXPLAIN QUERY PLAN` generada en SQLite `:memory:` (temporal, retirada).

## 7. Veredicto

T06B (solo backend) queda **auditado sin defectos confirmados**, con endurecimiento de pruebas y
documentación. La conexión del frontend y la verificación empírica en MySQL quedan **fuera** de
esta tarea.
