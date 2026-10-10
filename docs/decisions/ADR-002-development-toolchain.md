# ADR-002 — Toolchain y versiones del entorno de desarrollo

- **Estado:** Aceptado
- **Fecha:** 2026-10-10
- **Decisión relacionada:** [ADR-001 — Arquitectura inicial del MVP](ADR-001-initial-architecture.md)

## Contexto

Se necesita un entorno de desarrollo reproducible y con versiones soportadas. El sistema operativo es Linux Mint 22.3 (basado en Ubuntu 24.04 / "noble"). Al iniciar no había PHP, Composer ni MySQL instalados; había Node.js 24.19.0, npm 11.17.0 y Docker 29/Compose 2.40 disponibles y operativos.

## Versiones elegidas y motivo

| Componente | Versión | Motivo |
|---|---|---|
| PHP | **8.4.1** (vía `php.new`, user-level en `~/.config/herd-lite/bin`) | Soporte oficial de Laravel 13 (8.3–8.5). PHP 8.4 es la versión recomendada para Laravel 13 en 2026; deja margen frente a paquetes que ya circulan exigiendo 8.4. Instalación a nivel de usuario: sin cambios de sistema, sin sudo, reversible. |
| Composer | **2.10.3** | Línea soportada actual. El Composer 2.8.12 que trae `php.new` es EOL desde nov-2025; se actualizó con `composer self-update --2`. |
| Laravel | **13** (`laravel/laravel:^13.0`) | Versión estable actual (mar-2026), soporte de bugfixes hasta Q3 2027 y seguridad hasta Q1 2028. Usa Symfony 7.3, no Symfony 8 (que exigiría PHP 8.4); el soporte 8.3–8.5 es oficial. |
| MySQL (dev) | **8.4 LTS** (`mysql:8.4`, contenedor Docker) | LTS vigente, acorde a un despliegue futuro; evita una instalación de sistema y un servicio siempre activo. Solo escucha en `127.0.0.1`. |
| Node.js | **24.19.0** (pin en `.nvmrc`) | Active LTS (Krypton); soportado hasta 2028. El pin se revisará cuando pase a maintenance (20-oct-2026) o si la toolchain lo exige. |
| React | **19.3.0** | Versión estable actual de React. |
| Vite | **8.3.4** (Rolldown/Oxc) | Línea oficial estable actual de Vite; `@vitejs/plugin-react` 6 usa Oxc. Toolchain joven: riesgo mitigado con lockfile y pin exacto. |
| TypeScript | **6.0.3, `strict: true`** | Configuración del template `react-ts`; se activó `strict` explícitamente (la versión por defecto del template no lo traía). |
| Pruebas backend | **PHPUnit 12** | Framework por defecto de Laravel 13; cero configuración adicional. |
| Pruebas frontend | **Vitest 5.0.3 + @testing-library/react 16.3.3 + @testing-library/jest-dom 7.0.1 + jsdom 30.1.2** | Framework estándar del ecosistema Vite; compatible con Node 24. |
| Lint/format | **oxlint 1.87.0** (frontend), **Pint** (backend) | El template oficial `react-ts` de create-vite 9 usa oxlint en lugar de ESLint; se conserva lo que provee el tooling oficial. |

## Aclaraciones que evitan un error anterior

Durante el análisis se descartó un riesgo falso: se había difundido que "Laravel 13.3+ necesita PHP 8.4 en la práctica". Es falso: **Symfony 8 exige PHP 8.4**, pero Laravel 13 fija componentes **Symfony 7.3**; por tanto PHP 8.3 sigue siendo soporte oficial de Laravel 13. Se eligió PHP 8.4 por margen futuro, no por necesidad.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| PHP 8.3 del sistema (apt) + MySQL del sistema | Instalación global de máquina (contradice reglas del repositorio), Composer 2.7.1 EOL, MySQL 8.0 divergente del LTS y servicio siempre activo. |
| Todo en contenedores (PHP+Node+MySQL) | Más infraestructura de la necesaria en esta fase; el contenedor es útil para la base de datos, pero preferimos PHP/Node nativos para desarrollo ágil con verificación directa de versiones. |
| MariaDB en lugar de MySQL | No es el stack acordado del proyecto. |
| Pest en lugar de PHPUnit | Opción válida a futuro; sin necesidad ahora. |

## Consecuencias

- La máquina de desarrollo no requiere `sudo` para PHP/Composer/Laravel installer; solo docker (para la base de datos) es infraestructura de contenedores y está justificada y documentada.
- Los lockfiles (`composer.lock`, `package-lock.json`) y los pins (`composer.json` platform, `save-exact`) dan reproducibilidad.
- Cualquier cambio de versión debe pasar por una revisión de este ADR.