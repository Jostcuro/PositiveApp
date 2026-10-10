# ADR-001 — Arquitectura inicial del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-10-10
- **Decisión relacionada:** [ADR-002 — Toolchain y versiones](ADR-002-development-toolchain.md)

## Contexto

El producto requiere gestionar centralizadamente las conversaciones de un número empresarial de WhatsApp, atendidas por un equipo reducido. Los requisitos del MVP son: una empresa, un número, una interfaz web compartida, contactos/conversaciones, estados, historial, roles y auditoría. La integración con Meta aún no está validada, por lo que la lógica de negocio no puede acoplarse a un proveedor concreto.

## Decisión

- **Monolito modular** para el MVP: un despliegue, separación interna por responsabilidad real.
- **API REST versionada bajo `/api/v1`** con contratos explícitos entre frontend y backend.
- **Frontend** React + TypeScript; **backend** Laravel + PHP; **base de datos** MySQL.
- **Integración de mensajería desacoplada** mediante un adaptador de proveedor: el dominio no depende de Meta ni de un proveedor externo.
- **Colas de Laravel** para procesamiento asíncrono cuando exista una necesidad concreta.
- **No** se implementan multitenencia ni microservicios en esta etapa; se evita acoplar el diseño a impedirlos en el futuro.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Microservicios desde el inicio | Complejidad y coste operativo sin necesidad para un MVP de una empresa y un número. |
| Acoplar la lógica a Meta/WhatsApp Business Platform | La validación de Meta está pendiente; cualquier acoplamiento temprano bloquearía el desarrollo de los módulos internos y la opción de proveedor externo. |
| Multitenencia completa ahora | No es requisito del MVP; introduce escalas que hoy no existen. Se mantiene la posibilidad de evolución sin implementarla. |
| Backend sin capa de adaptador (código de infraestructura en el dominio) | Violaría la separación de responsabilidades y dificultaría pruebas con adaptador simulado. |

## Consecuencias

- El scaffold actual debe dejar preparada la separación frontend/backend y la ruta de la API `/api/v1`.
- La capa de adaptador de mensajería se definirá formalmente cuando se concrete (Tarea del adaptador simulado), pero el dominio nunca dependerá de ella.
- Las decisiones sobre el **modelo de datos**, los **estados/transiciones** y la **matriz de permisos** quedan como tareas posteriores y pueden añadir ADRs cuando se aprueben.