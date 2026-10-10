# AGENTS.md — Positive WhatsApp Platform

## 1. Propósito de este archivo

Este archivo proporciona el contexto, las restricciones y las reglas de ingeniería que deben seguir los agentes de IA que trabajen en este repositorio.

Antes de planificar o modificar código:
1. Lee este archivo completo.
2. Inspecciona la estructura y el estado actual del repositorio.
3. Lee las instrucciones locales aplicables a las carpetas en las que vas a trabajar.
4. Comprueba la documentación relevante y las versiones reales de las herramientas.
5. Identifica supuestos, riesgos y dependencias pendientes antes de hacer cambios.

Estas instrucciones son reglas de trabajo del proyecto. No sustituyas requisitos confirmados por suposiciones propias. Si una instrucción local entra en conflicto con este archivo, informa del conflicto y sigue las instrucciones de mayor prioridad aplicables al entorno.

## 2. Visión del producto

Positive está construyendo una plataforma web para que los empleados de una empresa puedan gestionar de forma centralizada las conversaciones de un mismo número empresarial de WhatsApp.

El problema de negocio es permitir que varios empleados atiendan conversaciones desde una interfaz compartida, con asignación de responsables, historial, estados y controles de acceso.

### Alcance inicial del MVP

- Una empresa.
- Un número empresarial de WhatsApp.
- Aproximadamente entre 3 y 10 empleados.
- Una interfaz web para gestionar conversaciones.
- Contactos y conversaciones.
- Asignación de conversaciones a empleados.
- Estados de conversación.
- Historial de mensajes y estados de entrega disponibles a través de la integración.
- Autenticación y autorización por roles.
- Registro de acciones relevantes.
- Integración futura con WhatsApp Business Platform mediante mecanismos oficiales.

El objetivo inmediato es construir una base segura y mantenible y desarrollar gradualmente los módulos internos. No intentes implementar toda la plataforma en una sola tarea.

### Fuera del alcance inicial

- Multitenencia completa.
- Microservicios.
- Automatizaciones avanzadas o agentes conversacionales de IA.
- Integraciones adicionales no aprobadas.
- Funcionalidades que no estén justificadas por los requisitos del MVP.

El producto podría convertirse en un SaaS para varias empresas en el futuro. Ten presente esa posibilidad al evitar acoplamientos innecesarios, pero no implementes multitenencia antes de que se apruebe como requisito.

## 3. Stack tecnológico acordado

- **Frontend:** React + TypeScript.
- **Backend:** Laravel + PHP.
- **Base de datos:** MySQL.
- **Comunicación:** API REST versionada bajo `/api/v1`.
- **Procesamiento asíncrono:** colas de Laravel cuando la tarea lo requiera.
- **Integración de WhatsApp:** adaptador desacoplado del dominio y de los módulos de negocio.
- **Pruebas:** pruebas automatizadas para lógica crítica, API, permisos e integración.
- **Control de versiones:** Git.

Las versiones concretas deben seleccionarse según compatibilidad mutua, soporte vigente y documentación oficial. No inventes versiones instaladas: inspecciona el entorno y registra las versiones elegidas y sus motivos.

Docker, Nginx, Redis, CI/CD y otros componentes de infraestructura no son requisitos automáticos. Incorpóralos solo cuando resuelvan una necesidad concreta, sean compatibles con el entorno y su incorporación esté documentada.

## 4. Arquitectura y diseño

### Principios

- Utiliza un **monolito modular** para el MVP.
- Mantén responsabilidades claras entre presentación, aplicación, dominio e infraestructura, según la complejidad real.
- Prefiere soluciones simples, explícitas y fáciles de probar.
- Aplica SOLID y patrones de diseño cuando aporten valor real; evita abstraer por costumbre.
- Mantén la lógica de negocio independiente del proveedor de mensajería.
- Usa contratos explícitos entre frontend y backend.
- Versiona la API bajo `/api/v1`.
- Documenta decisiones arquitectónicas importantes mediante ADR (Architecture Decision Records).
- Evita duplicar lógica, configuración o documentación.
- No introduzcas dependencias, servicios o capas sin una justificación concreta.

