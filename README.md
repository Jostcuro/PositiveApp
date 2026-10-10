# Positive WhatsApp Platform

Plataforma web para que los empleados de una empresa gestionen de forma centralizada las conversaciones de un mismo número empresarial de WhatsApp.

## Estado del proyecto

Fase de **preparación del repositorio y entorno de desarrollo** (Tarea 01). Todavía **no** existen módulos funcionales (contactos, conversaciones, mensajería, autenticación ni integración con WhatsApp).

> **Integración con Meta: pendiente y bloqueante.** No se conectará el número empresarial real, no se enviarán mensajes reales ni se solicitarán credenciales hasta completar la validación descrita en [`docs/integrations/meta-integration-pending.md`](docs/integrations/meta-integration-pending.md).

## Stack

| Capa | Tecnología | Versión documentada |
|---|---|---|
| Frontend | React + TypeScript (Vite) | React 19, Vite 8 — ver [ADR-002](docs/decisions/ADR-002-development-toolchain.md) |
| Backend | Laravel + PHP | Laravel 13, PHP 8.4 |
| Base de datos | MySQL | 8.4 LTS (dev en contenedor Docker) |
| Comunicación | API REST versionada | `/api/v1` |
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