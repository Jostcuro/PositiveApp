# Decisiones de diseño pendientes — MVP de Positive

> **Estado:** registro vivo. Recoge solo decisiones que pueden afectar al comportamiento, la seguridad, el
> esquema o la integración. **No duplica** el detalle: cuando existe una fuente principal, se referencia.
> Bloqueo indicado por: **diseño** · **implementación** · **integración real** · **ninguno** (revisable).
> Las decisiones que incluyen una línea «Decisión (fecha)» están **aprobadas**; el resto sigue pendiente.

## Resumen

| ID | Tema | Bloquea |
|---|---|---|
| [DD-001](#dd-001) | Visibilidad de conversaciones | implementación |
| [DD-002](#dd-002) | Desactivar usuario con conversaciones asignadas | implementación |
| [DD-003](#dd-003) | Significado operativo de `pending` | implementación |
| [DD-004](#dd-004) | Mono-empresa y evolución a SaaS | ninguno (documentado) |
| [DD-005](#dd-005) | Retención y eliminación de datos / PII | implementación |
| [DD-006](#dd-006) | Política de archivos multimedia | implementación (parcial) |
| [DD-007](#dd-007) | Gestión de secretos | integración real |
| [DD-008](#dd-008) | Identificadores públicos (ULID) | implementación |
| [DD-009](#dd-009) | Identidad de contacto (BSUID/usernames) | diseño |
| [DD-010](#dd-010) | `whatsapp_accounts` en el MVP | ninguno (revisable) |
| [DD-011](#dd-011) | Envío de resultado incierto y reconciliación | integración real |
| [DD-012](#dd-012) | Límite de reintentos y backoff | implementación |
| [DD-013](#dd-013) | Autenticación y sesiones | implementación |
| [DD-014](#dd-014) | Reglas de asignación y reasignación | implementación |
| [DD-015](#dd-015) | Modalidad de integración con Meta | integración real |

---

<a id="dd-001"></a>
### DD-001 — Visibilidad de conversaciones
- **Pregunta:** ¿qué conversaciones ve cada rol?
- **Opciones:** (a) `admin` ve todo; `agent` ve sin asignar + propias · (b) `agent` ve solo las propias (debe tomar para ver) · (c) todos ven todo.
- **Recomendación provisional:** (a). Detalle en [permission-matrix §3](../security/permission-matrix.md#3-política-de-visibilidad-de-conversaciones-propuesta).
- **Decisión (2026-10-10):** aprobada la opción (a): `admin` ve todo; `agent` ve sin asignar + propias.
- **Consecuencia de errar:** fuga de conversaciones de clientes entre empleados o, al contrario, agentes sin trabajo visible.
- **Responsable:** responsable de producto.
- **Bloquea:** implementación de autorización.

<a id="dd-002"></a>
### DD-002 — Desactivar usuario con conversaciones asignadas
- **Pregunta:** ¿qué ocurre con sus conversaciones al desactivarlo?
- **Opciones:** (a) dejarlas **sin asignar** en transacción + auditoría · (b) **bloquear** la desactivación hasta reasignarlas.
- **Recomendación provisional:** (a).
- **Decisión (2026-10-10):** aprobada la opción (a): desactivar deja las conversaciones **sin asignar** en la
  misma transacción + auditoría.
- **Consecuencia de errar:** conversaciones “colgadas” sin responsable visible, o bloqueo operativo del administrador.
- **Responsable:** responsable de producto.
- **Bloquea:** implementación.

<a id="dd-003"></a>
### DD-003 — Significado operativo de `pending`
- **Pregunta:** ¿qué significa `pending` para el negocio?
- **Opciones:** (a) esperando respuesta del cliente · (b) en pausa/espera interna · (c) ambos según contexto.
- **Recomendación provisional:** (a) «esperando respuesta del cliente», distinto de una cola técnica. La reapertura
  de `resolved` ante un entrante **ya está confirmada**; ver [state-machines §2](../architecture/state-machines.md#2-máquina-de-conversación).
- **Consecuencia de errar:** métricas de atención y SLA equivocadas.
- **Responsable:** responsable de producto.
- **Bloquea:** implementación (semántica de la UI y de las métricas).

<a id="dd-004"></a>
### DD-004 — Mono-empresa y evolución a SaaS
- **Pregunta:** ¿se introduce aislamiento por empresa ahora?
- **Opciones:** (a) sin `companies`/`tenant_id`; documentar supuesto mono-empresa · (b) añadir `tenant_id` nullable ya.
- **Recomendación provisional:** (a). Punto de inserción futura: columna `company_id` en `contacts`/`conversations`/
  `users` y cambio de `UNIQUE(contact.phone_e164)` a `UNIQUE(company_id, phone_e164)`.
- **Decisión (2026-10-10):** aprobada la opción (a): mono-empresa sin `companies`/`tenant_id` (esquema ya
  implementado en Tarea 03); se conserva documentado el punto de inserción futura.
- **Consecuencia de errar:** retrabajo de esquema y consultas si se adopta SaaS; hoy no se implementa.
- **Responsable:** arquitectura.
- **Bloquea:** ninguno; documentado en [data-model §2 (S3)](../architecture/data-model.md#supuestos-documentados).

<a id="dd-005"></a>
### DD-005 — Retención y eliminación de datos / PII
- **Pregunta:** ¿cuánto tiempo se conservan contactos, mensajes, payloads de webhooks y auditoría?
- **Opciones:** por plazos diferenciados (mensajes, payloads, auditoría) con anonimización o purga.
- **Recomendación provisional:** conservar auditoría a largo plazo; purgar `webhook_events.payload` antes que el
  resto; política formal por definir.
- **Consecuencia de errar:** incumplimiento de minimización de datos o pérdida de evidencia de auditoría.
- **Responsable:** responsable de producto + legal.
- **Bloquea:** implementación (define si/como se borra).

<a id="dd-006"></a>
### DD-006 — Política de archivos multimedia
- **Pregunta:** ¿se descargan y almacenan archivos multimedia?
- **Opciones:** (a) no almacenar; solo `media_provider_id` · (b) descargar y almacenar con retención · (c) descargar bajo demanda.
- **Recomendación provisional:** (a) en el MVP; revisar cuando la operación lo requiera.
- **Consecuencia de errar:** dependencia de URLs/ids del proveedor que pueden expirar; o coste de almacenamiento sin política.
- **Responsable:** responsable de producto.
- **Bloquea:** implementación (parcial; el MVP puede funcionar sin multimedia).

<a id="dd-007"></a>
### DD-007 — Gestión de secretos
- **Pregunta:** ¿dónde residen tokens y claves de integración?
- **Opciones:** variables de entorno · gestor de secretos dedicado.
- **Recomendación provisional:** gestor de secretos; en BD solo `secret_ref` (nunca el valor). Ver
  [security-baseline](../security/security-baseline.md).
- **Consecuencia de errar:** filtración de credenciales de WhatsApp.
- **Responsable:** arquitectura + operaciones.
- **Bloquea:** integración real.

<a id="dd-008"></a>
### DD-008 — Identificadores públicos (ULID)
- **Pregunta:** ¿se exponen los `id` internos o un identificador público?
- **Opciones:** (a) `public_id` ULID en `contacts`/`conversations` · (b) exponer `BIGINT` con autorización estricta.
- **Recomendación provisional:** (a), como defensa en profundidad frente a enumeración.
- **Consecuencia de errar:** enumeración de recursos; no es crítico si la autorización es correcta, pero degrada.
- **Responsable:** arquitectura.
- **Bloquea:** implementación (afecta esquema y rutas).
- **Estado (2026-10-10):** implementada la opción (a) en `contacts`/`conversations` (Tarea 03); aprobación formal pendiente.

<a id="dd-009"></a>
### DD-009 — Identidad de contacto (BSUID/usernames)
- **Pregunta:** ¿cómo se identifica de forma única a un contacto si el teléfono puede faltar?
- **Opciones:** (a) identidad por `provider + provider_user_id` con `phone_e164?` · (b) exigir teléfono siempre.
- **Recomendación provisional:** (a). Ver [data-model §4.2](../architecture/data-model.md#42-contacts).
- **Consecuencia de errar:** contactos duplicados o fusiones incorrectas; ruptura cuando Meta entregue BSUID.
- **Responsable:** arquitectura + validación de Meta.
- **Bloquea:** diseño (y por tanto implementación).
- **Estado (2026-10-10):** implementada la identidad por `provider + provider_user_id` con `phone_e164?` (opción
  (a)) en la tabla `contacts` (Tarea 03); aprobación formal pendiente.

<a id="dd-010"></a>
### DD-010 — `whatsapp_accounts` en el MVP
- **Pregunta:** ¿tabla o solo configuración para la cuenta única?
- **Opciones:** (a) tabla mínima justificada por la administración de la configuración · (b) `config`/`env` sin tabla.
- **Recomendación provisional:** (a) con campos no secretos y `secret_ref`.
- **Consecuencia de errar:** sobremodelado menor (una fila) o configuración que exige redeplegar para cambiar.
- **Responsable:** arquitectura.
- **Bloquea:** ninguno; revisable.

<a id="dd-011"></a>
### DD-011 — Envío de resultado incierto y reconciliación
- **Pregunta:** ¿cómo se trata un envío del que no se conoce el resultado?
- **Opciones:** reenviar (riesgo de duplicado) · no reenviar y reconciliar/alerta.
- **Recomendación provisional:** no reenviar; marcar `unknown` y reconciliar si el proveedor lo permite.
- **Consecuencia de errar:** mensaje duplicado real o mensaje no enviado sin detectar.
- **Responsable:** validación de Meta.
- **Bloquea:** integración real. La capacidad de reconciliar **no está confirmada**.

<a id="dd-012"></a>
### DD-012 — Límite de reintentos y backoff
- **Pregunta:** ¿cuántos reintentos y con qué espera?
- **Opciones:** valor acotado por configuración (p. ej. 3) con *backoff* exponencial.
- **Recomendación provisional:** máximo 3, backoff exponencial, sin reintento en errores permanentes/inciertos.
- **Consecuencia de errar:** tormenta de reintentos o poca tolerancia a fallos transitorios.
- **Responsable:** arquitectura.
- **Bloquea:** implementación.

<a id="dd-013"></a>
### DD-013 — Autenticación y sesiones
- **Pregunta:** ¿cómo se autentica la SPA?
- **Opciones:** (a) Sanctum con cookies de sesión SPA (CSRF) · (b) tokens Bearer.
- **Recomendación provisional:** (a), confirmado por el responsable del producto. Implica dominios *stateful*,
  cookie CSRF, `SameSite`, CORS restringido y rate limiting de login.
- **Consecuencia de errar:** exposición de tokens o vectores CSRF/CORS mal configurados.
- **Responsable:** arquitectura + seguridad.
- **Bloquea:** implementación.

<a id="dd-014"></a>
### DD-014 — Reglas de asignación y reasignación
- **Pregunta:** ¿quién puede asignar y con qué efecto?
- **Opciones:** (a) `admin` asigna a cualquiera; `agent` solo toma sin asignar hacia sí mismo · (b) `agent` puede reasignar a otros.
- **Recomendación provisional:** (a). Ver [permission-matrix §5.3](../security/permission-matrix.md#53-reasignación).
- **Decisión (2026-10-10):** aprobada la opción (a): `admin` asigna a cualquiera; `agent` solo toma sin asignar
  hacia sí mismo.
- **Consecuencia de errar:** agentes “robándose” conversaciones o sin poder organizarse.
- **Responsable:** responsable de producto.
- **Bloquea:** implementación.

<a id="dd-015"></a>
### DD-015 — Modalidad de integración con Meta
- **Pregunta:** ¿integración directa, proveedor externo u otra?
- **Fuente principal:** [`../integrations/meta-integration-pending.md`](../integrations/meta-integration-pending.md) (no se duplica aquí).
- **Consecuencia de errar:** retrabajo del adaptador y de la verificación de webhooks.
- **Responsable:** responsable de producto + validación de Meta.
- **Bloquea:** integración real (no bloquea el desarrollo interno con datos ficticios).