### Integración desacoplada

La aplicación debe comunicarse con una interfaz/adaptador de proveedor para operaciones de WhatsApp. La lógica de negocio no debe depender directamente de detalles específicos de Meta o de un proveedor externo.

Los nombres de métodos como `sendMessage()`, `verifyWebhook()`, `parseWebhookEvent()` y `getMessageStatus()` son ejemplos conceptuales; adapta los contratos a la implementación real y documenta sus responsabilidades.

Durante el desarrollo interno se puede usar un adaptador simulado, claramente identificado como tal. La simulación no debe presentarse como una integración real ni mezclarse silenciosamente con producción.

## 5. Pendiente obligatorio: validación de Meta

**La integración del número empresarial real está bloqueada hasta completar y revisar la validación de Meta.**

Todavía no están confirmados:
- La causa exacta de los errores reportados por el cliente.
- Si existe una obligación real de migrar desde WhatsApp Business convencional.
- Si Positive integrará directamente con Meta o utilizará un proveedor externo.
- La titularidad y administración de los activos empresariales y del número.
- Los permisos, requisitos de onboarding y credenciales necesarios.
- Los precios, límites y condiciones vigentes de Meta o del proveedor.
- El procedimiento de configuración y verificación de webhooks.
- La responsabilidad operativa y económica de Positive y del cliente.

No presentes como hechos las afirmaciones del cliente sobre una migración forzada hasta verificarlas. No supongas que existe una cuota gratuita genérica de mensajes ni prometas precios no comprobados.

Mientras esta validación esté pendiente:
- No conectes el número empresarial real.
- No envíes mensajes reales.
- No solicites, inventes ni expongas credenciales.
- No marques como terminada la integración de Meta.
- Puedes desarrollar los módulos internos, contratos, pruebas y adaptadores simulados.

Antes de integrar el número real, confirma el estado de `docs/integrations/meta-integration-pending.md` y solicita revisión de las decisiones pendientes. Mantén ese archivo actualizado; no elimines ni ocultes el bloqueo.

## 6. Modelo funcional previsto

El diseño técnico contempla inicialmente entidades o conceptos equivalentes a:

- **Users:** empleados y administradores, con estado activo/inactivo y rol.
- **Contacts:** contactos con número normalizado en formato internacional E.164 y datos mínimos necesarios.
- **Conversations:** contacto, responsable asignado, estado y fechas relevantes.
- **Messages:** dirección, tipo, contenido cuando aplique, identificador externo, estado interno, estado del proveedor, errores y marcas de tiempo.
- **WhatsApp accounts:** metadatos de la conexión y del número, sin guardar tokens en texto plano.
- **Webhook events:** eventos recibidos, estado de procesamiento, intentos y marcas de tiempo.
- **Audit logs:** acciones relevantes de usuarios y del sistema.

Esto es un punto de partida conceptual, no un esquema definitivo. Antes de crear migraciones, revisa las relaciones, restricciones, índices, unicidad, retención, concurrencia y necesidades de consulta. Documenta los cambios y sus motivos.

Los estados de conversación, mensajes y eventos deben definirse explícitamente. Evita transiciones inválidas y diseña el procesamiento de eventos externos para tolerar duplicados, reintentos y fallos.

## 7. Roles y autorización

Los roles iniciales previstos son:

- **Admin:** administra usuarios y configuración permitida y puede supervisar las conversaciones según las reglas que se aprueben.
- **Agent:** atiende conversaciones y realiza las acciones que su matriz de permisos autorice.

Estos roles son preliminares hasta aprobar una matriz de permisos. No asumas que ocultar un botón en el frontend constituye autorización. Toda acción protegida debe validarse en el backend.

Aplica el principio de mínimo privilegio y comprueba permisos en cada endpoint relevante. Registra las acciones administrativas y otras operaciones sensibles según la política de auditoría acordada.

