# Estrategia de pruebas

> **Estado:** marcos elegidos y verificación básica implementada (Tarea 01). Las prioridades por módulo se concretarán en cada tarea.

## Marcos

| Capa | Marco | Notas |
|---|---|---|
| Backend | **PHPUnit 12** | Por defecto en Laravel 13; ejecutar con `php artisan test`. Las pruebas usan SQLite en memoria (configuración por defecto). |
| Frontend | **Vitest 5 + @testing-library/react + @testing-library/jest-dom + jsdom** | Ejecutar con `npm run test:run`; los tests que renderizan usan Testing Library y `jest-dom`. Sin servicios externos. |

## Prioridades

1. Lógica de negocio (asignación, estados, transiciones).
2. Autenticación y autorización (incluye permisos denegados y mínimo privilegio).
3. Validación y normalización de entradas (casos válidos, errores y entradas malformadas).
4. Transiciones de estado e idempotencia (mensajería y webhooks).
5. Contratos de API (códigos HTTP y formato de error consistente).

## Reglas

- **Datos ficticios:** nunca datos personales reales en pruebas.
- **Sin servicios externos** en pruebas unitarias: se usan dobles de prueba.
- **Mensajería:** se prueba contra un adaptador simulado, explícitamente identificado; los estados "enviado/entregado/leído" no se marcan sin evidencia del adaptador/proveedor correspondiente.
- **Pendiente:** cobertura de componentes de UI, contratos de integración y pruebas de concurrencia, según se avance en los módulos.