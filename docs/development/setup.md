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

Comandos de verificación:

```bash
php artisan test          # suite PHPUnit (debe pasar)
./vendor/bin/pint --test  # estilo de código (no debe reportar)
```

## Frontend (React + Vite)

Node 24 (ver `.nvmrc`).

```bash
cd frontend
npm install
npm run dev        # servidor de desarrollo
```

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
cd frontend && npm run dev         # SPA en http://localhost:5173
```

> La comunicación entre frontend y backend (y el CORS en desarrollo) es una tarea posterior a los primeros endpoints; hoy las dos aplicaciones corren por separado.

## Notas de reproducibilidad

- `composer.lock` y `package-lock.json` están versionados.
- `composer.json` fija `config.platform.php=8.4.0` para resolver dependencias contra PHP 8.4.
- El frontend usa `save-exact=true` y valida `engines` de Node (`.npmrc`).
- Node 24 pasa a mantenimiento el 20-oct-2026 (EOL 2028): revisar el pin en ese hito.

## Pendiente

- Comunicación front↔back y CORS de desarrollo.
- Modelo de datos, migraciones y módulos de negocio.
- Validación de Meta (ver [`docs/integrations/meta-integration-pending.md`](../integrations/meta-integration-pending.md)).