## 8. Seguridad obligatoria

La seguridad debe diseñarse desde el inicio, no añadirse al final.

- No guardes secretos, tokens, contraseñas ni claves privadas en el repositorio.
- No expongas valores sensibles en mensajes de error, logs, capturas o documentación.
- Utiliza variables de entorno y archivos de ejemplo sin credenciales reales.
- No leas ni imprimas archivos `.env` para mostrar su contenido.
- Almacena contraseñas con los mecanismos seguros soportados por el framework; nunca en texto plano ni con algoritmos caseros.
- Valida y normaliza entradas en el backend.
- Aplica autorización del lado del servidor.
- Usa consultas parametrizadas y las protecciones del ORM/framework contra inyección.
- Mantén dependencias actualizadas y revisa vulnerabilidades antes de incorporar paquetes.
- Protege sesiones, cookies, CSRF, CORS y límites de solicitudes según el modelo de autenticación y el despliegue.
- Devuelve errores consistentes sin filtrar detalles internos.
- Evita registrar contenido sensible de mensajes cuando no sea necesario.
- Minimiza los datos personales almacenados y documenta las decisiones de retención.
- Diseña la verificación de webhooks con los mecanismos oficiales del proveedor; no confíes en solicitudes externas sin verificar.
- Diseña idempotencia y protección contra eventos duplicados.
- Usa auditoría para acciones sensibles sin registrar secretos.
- No desactives controles de seguridad para que una prueba pase.

No afirmes que la aplicación cumple una norma o certificación sin una evaluación que lo demuestre.

## 9. Calidad del código y convenciones

- Usa nombres claros y coherentes con las convenciones de cada lenguaje y framework.
- Mantén las funciones y clases enfocadas en una responsabilidad.
- Evita duplicación, complejidad accidental y comentarios que repitan literalmente el código.
- Comenta las razones o restricciones no obvias, no cada línea.
- Prefiere cambios pequeños, revisables y reversibles.
- Mantén los tipos de TypeScript estrictos; evita `any` salvo justificación documentada.
- Sigue las convenciones oficiales y las herramientas de formato/lint adoptadas por el proyecto.
- No introduzcas un patrón arquitectónico solo para cumplir una regla abstracta.
- Actualiza la documentación cuando cambie el comportamiento, la configuración o un contrato público.
- No agregues funcionalidades fuera de la tarea autorizada.

## 10. API y manejo de errores

- Mantén la API bajo `/api/v1`.
- Define contratos claros de solicitud y respuesta.
- Usa códigos HTTP apropiados y un formato de error consistente.
- Valida entradas y aplica autorización en el backend.
- No reveles trazas, consultas SQL, secretos ni detalles internos al cliente.
- Define cómo se representan errores del proveedor sin acoplar toda la API a sus códigos específicos.
- Considera claves de idempotencia para operaciones de envío y otras operaciones que puedan repetirse.
- Documenta cambios incompatibles en contratos antes de implementarlos.

## 11. Mensajería, eventos y concurrencia

Al implementar mensajería y webhooks:

- No asumas que los eventos externos llegan una sola vez o en orden.
- Diseña deduplicación con identificadores fiables del proveedor cuando estén disponibles.
- Define estados y transiciones permitidas para mensajes y conversaciones.
- Considera reintentos controlados, fallos permanentes y registro de errores.
- Evita que el reintento de una operación cree mensajes duplicados.
- Protege las actualizaciones concurrentes cuando varios empleados atiendan una conversación.
- No marques una operación como enviada, entregada o leída sin evidencia del adaptador/proveedor correspondiente.
- Distingue los estados simulados de los estados confirmados por un proveedor real.

## 12. Pruebas y verificación

