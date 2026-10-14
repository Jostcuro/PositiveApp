# Línea base de seguridad

> **Estado:** aplicable a la configuración actual del repositorio y entorno. Revisado en la Tarea 05 (autenticación). Cada ítem indica si está **implementado** hoy o **pendiente** (dónde/cuándo se incorporará). Este documento se revisa en cada tarea.

## Principio

La seguridad se diseña desde el inicio: para el MVP de una plataforma que atiende conversaciones de clientes, el costo de una filtración o de acceso indebido es alto. Se aplica el principio de mínimo privilegio y autorización siempre en el servidor.

## Controles actuales (implementados en esta fase)

| Control | Estado | Dónde |
|---|---|---|
| Secretos fuera del repositorio | **Implementado** | `.env` (raíz y backend) gitignored, `chmod 600`; plantillas públicas en `.env.example` sin valores reales; `.gitignore` raíz excluye `/.env`. |
| Instalación de tooling sin privilegios de sistema | **Implementado** | PHP/Composer vía `php.new` a nivel de usuario; MySQL en contenedor. |
| Base de datos no expuesta públicamente | **Implementado** | Contenedor MySQL levanta en `127.0.0.1:3306`; se verifica con `ss -ltnp`. |
| Credenciales de desarrollo generadas, no escritas a mano | **Implementado** | Generadas con `openssl rand -hex 24`; documentadas en setup.md. |
| Auditoría de dependencias | **Implementado (manual)** | `composer audit` y `npm audit --omit=dev` forman parte de la verificación de cada tarea; resultados registrados en el informe. A automatizar en CI cuando exista. |
| Errores sin filtrar detalles internos | **Implementado (API `/api/v1`)** | Respuestas de error JSON consistentes; credenciales inválidas y cuentas inactivas devuelven un mismo 422 genérico. `APP_DEBUG=false` en producción (no se exponen trazas). |
| Validación y normalización de entradas en el backend | **Implementado (auth)** | Validación a la entrada en `POST /api/v1/auth/login` (Laravel `validate()`), siempre en servidor. Se extiende con cada endpoint nuevo. |
| Autorización por roles en el servidor | **Implementado (base)** | Guard `auth:sanctum` + `ConversationPolicy` (visibilidad por rol, [DD-001](../architecture/design-decisions-pending.md#dd-001)); el rol se lee de BD y nunca lo decide el cliente. La autorización por recurso se completa con los endpoints de conversaciones. Ver [permission-matrix.md](permission-matrix.md). |
| Scoping de consultas (anti-IDOR) en listados, búsqueda, detalle, historial y errores | **Pendiente** | Se implementará con las consultas de conversaciones; ver [permission-matrix §6](permission-matrix.md#6-prevención-de-fuga-de-información-anti-idor). |
| Rate limiting de autenticación y endpoints sensibles | **Implementado (login)** | Limitador `login` (5/min por email+IP) en `AppServiceProvider`. Se extiende a otros endpoints sensibles cuando existan. |
| Verificación de firma, anti-replay y límite de tamaño en webhooks | **Pendiente** | Adaptador de proveedor + controlador de webhooks; ver [state-machines §4](../architecture/state-machines.md#4-máquina-de-evento-externo). |
| Redacción de secretos y contenido sensible en logs | **Pendiente** | Política al implementar observabilidad y manejo de errores. |
| Mínimo privilegio en persistencia y en usuarios de BD | **Pendiente** | El usuario de BD de desarrollo es de ámbito local; los permisos por rol de aplicación se definirán en el modelo de datos. |
| Protección de sesiones, cookies, CSRF, CORS y límites de solicitudes | **Implementado (auth)** | Sanctum *stateful*: cookie de sesión + `XSRF-TOKEN`/`X-XSRF-TOKEN`, `SameSite=lax`, CORS por entorno (sin `*` con credenciales) y rate limiting de login. Una cuenta desactivada con sesión viva es rechazada con 401 (`EnsureUserIsActive`, TAREA 06A). `Secure` de cookie y CORS de **producción** pendientes de la fase de despliegue. Ver [ADR-004](../decisions/ADR-004-authentication-sanctum.md). |
| Hash seguro de contraseñas | **Implementado** | Contraseñas *hashed* con el mecanismo del framework (cast `hashed`, bcrypt); nunca texto plano ni algoritmos propios. |

## Pendientes obligatorios para la integración de WhatsApp

| Requisito | Dónde se incorporará |
|---|---|
| Verificación auténtica de webhooks (mecanismo oficial del proveedor) | Adaptador de proveedor + controlador de webhooks. |
| Protección contra eventos falsificados, duplicados y reintentos | Procesador de webhooks con idempotencia y estados explícitos. |
| Administración y protección de tokens de WhatsApp | Modelo de cuentas; nunca en texto plano; gestión documentada. |
| Retención y minimización de datos personales | Modelo de datos y política de retención acordada. |
| Auditoría de acciones sensibles (sin registrar secretos) | Módulo de auditoría. |

## Reglas de revisión de permisos y archivos sensibles

- Antes de cada commit se verifica que no se incluyan `.env`, keys, tokens ni dumps (`git status` + `git check-ignore`).
- Los archivos de configuración locales no se publican; sus plantillas sí.
- No se registran contenidos de mensajes en logs salvo necesidad y de forma controlada.
- No se afirma cumplimiento de una norma o certificación sin una evaluación que lo demuestre.

## Documentos de diseño relacionados

- [Modelo de datos](../architecture/data-model.md) — PII almacenada, conservación y sin borrados en cascada.
- [Máquinas de estados](../architecture/state-machines.md) — errores, reintentos, idempotencia y verificación de webhooks.
- [Matriz de permisos](permission-matrix.md) — autorización por rol, visibilidad y anti-IDOR.
- [Decisiones de diseño pendientes](../architecture/design-decisions-pending.md) — incluida la gestión de secretos (DD-007) y la retención de datos (DD-005).