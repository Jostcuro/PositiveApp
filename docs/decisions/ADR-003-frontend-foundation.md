# ADR-003 — Fundación del frontend: Material UI, enrutado y datos de demostración

- **Estado:** Aceptado
- **Fecha:** 2026-10-11
- **Decisión relacionada:** [ADR-001 — Arquitectura inicial del MVP](ADR-001-initial-architecture.md), [ADR-002 — Toolchain y versiones del entorno de desarrollo](ADR-002-development-toolchain.md)

## Contexto

El frontend de Positive (React 19 + TypeScript, Scaffold `create-vite react-ts`) existe y ya tiene decididas las versiones de la toolchain (ADR-002). Falta definir la capa de UI y enrutado sobre la que se construirán las pantallas de atención. El MVP necesita una interfaz sencilla y de bajo acoplamiento para que varios empleados atiendan conversaciones desde una vista compartida, sin introducir ahora dependencias de estado global, consultas a API ni formularios complejos.

Esta fundación no debe anticipar decisiones de contrato (cómo se llamará la API, qué campos expone), así que la primera pantalla se construye sobre **datos ficticios marcados como demostración**.

## Decisión

- **Librería de componentes:** Material UI (`@mui/material` 9.5.0) con Emotion (`@emotion/react` 11.14.0, `@emotion/styled` 11.14.1). Emotion se instala como dependencia directa porque, aunque MUI 9 lo marca como peer opcional, los componentes estilizados de la app lo usan y declara explícitamente.
- **Iconos:** `lucide-react` 1.55.0 (conjunto ligero de iconos SVG, sin arrastrar `@mui/icons-material`).
- **Enrutado:** `react-router-dom` 7.18.4 con `createBrowserRouter`. Rutas: `/` (redirige a `/inbox`), `/inbox` (bandeja) y captura `*` (página 404).
- **Tema centralizado:** un único objeto de tema MUI en `src/theme.ts` (paleta definida, `borderRadius: 8`, tipografía de sistema). Se aplica con `ThemeProvider` + `CssBaseline` en `main.tsx`.
- **Layout responsive:** AppBar fija + Drawer permanente ≥ `md` y temporal con menú hamburguesa en móvil. La bandeja muestra 1, 2 o 3 paneles según el ancho (lista sola en móvil, lista+historial en tablet, + panel de contacto en `lg`).
- **Datos de demostración:** `src/data/mockConversations.ts` expone conversaciones ficticias con el tipo de datos previsto (`Conversation`, `ConversationMessage`, `ConversationStatus`, `MessageDirection`). Estos datos son simulados y en ningún caso se envían ni se presentan como reales.
- **Envío de mensajes deshabilitado:** el compositor está deshabilitado con la leyenda «Pendiente de integración»; coincide con el bloqueo de Meta y con que aún no existen endpoints.
- **Autorización solo en extremo posterior:** se mantiene la regla de que ocultar/botonería no constituye autorización. Los botones administrativos que se muestren o inhabiliten en la UI no sustituyen la validación backend.

### No se decidió (explícitamente fuera de esta tarea)

- No se instalan `@tanstack/react-query`, `react-hook-form` ni `zod`: se evalúan cuando existan contratos de API reales.
- No se decide el esquema de navegación definitivo de la aplicación; la bandeja es la pantalla de demostración inicial.
- No se implementa autenticación ni manejo de sesión en el frontend todavía.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Tailwind CSS | Stack no acordado en el proyecto; MUI cubre los componentes y el tema sin añadir tooling de estilos. |
| CSS puro / módulos CSS | Reutilizable hasta cierto punto, pero sin sistema de componentes consistente para la densidad de UI de una bandeja de conversaciones. |
| `@mui/icons-material` | El conjunto es grande y ensucia el bundle; `lucide-react` es suficiente para el juego de iconos actual. |
| `@tanstack/react-query` desde el inicio | Necesidad aún hipotética; introduce concepto de estado de servidor sin contratos de API definidos. |

## Consecuencias

- El frontend queda con un tema y layout centralizados y una ruta de ejemplo navegable (`/inbox`) con datos de demostración, verificable con `npm run build`, `npm run lint` y `npm run test:run`.
- El bundle de producción supera el umbral por defecto de 500 kB (Material UI): se observa con aviso en `vite build` y se contemplará code-splitting por rutas cuando la app agregue pantallas.
- Cuando existan contratos de API, los datos ficticios se sustituirán por una capa de datos real manteniendo los tipos de dominio.
- Cualquier cambio de librería o versión debe pasar por una revisión de este ADR.