# ADR-004 — Autenticación y sesiones de la SPA con Laravel Sanctum

- **Estado:** Aceptado
- **Fecha:** 2026-10-12
- **Decisión relacionada:** [DD-013](../architecture/design-decisions-pending.md#dd-013), [ADR-001 — Arquitectura inicial del MVP](ADR-001-initial-architecture.md), [ADR-003 — Fundación del frontend](ADR-003-frontend-foundation.md)

## Contexto

La plataforma debe permitir que varios empleados (`admin` y `agent`) atiendan conversaciones de un mismo número
empresarial desde una interfaz compartida. La [matriz de permisos](../security/permission-matrix.md) y
[DD-001](../architecture/design-decisions-pending.md#dd-001) definen qué puede hacer cada rol y qué ve; falta
establecer **cómo se autentica** la SPA y cómo se protege la sesión.

La decisión [DD-013](../architecture/design-decisions-pending.md#dd-013) ya recomendaba Sanctum con cookies de
sesión SPA y estaba confirmada por el responsable de producto. Este ADR registra la implementación de la Tarea 05
(autenticación y autorización base) y sus consecuencias.

La integración real con WhatsApp sigue bloqueada (ver [meta-integration-pending](../integrations/meta-integration-pending.md));
este ADR no la habilita ni introduce credenciales de proveedor.

## Decisión

- **Mecanismo:** Laravel Sanctum en modo **SPA *stateful***: la sesión se transporta en una cookie y el CSRF se
  protege con el esquema de cookies de Sanctum. Se descartan los tokens Bearer para el MVP.
- **Endpoints** (bajo `/api/v1`, respuestas JSON envueltas en `data`):
  - `POST /api/v1/auth/login` — inicia sesión; protegido con `throttle:login`.
  - `GET /api/v1/auth/me` — devuelve el usuario autenticado (bajo `auth:sanctum`).
  - `POST /api/v1/auth/logout` — invalida la sesión y regenera el token CSRF.
- **Errores sin filtrar información:** credenciales inválidas y cuentas **inactivas** devuelven un **mismo 422
  genérico** («Las credenciales proporcionadas son incorrectas.»), sin revelar si la cuenta existe o su estado.
- **Cuentas activas:** iniciar sesión requiere `is_active = true`; las cuentas desactivadas no pueden autenticarse.
  Además, una sesión iniciada mientras la cuenta estaba activa deja de ser válida en cuanto `is_active` pasa a `false`:
  el middleware `EnsureUserIsActive` (alias `active`), aplicado a los endpoints bajo `auth:sanctum`, invalida la
  sesión y responde 401 (AUTH-AUDIT-008, TAREA 06A).
- **El rol nunca lo decide el cliente:** el rol y el estado se leen de la base de datos y no se aceptan valores
  enviados por el cliente. La autorización se aplica en el servidor (políticas/gates), nunca por ocultar UI.
- **Rate limiting:** limitador `login` (5 intentos/minuto por email+IP) registrado en `AppServiceProvider` como
  defensa frente a fuerza bruta.
- **Guard:** el API resuelve la sesión mediante el guard `web`; `config/sanctum.php` declara `guard => ['web']`.
- **Frontend:** un `AuthProvider` recupera la sesión al cargar (llamada a `/auth/me`), expone `login`/`logout` y un
  estado `loading | authenticated | unauthenticated`; una guarda `RequireAuth` protege las rutas privadas
  (medida de **navegación**, no de autorización).
- **Comunicación SPA↔API en desarrollo mediante *proxy* de Vite:** la SPA llama a rutas relativas (`/api`, `/sanctum`)
  y Vite las reenvía a `http://localhost:8000`. Así las cookies de sesión y el CSRF son del **mismo origen**, sin
  abrir CORS con credenciales.
- **Dominios *stateful* y CORS por entorno:** `SANCTUM_STATEFUL_DOMAINS` y `CORS_ALLOWED_ORIGINS` se configuran por
  variables de entorno (plantilla en `.env.example`); no se usa `*` con credenciales.
- **Contraseñas:** *hashed* con los mecanismos del framework; nunca en texto plano ni con algoritmos propios.

### Fuera de esta tarea (explícito)

- **No** hay registro público, restablecimiento de contraseña ni UI de administración de usuarios.
- **No** se implementan módulos de conversaciones ni integración con WhatsApp.
- **No** se introduce gestión de estado de servidor (`react-query`) ni formularios avanzados.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Tokens Bearer (Sanctum personal access tokens) | El token quedaría accesible al JavaScript del cliente; las cookies con CSRF y `SameSite` ofrecen mejor postura para una SPA de una sola app. |
| Sesiones por `localStorage` | Expone el secreto a XSS; Sanctum con cookie + CSRF es el patrón soportado por el stack. |
| Autenticación desde el propio frontend con Basic Auth | Contradice mínimo privilegio y el manejo seguro de credenciales; no soporta logout/sesión correctamente. |
| CORS abierto con credenciales (`*`) | Inseguro; se prefiere el proxy de desarrollo y orígenes explícitos por entorno. |

## Consecuencias

- El entorno de desarrollo **debe** reconocer `localhost:5173` como origen *stateful* para que la sesión funcione a
  través del proxy. `config/sanctum.php` incluye `localhost:5173` y `127.0.0.1:5173` en el valor por defecto
  (aplicable solo si falta `SANCTUM_STATEFUL_DOMAINS`), y la plantilla `.env.example` también los declara. Sin ese
  reconocimiento, el login responde 200 pero no persiste sesión. Documentado en [setup](../development/setup.md).
  (Corregido en la auditoría TAREA 06A: antes el valor por defecto no incluía el puerto de Vite.)
- La cookie `XSRF-TOKEN` es **legible por JavaScript por diseño** (Sanctum); no debe confundirse con la cookie de
  sesión. El cliente la reenvía como `X-XSRF-TOKEN` en peticiones que cambian estado.
- En producción, la cookie debe ser `Secure` y `SameSite`, y el CORS restringido al origen real (pendiente de la
  fase de despliegue). El *driver* de sesión y su caducidad se revisarán en dicha fase.
- La validación de la autorización por recurso se completa cuando existan los endpoints de conversaciones
  (Tarea posterior); este ADR fija el **modelo** de autenticación y la base de autorización (`ConversationPolicy`).
- Cualquier cambio de mecanismo de autenticación o de librería debe pasar por la revisión de este ADR.

## Verificación (Tarea 05)

- Backend: suite PHPUnit (incluye `tests/Feature/Auth`) y `pint`.
- Frontend: `npm run lint`, `npm run build`, `npm run test:run`.
- Integración real verificada con la SPA (proxy Vite) + backend + MySQL: `csrf-cookie` 204 → `login` 200 →
  `me` 200 → credenciales inválidas 422 genérico → `logout` 204 → `me` 401.

## Verificación (auditoría TAREA 06A)

- Flujo completo reproducido a través del **proxy de Vite** (backend con SQLite temporal): origen de Vite inicia
  sesión; origen desconocido no la inicia (`me` 401); rotación del token CSRF en login y logout; y una cuenta
  desactivada con sesión viva recibe 401. Backend: `php artisan test` (62 pruebas, 1 omitida) y `pint`.
