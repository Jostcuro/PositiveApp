# Arquitectura — Visión general

> **Estado:** inicial. Describe el diseño acordado para el MVP y los efectos que se conocen hoy. Se revisará y actualizará en cada tarea que introduzca un módulo.

## Contexto

Positive gestiona de forma centralizada las conversaciones de un único número empresarial de WhatsApp atendidas por un equipo de 3–10 empleados. La plataforma es una aplicación web con una interfaz de atención compartida, asignación de responsables, historial de mensajes, estados de conversación, roles y registros de auditoría.

## Responsabilidad del frontend

- SPA en React + TypeScript.
- Presentación e interacción del usuario (atención de conversaciones).
- No contiene lógica de negocio ni decisiones de autorización: toda acción protegida se valida en el backend.
- Se comunica con el backend únicamente mediante la API REST bajo `/api/v1`.

## Responsabilidad del backend

- Laravel + PHP como monolito modular.
- Lógica de negocio, validación, autorización, persistencia y orquestación.
- Expone contratos explícitos versionados bajo `/api/v1`.
- Coordina el procesamiento asíncrono mediante colas de Laravel cuando la tarea lo requiera.
- No depende de detalles de proveedores externos de mensajería (ver "Separación de la integración externa").

## Comunicación

- API REST versionada bajo `/api/v1`.
- Contratos de solicitud/respuesta explícitos y coherentes entre frontend y backend.
- Formato de error consistente y sin filtrado de detalles internos.
- La configuración de CORS en desarrollo es una tarea pendiente hasta que existan endpoints reales; en esta fase el frontend y el backend **no se comunican todavía**.

## Base de datos

- MySQL 8.4 LTS.
- En desarrollo local corre en un contenedor Docker (ver [setup](../development/setup.md)) para reproducibilidad y evitar instalaciones de sistema.
- Las migraciones, relaciones, índices, unicidad y restricciones se definirán cuando se apruebe el modelo de datos (tarea posterior), no en el scaffold actual.

## Principio de monolito modular

- Un único despliegue para el MVP (un backend, una base de datos).
- Separación por responsabilidades dentro de la aplicación según la complejidad real: presentación, aplicación, dominio e infraestructura.
- No se implementan microservicios.

## Separación de la integración externa

- La lógica de negocio debe comunicarse con un **adaptador de proveedor** para las operaciones de WhatsApp (`sendMessage`, verificación de webhooks, parseo de eventos, estado de mensajes, etc.).
- El dominio no depende de detalles de Meta ni de un proveedor externo.
- Durante el desarrollo interno se permite un adaptador simulado, explícitamente identificado como simulación y nunca presentado como integración real.

## Uso previsto de colas

- Tareas asíncronas bajo Laravel cuando sea necesario (procesamiento de webhooks, envíos, estados).
- Se introducirán cuando haya una necesidad concreta; no se preconfigura infraestructura de colas en esta fase.

## Límites del MVP

- Una empresa, un número, 3–10 empleados.
- Sin multitenencia completa.
- Sin automatizaciones conversacionales de IA.
- Integraciones adicionales solo si están aprobadas.

## Riesgos arquitectónicos conocidos

- **Integración con Meta sin validar:** bloquea el número real y obliga a la capa de adaptador desde el inicio. Ver [meta-integration-pending](../integrations/meta-integration-pending.md).
- **Jóvenes del backend y toolchain:** Laravel 13 y Vite 8/Rolldown son líneas recientes; el pin exacto de versiones y los lockfiles mitigan la deriva.
- **Riesgo de evolución a SaaS:** se evita acoplar a una única empresa hasta que la multitenencia sea requisito aprobado, pero se evitan dependencias que lo impidan.
- **Concurrencia y eventos externos:** el procesamiento de webhooks debe diseñarse tolerante a duplicados y reintentos (tarea posterior).

## Evolución futura (no implementada hoy)

- Multitenencia, microservicios, flotas de números, integraciones adicionales: **descartados o diferidos** hasta decisión explícita. Esta arquitectura no bloquea su incorporación posterior.