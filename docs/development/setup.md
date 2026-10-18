# Setup del entorno de desarrollo

> **Estado:** verificado en esta máquina (Linux Mint 22.3 / Ubuntu 24.04) el 2026-10-10. Instrucciones para un Linux basado en Debian/Ubuntu.

## Requisitos mínimos

| Herramienta | Versión | Cómo verificar |
|---|---|---|
| PHP (CLI) | 8.4.x | `php -v` |
| Composer | 2.10.x | `composer --version` |
| Laravel installer | cualquiera reciente | `laravel --version` |
| Node.js | 24 (ver `.nvmrc`) | `node --version` |
| npm | 11.x | `npm --version` |
| Docker + Compose | 29 / 2.40+ | `docker info`, `docker compose version` |
| Extensiones PHP | ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, pdo_mysql, pdo_sqlite, session, tokenizer, xml, zip | `php -m` |

## Instalación desde cero (sin sudo)

PHP, Composer y Laravel installer se instalan a nivel de usuario con el instalador oficial recomendado por Laravel:

```bash
/bin/bash -c "$(curl -fsSL https://php.new/install/linux/8.4)"
# cerrar y reabrir la terminal (o: source ~/.bashrc)
composer self-update --2   # Composer a la línea vigente 2.10.x
```

- Instala en `~/.config/herd-lite/bin` y añade esa ruta al `PATH` del usuario. No modifica el sistema.
- Desinstalación: ejecutar `~/.config/herd-lite/bin/uninstall_herd_lite`.

Node.js 24: verificar instalación (`node --version`). En esta máquina ya estaba disponible. Si se quiere fijar con nvm, el repo incluye `.nvmrc` (24.19.0).

## Base de datos (solo desarrollo)

Las credenciales residen en el `.env` de la raíz (**no versionado**). La plantilla está en `.env.example`.

```bash
# Primera vez y cada vez que se quiera levantar la base de datos
docker compose up -d --wait
docker compose ps   # el contenedor debe aparecer "healthy"
```

El contenedor MySQL 8.4 escucha únicamente en `127.0.0.1:3306`.

Detener:

```bash
docker compose stop
```

Para regenerar credenciales (dev): editar `.env` con valores aleatorios:

```bash
openssl rand -hex 24   # generar un valor
```

> Advertencia: no editar `.env.example`, es la plantilla pública; los valores reales van siempre en `.env`.

## Backend (Laravel)

Requisitos del entorno verificados arriba (PHP 8.4, Composer 2.10, MySQL arriba).

```bash
export PATH="$HOME/.config/herd-lite/bin:$PATH"   # si el shell no lo heredó

cd backend
composer install
cp .env.example .env          # en la primera vez
chmod 600 .env
php artisan key:generate
php artisan migrate
php artisan serve
```

- El `.env` del backend apunta a MySQL con los mismos valores que `.env` de la raíz (`DB_HOST=127.0.0.1`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).
- Las pruebas usan SQLite en memoria (configuración por defecto de `phpunit.xml`); no requieren la base MySQL levantada.

### Autenticación: variables de entorno necesarias

La SPA se comunica con la API mediante un *proxy* de Vite (mismo origen en `http://localhost:5173`). Para que la
sesión *stateful* de Sanctum funcione, el `.env` del **backend** debe incluir el origen del frontend en al menos una
de estas variables (plantilla en `.env.example`):

```dotenv
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> Sin `localhost:5173` en `SANCTUM_STATEFUL_DOMAINS`, el login responde 200 pero **no persiste sesión** (`/auth/me`
> devuelve 401): la petición no se trata como *stateful*. `config/sanctum.php` incluye `localhost:5173` y
> `127.0.0.1:5173` en el valor por defecto para que el flujo funcione aunque el `.env` no defina la variable, pero en
> **producción** debe fijarse explícitamente al origen real. Detalle en
> [ADR-004](../decisions/ADR-004-authentication-sanctum.md).

### Usuarios de desarrollo (seed opcional)

El seeder solo actúa en entorno `local` y requiere contraseñas por variable de entorno (no hay credenciales en el
repositorio). Ejemplo:

```bash
cd backend
DEV_SEED_ADMIN_PASSWORD='<valor-de-desarrollo>' \
DEV_SEED_AGENT_PASSWORD='<valor-de-desarrollo>' \
php artisan db:seed
```

Crea un `admin` y un `agent` con emails ficticios (`admin@positive.local` / `agent@positive.local`). No usar estos
valores en producción.

Comandos de verificación:

```bash
php artisan test          # suite PHPUnit (debe pasar)
./vendor/bin/pint --test  # estilo de código (no debe reportar)
```

## Frontend (React + Vite + Material UI)

Node 24 (ver `.nvmrc`).

```bash
cd frontend
npm install
npm run dev        # servidor de desarrollo (SPA en http://localhost:5173)
```

La SPA exige iniciar sesión: muestra **`/login`** mientras no haya sesión y, tras autenticarse, la bandeja **`/inbox`**, que consume la read API real (solo lectura). El tema (Material UI) y el layout están en [ADR-003](../decisions/ADR-003-frontend-foundation.md); la autenticación en [ADR-004](../decisions/ADR-004-authentication-sanctum.md); la integración del Inbox en [ADR-006](../decisions/ADR-006-frontend-inbox-read-integration.md).

En desarrollo, Vite reenvía `/api` y `/sanctum` a `http://localhost:8000` (configurado en `frontend/vite.config.ts`), de modo que el frontend y el backend comparten origen y las cookies de sesión de Sanctum funcionan sin CORS abierto.

Comandos de verificación:

```bash
npm run build      # compilación de producción (incluye typecheck)
npm run lint       # oxlint (sin errores)
npm run test:run   # Vitest (una pasada, debe pasar)
```

## Flujo de trabajo usual

```bash
docker compose up -d --wait        # base de datos
cd backend && php artisan serve    # API en http://localhost:8000 (o puerto configurado)
cd frontend && npm run dev         # SPA en http://localhost:5173 (proxy /api y /sanctum → 8000)
```

> La SPA consume la API a través del *proxy* de Vite y autentica con cookies de sesión *stateful* de Sanctum. En
> desarrollo requiere `SANCTUM_STATEFUL_DOMAINS` en el `.env` del backend (ver arriba).

## Notas de reproducibilidad

- `composer.lock` y `package-lock.json` están versionados.
- `composer.json` fija `config.platform.php=8.4.0` para resolver dependencias contra PHP 8.4.
- El frontend usa `save-exact=true` y valida `engines` de Node (`.npmrc`).
- Node 24 pasa a mantenimiento el 20-oct-2026 (EOL 2028): revisar el pin en ese hito.

## Pendiente

- Mensajería saliente y operaciones de escritura (asignación, cambios de estado). El **modelo de datos** ya está
  implementado (`php artisan migrate` crea las tablas del MVP, Tarea 03). El **frontend** tiene tema, layout y la
  bandeja conectada en **solo lectura** al read API (Tareas 04 y 07); la **autenticación** está implementada de
  extremo a extremo con Sanctum y *proxy* de Vite (Tarea 05). La UI no pagina más allá de la primera página.
- Registro de usuarios, restablecimiento de contraseña y UI de administración de usuarios (fuera de la Tarea 05).
- `Secure`/`SameSite` de cookies y CORS restringido de **producción**; *driver* y caducidad de sesión (fase de despliegue).
- Validación de Meta (ver [`docs/integrations/meta-integration-pending.md`](../integrations/meta-integration-pending.md)).