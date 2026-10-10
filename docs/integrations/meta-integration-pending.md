# Integración con Meta — pendiente obligatorio

> **Estado:** BLOQUEANTE para conectar el número empresarial real. No es un impedimento para construir y probar los módulos internos con datos ficticios.

## Decisión vigente

**La integración del número empresarial real de WhatsApp está bloqueada hasta completar y revisar esta validación.** Mientras tanto:

- No se conecta el número real.
- No se envían mensajes reales.
- No se solicitan, inventan ni exponen credenciales de Meta.
- No se marca como terminada la integración.
- Sí se pueden desarrollar: módulos internos, contratos, pruebas y adaptadores simulados claramente identificados como simulación.

## Preguntas aún sin confirmar

No están confirmados, entre otros:

- La causa exacta de los errores reportados por el cliente (evidencia requerida).
- Si existe una obligación real de migrar desde WhatsApp Business convencional.
- El modelo de integración: directo con Meta, proveedor externo u otra modalidad.
- La titularidad y administración de los activos empresariales y del número.
- Los permisos, cuenta empresarial, requisitos de onboarding y credenciales necesarios.
- Los precios, límites y condiciones vigentes de Meta y/o del proveedor.
- El procedimiento de configuración y verificación de webhooks.
- La responsabilidad operativa y económica de Positive y del cliente.

No se presentan como hechos las afirmaciones del cliente (p. ej., una migración forzada) ni se asumen cuotas gratuitas o precios no comprobados.

## Validaciones pendientes (checklist)

- [ ] Diagnosticar el error real reportado por el cliente y obtener evidencia.
- [ ] Confirmar si existe una necesidad real de migración desde WhatsApp Business convencional.
- [ ] Elegir el modelo de integración: directo, proveedor externo u otra modalidad viable.
- [ ] Confirmar titularidad y administración de los activos empresariales (cuenta, número).
- [ ] Confirmar permisos, cuenta empresarial y requisitos de onboarding.
- [ ] Verificar precios, límites y condiciones vigentes de Meta y/o del proveedor.
- [ ] Definir cómo se administrarán y protegerán los tokens (nunca en texto plano).
- [ ] Diseñar y verificar la recepción de webhooks (mecanismo oficial del proveedor).
- [ ] Probar envío y recepción con un número de prueba antes que el número real.
- [ ] Definir manejo de estados, errores, reintentos e idempotencia de eventos.
- [ ] Confirmar qué tareas y costos corresponden a Positive y cuáles al cliente.

## Regla operativa

Antes de integrar el número real: confirmar que este archivo está actualizado, las decisiones pendientes fueron revisadas y autorizadas, y el adaptador real se probó en un entorno de prueba. No eliminar ni ocultar este bloqueo.