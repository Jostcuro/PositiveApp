# Positive WhatsApp Platform

Plataforma web para que los empleados de una empresa gestionen de forma centralizada las conversaciones de un mismo número empresarial de WhatsApp.

## Estado del proyecto

Fase de **base técnica en curso**:

- **Backend (Tarea 03):** modelo de datos implementado: migraciones, modelos Eloquent y pruebas de esquema, relaciones y restricciones en `backend/`.
- **Frontend (Tarea 04):** fundación implementada: tema centralizado MUI, layout responsive y pantalla de demostración de la bandeja de conversaciones (`/inbox`) con datos ficticios. Ver [ADR-003](docs/decisions/ADR-003-frontend-foundation.md).
- **Autenticación y autorización (Tarea 05):** login/logout/sesión con **Laravel Sanctum** (cookies de sesión SPA), roles `admin`/`agent`, autorización base y guarda de rutas en la SPA. Ver [ADR-004](docs/decisions/ADR-004-authentication-sanctum.md).

Todavía **no** existen los módulos de negocio (gestión de contactos/conversaciones, mensajería ni integración con WhatsApp). No hay registro público, restablecimiento de contraseña ni UI de administración de usuarios. El envío de mensajes en la bandeja está deshabilitado hasta conectar backend e integración.

El **diseño técnico** del MVP (modelo de datos, estados y permisos) está documentado en `docs/architecture/` y `docs/security/`. El modelo de datos ya está materializado; los estados y permisos se aplicarán con la lógica de negocio y la autorización.

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