- Añade pruebas a medida que se implementa cada funcionalidad.
- Prioriza pruebas de lógica de negocio, autenticación, autorización, validación, transiciones de estado e idempotencia.
- Prueba tanto casos válidos como errores, permisos denegados y entradas malformadas.
- Usa datos ficticios para pruebas; no uses datos personales reales.
- No dependas de servicios externos en pruebas unitarias.
- Usa dobles de prueba o adaptadores simulados para probar la lógica de mensajería.
- Ejecuta las pruebas, el análisis estático y el formateo aplicables antes de afirmar que un cambio está verificado.
- Informa qué comandos se ejecutaron y cuáles no pudieron ejecutarse.
- Nunca inventes resultados ni digas que las pruebas pasan si no se ejecutaron.

## 13. Git y seguridad operacional

- Inspecciona `git status` antes de modificar archivos.
- No sobrescribas ni elimines trabajo existente sin revisarlo y justificar el cambio.
- No hagas commits, pushes, despliegues ni cambios de infraestructura externa salvo que la tarea lo solicite expresamente.
- No ejecutes comandos destructivos ni limpiezas amplias sin autorización.
- No cambies configuraciones globales de la máquina.
- No uses credenciales reales ni conectes entornos de producción durante el desarrollo local.
- Mantén `.gitignore` actualizado para excluir dependencias, archivos generados, configuraciones locales y secretos.
- Revisa los cambios antes de concluir la tarea.

## 14. Flujo de trabajo obligatorio para cada tarea

1. **Comprender:** lee las instrucciones y el código relacionado.
2. **Inspeccionar:** revisa estado, dependencias y convenciones existentes.
3. **Planificar:** divide el trabajo en pasos pequeños y define criterios de aceptación.
4. **Identificar riesgos:** señala supuestos, seguridad, compatibilidad y efectos secundarios.
5. **Implementar:** modifica únicamente lo necesario para la tarea.
6. **Verificar:** ejecuta pruebas y herramientas disponibles.
7. **Revisar:** inspecciona el diff, posibles secretos y cambios accidentales.
8. **Documentar:** actualiza documentación y ADR cuando corresponda.
9. **Informar:** resume cambios, verificaciones reales, bloqueos y siguiente paso.

Si falta una decisión importante, no inventes una respuesta silenciosamente. Registra el supuesto y solicita una aclaración cuando sea necesario para evitar una decisión de alto impacto.

## 15. Formato del informe al finalizar una tarea

Cada tarea debe terminar con un informe breve que contenga:

1. **Resumen:** qué se hizo.
2. **Archivos:** qué se creó o modificó.
3. **Decisiones:** qué se decidió y qué sigue pendiente.
4. **Verificaciones:** comandos ejecutados y resultados reales.
5. **Riesgos o bloqueos:** problemas encontrados y limitaciones.
6. **Siguiente paso:** la siguiente tarea recomendada, sin comenzarla automáticamente.

## 16. Orden de desarrollo recomendado

Sigue este orden, salvo que una decisión técnica documentada justifique cambiarlo:

1. Preparar repositorio, reglas de agentes y entorno de desarrollo.
2. Confirmar versiones y reproducibilidad del entorno.
3. Aprobar el modelo entidad-relación.
4. Definir estados y transiciones de conversaciones, mensajes y eventos.
5. Aprobar la matriz de permisos.
6. Implementar migraciones y modelos con restricciones e índices.
7. Implementar autenticación y autorización.
8. Implementar contactos y conversaciones.
9. Implementar asignación, historial y estados.
10. Implementar el adaptador simulado y los contratos de mensajería.
11. Desarrollar la interfaz de atención.
12. Completar pruebas, observabilidad y preparación de despliegue.
13. Validar la integración con Meta antes de conectar el número real.
14. Implementar y probar la integración oficial aprobada en un entorno de prueba.
15. Planificar el despliegue y la transición a producción con autorización explícita.

No comiences automáticamente la siguiente fase al terminar una tarea. Espera la instrucción correspondiente.

## 17. Regla final

Trabaja como un ingeniero responsable de un producto real: prioriza seguridad, claridad, evidencia y mantenibilidad. No confundas una estructura creada con una funcionalidad terminada, una simulación con una integración real, ni una suposición con un requisito confirmado.