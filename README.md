# Positive WhatsApp Platform

Plataforma web para que los empleados de una empresa gestionen de forma centralizada las conversaciones de un mismo número empresarial de WhatsApp.

## Estado del proyecto

Fase de **base técnica en curso**. Fotografía operativa del estado actual en [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md).

### Implementado

- **Backend (Tarea 03):** modelo de datos: migraciones, modelos Eloquent y pruebas de esquema, relaciones y restricciones en `backend/`.
- **Frontend (Tarea 04):** fundación de la SPA: tema centralizado MUI y layout responsive. Ver [ADR-003](docs/decisions/ADR-003-frontend-foundation.md).
- **Autenticación y autorización (Tarea 05):** login/logout/sesión con **Laravel Sanctum** (cookies de sesión SPA), roles `admin`/`agent`, autorización base y guarda de rutas en la SPA. Ver [ADR-004](docs/decisions/ADR-004-authentication-sanctum.md).
- **Read API de conversaciones y mensajes (Tarea 06B, aceptada):** endpoints `GET /api/v1/conversations`, `/conversations/{public_id}` y `/conversations/{public_id}/messages`, autenticados, autorizados y paginados, sin exponer campos internos. Ver [ADR-005](docs/decisions/ADR-005-read-api-conversations-messages.md).
- **Integración del Inbox con el read API (Tarea 07, solo lectura):** la bandeja `/inbox` consume conversaciones, detalle y mensajes reales, con estados de carga/vacío/error, reintento y manejo central de 401. Sin datos ficticios en tiempo de ejecución. Ver [ADR-006](docs/decisions/ADR-006-frontend-inbox-read-integration.md).

### Pendiente

- **Escritura:** asignación/reasignación, cambios de estado y envío de mensajes (outbound) con su autorización.
- **Paginación en el Inbox:** el listado consume solo la primera página; el historial permite cargar mensajes anteriores. Faltan controles de página siguiente para el listado y filtros.
- **Integración entrante real:** webhook y proveedor externo de WhatsApp/Meta (bloqueado, ver más abajo).
- **Tiempo real:** realtime/polling/WebSockets.
- Registro público, restablecimiento de contraseña y UI de administración de usuarios.
- Configuración de producción (cookies `Secure`/`SameSite`, HTTPS, CORS) y despliegue.

### Fuera de alcance actual

- WhatsApp/Meta y Telegram;
- envío de mensajes y cualquier operación de escritura;
- polling, WebSockets/Reverb/realtime;
- infraestructura nueva (Redis, colas, Docker, Nginx).

No hay integración externa real ni operaciones de escritura aunque aparezcan documentadas como diseño.

El **diseño técnico** del MVP (modelo de datos, estados y permisos) está documentado en `docs/architecture/` y `docs/security/`. El modelo de datos ya está materializado.

> **Integración con Meta: pendiente y bloqueante.** No se conectará el número empresarial real, no se enviarán mensajes reales ni se solicitarán credenciales hasta completar la validación descrita en [`docs/integrations/meta-integration-pending.md`](docs/integrations/meta-integration-pending.md).

## Stack

| Capa | Tecnología | Versión documentada |
|---|---|---|
| Frontend | React + TypeScript (Vite), Material UI, React Router | React 19, Vite 8 — ver [ADR-002](docs/decisions/ADR-002-development-toolchain.md) y [ADR-003](docs/decisions/ADR-003-frontend-foundation.md) |
| Backend | Laravel + PHP | Laravel 13, PHP 8.4 |
| Base de datos | MySQL | 8.4 LTS (dev en contenedor Docker) |
| Comunicación | API REST versionada (Sanctum, cookies de sesión SPA) | `/api/v1` — ver [ADR-004](docs/decisions/ADR-004-authentication-sanctum.md) |
| Procesamiento asíncrono | Colas de Laravel | cuando corresponda |

La matriz completa de versiones y sus motivos está en [ADR-002](docs/decisions/ADR-002-development-toolchain.md).

## Estructura

```text
.
├── backend/          # Laravel (API)
├── frontend/         # React + TypeScript (SPA)
├── docs/
│   ├── architecture/ # visión arquitectónica
│   ├── decisions/    # ADRs
│   ├── development/  # setup y entorno
│   ├── security/     # línea base de seguridad
│   ├── testing/      # estrategia de pruebas
│   └── integrations/ # estado de integración con Meta
├── compose.yaml      # solo MySQL para desarrollo local
├── .env              # credenciales dev (NO versionado)
└── .env.example      # plantilla sin secretos
```

## Documentación

- [Estado del proyecto (fotografía operativa)](docs/PROJECT-STATUS.md)
- [Arquitectura](docs/architecture/overview.md)
- [Modelo de datos](docs/architecture/data-model.md)
- [Máquinas de estados](docs/architecture/state-machines.md)
- [Decisiones de diseño pendientes](docs/architecture/design-decisions-pending.md)
- [Matriz de permisos](docs/security/permission-matrix.md)
- [Decisiones (ADRs)](docs/decisions/)
- [Configuración del entorno](docs/development/setup.md)
- [Seguridad](docs/security/security-baseline.md)
- [Estrategia de pruebas](docs/testing/testing-strategy.md)
- [Estado de la integración con Meta](docs/integrations/meta-integration-pending.md)

## Comandos rápidos

El procedimiento completo verificable está en [`docs/development/setup.md`](docs/development/setup.md).

```bash
# Base de datos (dev, solo esta máquina)
docker compose up -d --wait

# Backend (requiere PHP/Composer, ver setup.md)
cd backend && composer install && php artisan serve

# Frontend (requiere Node 24)
cd frontend && npm install && npm run dev
```

## Reglas para agentes de IA

Toda tarea de desarrollo debe seguir [`AGENTS.md`](AGENTS.md).