# AGENTS.md — Positive WhatsApp Platform

Última verificación del estado documentado: 18 de octubre de 2026.

## 1. Propósito y autoridad de este documento

Este archivo establece las reglas de ingeniería, las decisiones vigentes, las restricciones de seguridad y el flujo de trabajo para los agentes de IA y desarrolladores que trabajen en Positive.

Su objetivo es mantener una implementación coherente, segura, verificable y fácil de mantener, evitando cambios especulativos, contradicciones arquitectónicas y complejidad innecesaria.

### Reglas iniciales obligatorias

Antes de planificar o modificar código:

1. Lee este archivo completo.
2. Inspecciona el estado actual del repositorio y sus instrucciones locales.
3. Revisa `git status`, el diff existente y los archivos no rastreados.
4. Consulta la documentación y los contratos relacionados con la tarea.
5. Verifica las versiones instaladas antes de asumir comportamientos de frameworks o dependencias.
6. Identifica requisitos confirmados, decisiones pendientes, riesgos y criterios de aceptación.
7. Formula un plan proporcional al alcance solicitado.
8. Trata los planes, prompts y conversaciones históricas como **contexto, no como fuente de verdad**. Si un contexto histórico discrepa del estado actual del repositorio, prevalece el estado actual y la discrepancia debe reportarse (no resolverse en silencio).
9. No inventes endpoints, campos, identificadores, parámetros, metadatos de paginación ni comportamientos que no existan en el contrato actual implementado y probado.

Estas instrucciones no autorizan automáticamente a implementar todas las funcionalidades descritas aquí. Cada tarea debe respetar la solicitud concreta del usuario.

Si encuentras instrucciones contradictorias, detén los cambios afectados, identifica el conflicto y solicita aclaración cuando no pueda resolverse mediante las decisiones aprobadas y la documentación del proyecto.

No inventes requisitos ni cambies silenciosamente decisiones confirmadas.

---

## 2. Visión del producto

Positive es una aplicación web de atención compartida de conversaciones empresariales de WhatsApp.

El propósito es permitir que varios empleados gestionen conversaciones asociadas al mismo número empresarial desde una interfaz centralizada, con historial, estados, trazabilidad y controles de acceso.

El producto se construye por etapas. La prioridad actual es una base funcional y segura, no desarrollar de una sola vez una plataforma SaaS completa.

### 2.1 Alcance del MVP

- Una empresa.
- Un número empresarial compartido de WhatsApp.
- Aproximadamente entre 3 y 10 empleados.
- Autenticación de empleados.
- Roles iniciales `admin` y `agent`.
- Interfaz de bandeja de conversaciones.
- Contactos y conversaciones.
- Asignación de responsables cuando esté implementada y aprobada.
- Estados e historial de conversaciones y mensajes.
- Trazabilidad de acciones relevantes.
- Integración futura con WhatsApp Business Platform mediante mecanismos oficiales.

No declares una funcionalidad terminada por el hecho de que exista una pantalla, un modelo, una migración, un contrato o una simulación.

### 2.2 Fuera del alcance actual

No implementar sin autorización explícita:

- Multitenencia.
- Arquitectura de microservicios.
- Automatizaciones avanzadas con IA.
- Integraciones adicionales con proveedores.
- Facturación, suscripciones o cobros.
- Funcionalidades no justificadas por requisitos confirmados.
- Infraestructura adicional que no resuelva una necesidad demostrada.

El producto podría evolucionar a un SaaS multitenant. Considera esa posibilidad al diseñar límites entre módulos, pero no implementes multitenencia anticipadamente.

---

## 3. Estado actual del proyecto

Este apartado refleja el estado reportado al actualizar este documento. Antes de iniciar una tarea, contrasta cada afirmación con el repositorio real.

### 3.1 Trabajo completado según los informes disponibles

- **TAREA 03:** implementación del modelo de datos.
- **TAREA 04:** base del frontend con React, TypeScript, Vite y Material UI, con una bandeja de demostración y datos ficticios.
- **TAREA 05:** autenticación y protección de rutas mediante Laravel Sanctum.
- **TAREA 06A:** auditoría de autenticación, sesiones, CSRF, CORS, cookies, autorización, documentación y pruebas.
- **TAREA 06B:** API REST **de solo lectura** de conversaciones y mensajes bajo `/api/v1`, autenticada por sesión Sanctum y autorizada con `ConversationPolicy`; **implementada y auditada (T06B-R)**. Ver [ADR-005](docs/decisions/ADR-005-read-api-conversations-messages.md) y el [informe de auditoría](docs/testing/t06b-read-api-audit.md).
- **TAREA 07:** integración de la bandeja del Inbox del frontend con el read API real, **solo lectura**. Incluye capa de API tipada, hook de feature con cancelación de respuestas obsoletas, estados de carga/vacío/error, retirada de los datos ficticios y manejo central de 401. Ver [ADR-006](docs/decisions/ADR-006-frontend-inbox-read-integration.md).

La auditoría 06A reportó correcciones relacionadas con los dominios stateful de Sanctum y el rechazo de sesiones de usuarios desactivados, además de nuevas pruebas y documentación. La auditoría T06B-R no confirmó defectos, endureció pruebas y documentación, y dejó **fuera de su alcance** la conexión del frontend.

Estos resultados deben comprobarse en el código y el historial del repositorio. Los informes anteriores son evidencia de trabajo declarado, no sustituyen la inspección técnica. El código y los tests actuales son la **fuente de verdad operativa**.

### 3.2 Situación de la autenticación

La implementación reportada utiliza:

- Laravel Sanctum.
- Cookies de sesión para la SPA.
- Protección CSRF.
- Un cliente HTTP en el frontend.
- Rutas protegidas.
- Verificación del estado activo de la cuenta.
- Limitación de intentos de inicio de sesión.

La auditoría reportó una prueba de integración a través del proxy de Vite y suites backend y frontend satisfactorias, con una prueba backend omitida por limitaciones del entorno de MySQL.

Antes de cambiar la autenticación, inspecciona la implementación actual y el ADR correspondiente. No reconstruyas un mecanismo que ya funciona ni asumas que los informes anteriores siguen siendo válidos después de otros cambios.

### 3.3 Próxima etapa funcional

La API de lectura de conversaciones y mensajes (T06B) **ya está implementada y aceptada**, y la **T07** (conexión de la bandeja del Inbox del frontend al read API real, solo lectura) **también está implementada**. No reimplementes ninguna de las dos.

La siguiente etapa prevista son las **operaciones de escritura** (asignación/reasignación, cambios de estado y envío de mensajes) con su autorización. No está autorizada todavía.

Antes de afrontarla, inspecciona el modelo de datos, los endpoints reales, la policy, la paginación y las decisiones documentadas (ver §3.5), y espera autorización expresa. No la implementes automáticamente al terminar otra tarea.

La UI del Inbox pagina el listado de forma **incremental** con «Cargar más conversaciones» (offset, acumulación con dedupe por `public_id`) y «Refrescar» que recarga la primera página (T08, [ADR-007](docs/decisions/ADR-007-offset-pagination-conversation-list.md)); del historial consume la primera página (mensajes más recientes, presentados en orden cronológico) y permite cargar páginas anteriores con «Cargar mensajes anteriores». No incluye búsqueda ni filtros. Añadir filtros (p. ej. por `status`) es trabajo distinto que requiere autorización.

### 3.4 Pendientes importantes

- Operaciones de **escritura** (asignación/reasignación, cambios de estado, envío de mensajes) y su autorización. Los endpoints de lectura ya existen y están autorizados.
- Contrato público de usuarios: `assigned_user` expone hoy el `id` interno de `User` (ver §3.5). Revisar antes de estabilizar el contrato público de usuarios.
- Integración real con WhatsApp Business Platform.
- Configuración definitiva de cookies, HTTPS, CORS y dominios stateful para producción.
- Administración de usuarios y roles mediante endpoints, cuando corresponda al alcance aprobado.
- Resolución de limitaciones de pruebas que requieran una base de datos MySQL dedicada.
- Preparación de despliegue y operación.

Mantén actualizada la documentación de decisiones pendientes. No presentes estos elementos como implementados.

### 3.5 Contratos vigentes del read API (T06B)

Los siguientes contratos son el estado **implementado y probado** (fuente: `backend/app/Http/Resources`, `backend/routes/api.php`, `backend/tests/Feature/Api` y [ADR-005](docs/decisions/ADR-005-read-api-conversations-messages.md)). No los sustituyas por planes anteriores.

- **Conversación:** se identifica públicamente por `public_id` (ULID). La URL usa `public_id`: `/api/v1/conversations/{public_id}`. **Nunca** el `id` numérico interno.
- **Mensaje:** se identifica por su `id` (numérico interno), expuesto en el payload de mensajes. No dispone de `public_id`.
- **`assigned_user`:** expone `{id, name}` o `null`. El `id` es el identificador interno de `User`. `User` **no** tiene `public_id`; **no** se crea una migración para añadirlo. El `id` de `assigned_user` no debe tratarse como identidad pública ni usarse en URLs. Cualquier cambio de este contrato requiere una tarea backend explícita que actualice código, tests y ADR.
- **`contact`:** `{id, display_name}`; el detalle añade `phone_e164`. `id` es el `public_id` del contacto.
- **Paginación del listado:** *offset* (`LengthAwarePaginator`): `data`, `links` y `meta` con `current_page`, `per_page`, `total`, `last_page`, `from`, `to`, `path` y URLs de página.
- **Paginación de mensajes:** *keyset* (`CursorPaginator`): `data`, `links` y `meta` con `path`, `per_page`, `next_cursor`, `prev_cursor` (sin `total`). Orden fijo del servidor **`id DESC`**: la primera página contiene los mensajes **más recientes** y `next_cursor` avanza hacia mensajes **más antiguos**. Los cursores son opacos y **no persistibles** entre releases cuando cambia la semántica de orden.
- **No** se exponen campos internos ni de proveedor (p. ej. `processing_status`, `provider_status`, `provider_message_id`, `idempotency_key`, `error_code`, `error_message`, `media_provider_id`) ni claves foráneas. El listado **no** incluye `phone_e164`.
- **Autorización:** `ConversationPolicy` (`viewAny`/`view`) es la autoridad por recurso. `Conversation::scopeVisibleTo()` centraliza la visibilidad de fila en el listado, pero **no autoriza por sí solo** y debe permanecer coherente con la policy.
- **Errores:** 401 sin sesión; 404 genérico (`Recurso no encontrado.`) para `public_id` inexistente o malformado; 422 para parámetros inválidos.
- **Solo lectura:** no existen endpoints de escritura/envío. No se añaden como extensión implícita.

---

## 4. Decisiones funcionales vigentes

Las siguientes decisiones deben respetarse hasta que una instrucción explícita y una actualización documentada las sustituyan.

### 4.1 Empresa y número empresarial

El MVP opera inicialmente para una empresa y un número empresarial compartido.

No crees entidades, filtros, permisos o flujos multitenant antes de su aprobación.

### 4.2 Visibilidad de conversaciones

**Todos los usuarios con rol `admin` y `agent` pueden ver todas las conversaciones.**

Esta es la decisión vigente. No restaures reglas antiguas que limiten a los agentes a conversaciones sin asignar o asignadas exclusivamente a ellos.

Sin embargo, ver una conversación no concede automáticamente permiso para:

- Administrar usuarios o roles.
- Modificar la configuración del sistema.
- Ejecutar operaciones administrativas.
- Enviar o modificar mensajes sin la autorización correspondiente.
- Realizar cualquier otra acción protegida.

La visibilidad de lectura, la asignación y los permisos de modificación son conceptos distintos.

Antes de implementar nuevos endpoints, revisa la matriz de permisos y actualiza las decisiones documentadas si existe alguna contradicción con esta regla.

### 4.3 Roles

Roles iniciales:

- `admin`: acceso a las funciones administrativas expresamente autorizadas.
- `agent`: acceso a las funciones operativas expresamente autorizadas.

No concedas permisos basándote únicamente en el nombre del rol. Cada acción debe corresponder a una regla definida y aplicada en el backend.

### 4.4 Requisitos confirmados frente a supuestos

Distingue siempre entre:

- Requisito confirmado.
- Decisión arquitectónica aprobada.
- Supuesto temporal.
- Pregunta pendiente.
- Recomendación técnica.

No conviertas una recomendación en un requisito ni una hipótesis en una decisión aprobada.

---

## 5. Stack tecnológico

Respeta las dependencias y convenciones existentes. Antes de instalar, actualizar o sustituir una herramienta, comprueba si el proyecto ya tiene una solución apropiada.

### 5.1 Frontend

- React.
- TypeScript.
- Vite.
- Material UI (MUI).
- React Router para navegación.
- Cliente HTTP existente para la comunicación con el backend.

Para nuevas integraciones de datos, evalúa TanStack Query si aporta una mejora clara en caché, estados de carga, invalidación o sincronización. No lo incorpores si la arquitectura existente resuelve adecuadamente el caso.

Para formularios nuevos, evalúa React Hook Form y Zod cuando justifiquen su coste.

Para iconos, utiliza Lucide React si ya está instalado y es coherente con la implementación.

### 5.2 Backend

- Laravel.
- PHP.
- MySQL.
- Eloquent ORM.
- Laravel Sanctum para autenticación SPA basada en sesión.
- Policies y Gates cuando correspondan a la autorización.
- Pest o PHPUnit, respetando la herramienta instalada.
- Laravel Pint para el formato PHP, si está configurado.

### 5.3 Comunicación

- API REST bajo `/api/v1`.
- Contratos explícitos entre frontend y backend.
- Respuestas y errores consistentes.
- Validación de entradas en el servidor.
- Autorización del lado del servidor.
- Paginación para colecciones cuando corresponda.

### 5.4 Infraestructura

Docker, Nginx, Redis, colas, CI/CD y otros componentes no son requisitos automáticos.

Incorpóralos únicamente cuando exista una necesidad concreta, un beneficio justificable, compatibilidad con el entorno y aprobación cuando el cambio amplíe el alcance.

No introduzcas microservicios para resolver problemas que pueden gestionarse mediante un monolito modular.

---

## 6. Arquitectura y diseño

### 6.1 Enfoque arquitectónico

Utiliza un monolito modular para el MVP.

Organiza el código según las responsabilidades reales del sistema, procurando separar:

- Presentación.
- Aplicación y casos de uso.
- Dominio y reglas de negocio.
- Persistencia e integración externa.

La separación debe ser proporcional a la complejidad. No es obligatorio crear una clase, interfaz, servicio o capa para cada operación sencilla.

### 6.2 Principios de diseño

Aplica los siguientes principios cuando aporten valor real:

- SOLID.
- Clean Code.
- Bajo acoplamiento.
- Alta cohesión.
- Separación de responsabilidades.
- Encapsulación.
- Reutilización justificada.
- Tipado explícito.
- Facilidad de prueba.
- Simplicidad y mantenibilidad.

No confundas Clean Code con crear muchas abstracciones. Evita patrones especulativos, clases vacías, capas redundantes, factories innecesarias y duplicación de configuraciones.

### 6.3 Fuente de verdad

Antes de modificar un componente, identifica su fuente de verdad.

Ejemplos:

- La base de datos y el backend determinan los permisos reales.
- Los contratos de la API definen la comunicación frontend-backend.
- Las migraciones y modelos existentes describen el esquema implementado.
- Las ADR registran las decisiones arquitectónicas aprobadas.
- Las pruebas verifican comportamientos concretos.

**El código y los tests actuales son la fuente de verdad operativa.** Antes de planificar o implementar, inspecciona el repositorio. Los planes, prompts y conversaciones históricas son contexto, no contratos vigentes: si contradicen el repositorio, prevalecen el código y los tests, y la discrepancia debe reportarse de forma explícita (formato `source A dice X` / `source B dice Y` / `implementación y tests dicen Z`).

No documentes lo que se cree que debería existir: documenta lo que realmente existe y está probado. No inventes endpoints, campos, identificadores, parámetros, metadatos de paginación ni comportamientos que no existan en el contrato actual. No reescribas historia para hacerla coincidir con una decisión nueva; conserva las ADR históricas cuando describan correctamente decisiones ya tomadas.

No mantengas reglas de negocio duplicadas en frontend y backend cuando el backend deba ser la autoridad.

### 6.4 Decisiones arquitectónicas

Documenta mediante ADR las decisiones que tengan impacto relevante en:

- Seguridad.
- Persistencia.
- Autenticación.
- Autorización.
- Contratos de API.
- Integraciones externas.
- Arquitectura.
- Compatibilidad.
- Operación.

No crees una ADR para cada cambio pequeño. Cuando una decisión existente cambie, actualiza la documentación correspondiente y explica el motivo.

---

## 7. Modelo de datos y persistencia

Las entidades conceptuales pueden incluir:

- `users`.
- `contacts`.
- `conversations`.
- `messages`.
- `whatsapp_accounts`.
- `webhook_events`.
- `audit_logs`.

La estructura exacta debe determinarse a partir de las migraciones, los modelos y las decisiones aprobadas. No presupongas que todos los conceptos deben convertirse inmediatamente en tablas.

Antes de cambiar el esquema, analiza:

1. Relaciones y cardinalidades.
2. Claves primarias y foráneas.
3. Restricciones e invariantes.
4. Índices y unicidad.
5. Consultas previstas y paginación.
6. Integridad de los datos.
7. Concurrencia.
8. Retención y privacidad.
9. Migraciones existentes y compatibilidad.
10. Estrategia de pruebas.

Usa migraciones versionadas. No alteres manualmente el esquema compartido como sustituto de una migración.

No ejecutes `migrate:fresh`, truncados ni operaciones destructivas en una base de datos compartida. Antes de ejecutar pruebas que puedan modificar el esquema, confirma qué conexión y base de datos utilizarán.

Los números telefónicos deben normalizarse de acuerdo con el formato internacional requerido por el dominio, normalmente E.164 cuando corresponda.

No guardes tokens o credenciales de proveedores en texto plano.

---

## 8. Integración con WhatsApp Business Platform

**La integración con el número empresarial real permanece bloqueada hasta validar y aprobar las decisiones pendientes de Meta y del cliente.**

No se consideran confirmados:

- La causa exacta de los errores reportados por el cliente.
- La necesidad concreta de migrar desde WhatsApp Business convencional.
- El uso de integración directa con Meta o de un proveedor externo.
- La titularidad y administración de los activos.
- Los requisitos de onboarding y permisos.
- Los costes, límites y condiciones comerciales.
- El procedimiento de verificación de webhooks.
- Las responsabilidades operativas y económicas.

No afirmes que existe una cuota gratuita genérica ni prometas tarifas sin validación oficial vigente.

Mientras el bloqueo siga activo:

- No conectes el número real.
- No envíes mensajes reales.
- No solicites ni expongas credenciales reales.
- No crees webhooks de producción.
- No declares terminada la integración.
- Puedes implementar contratos internos y adaptadores simulados.

Consulta y mantén actualizado `docs/integrations/meta-integration-pending.md`.

La simulación debe identificarse claramente como tal y no puede presentarse como evidencia de que Meta está conectado.

### 8.1 Desacoplamiento

La lógica de negocio no debe depender innecesariamente de detalles específicos de Meta.

Cuando llegue el momento, define un contrato de proveedor apropiado para operaciones como envío de mensajes, validación de webhooks y procesamiento de estados.

No inventes métodos o interfaces definitivos antes de conocer los requisitos y los contratos reales.

### 8.2 Eventos y mensajería

Diseña el procesamiento de eventos para tolerar:

- Duplicados.
- Reintentos.
- Eventos fuera de orden.
- Errores transitorios.
- Errores permanentes.
- Procesamiento concurrente.

Distingue entre el estado interno de la aplicación y el estado confirmado por el proveedor.

No afirmes que un mensaje fue enviado, entregado o leído sin evidencia verificable de la operación correspondiente.

No prometas entrega exactamente una vez sin garantías técnicas que la sustenten.

### 8.3 Estado de integración externa (actual)

A fecha de esta actualización, **no** existe:

- integración real con WhatsApp / Meta (bloqueada, ver `docs/integrations/meta-integration-pending.md`);
- envío de mensajes (outbound) implementado;
- webhook de WhatsApp implementado;
- realtime, polling, WebSockets ni Reverb.

No presentes ninguna de estas capacidades como implementada. **T07 es exclusivamente integración de lectura del frontend** y no debe introducir ninguna de ellas.

Telegram puede evaluarse **en el futuro** como posible adaptador/proveedor de prueba, pero **no** forma parte de T07 ni de ninguna tarea autorizada actualmente. No introduzcas dependencias, contratos ni configuración de proveedores (Meta o Telegram) sin una tarea explícita que lo autorice.

---

## 9. Autenticación, sesiones y autorización

### 9.1 Autenticación

Respeta la implementación existente de Laravel Sanctum salvo que exista un defecto confirmado o una decisión aprobada que justifique cambiarla.

Verifica los contratos y rutas reales antes de modificar:

- Inicio de sesión.
- Consulta del usuario autenticado.
- Cierre de sesión.
- Obtención y uso del token CSRF.
- Persistencia de sesión.
- Rechazo de cuentas inactivas.
- Limitación de intentos.
- Manejo de sesiones expiradas.

No implementes otro mecanismo de autenticación en paralelo sin una justificación documentada.

### 9.2 Sesiones, CSRF y CORS

Evalúa las configuraciones según el entorno y la topología real.

En producción, revisa como mínimo:

- HTTPS.
- Cookies `Secure`, `HttpOnly` y `SameSite` según la arquitectura.
- Dominios stateful de Sanctum.
- Orígenes CORS explícitos.
- Credenciales de cookies.
- Protección CSRF.
- Expiración e invalidación de sesiones.

No desactives CSRF ni abras CORS indiscriminadamente para solucionar problemas de desarrollo.

No asumas que el proxy de Vite reproduce las condiciones de producción.

No modifiques `.env`, secretos o configuraciones locales no versionadas sin autorización explícita.

### 9.3 Autorización en el backend

Toda operación protegida debe validarse en el servidor.

No confíes en:

- Botones ocultos.
- Rutas protegidas únicamente por React.
- Roles almacenados en el navegador.
- Identificadores proporcionados por el cliente.
- Suposiciones sobre el comportamiento de la interfaz.

Cuando se implementen endpoints de conversaciones, verifica el acceso al recurso y los permisos de la operación, aunque el usuario esté autenticado.

Prevén IDOR mediante consultas y comprobaciones de autorización apropiadas. No dependas de que el frontend oculte identificadores.

Respeta la decisión vigente: todos los agentes pueden ver todas las conversaciones, pero no obtienen permisos administrativos por ello.

### 9.4 Cuentas inactivas

El estado de la cuenta debe comprobarse en el servidor. Una sesión ya iniciada no debe mantener acceso operativo después de desactivar la cuenta si la política vigente exige su revocación.

Antes de cambiar esta lógica, revisa el middleware y las pruebas existentes.

---

## 10. Seguridad y privacidad

La seguridad forma parte de cada tarea.

Reglas obligatorias:

- Nunca guardes secretos, contraseñas o claves privadas en el repositorio.
- No imprimas el contenido de archivos `.env`.
- No expongas tokens en logs, capturas, documentación o respuestas.
- No almacenes contraseñas en texto plano.
- Valida las entradas en el backend.
- Utiliza Eloquent y las protecciones del framework de forma apropiada.
- No construyas consultas inseguras mediante concatenación de entradas.
- Rechaza operaciones no autorizadas.
- Devuelve errores consistentes sin filtrar trazas o detalles internos.
- Minimiza la información personal almacenada.
- Evita registrar contenido sensible de conversaciones sin necesidad.
- Revisa las dependencias nuevas y sus riesgos.
- No desactives controles de seguridad para hacer pasar una prueba.
- No uses datos personales reales en pruebas.
- No conectes entornos de producción durante el desarrollo local.
- No declares cumplimiento normativo o certificaciones sin evidencia.

Cuando encuentres una posible vulnerabilidad, distingue entre una hipótesis y un defecto demostrado. Prioriza la reproducción segura y la corrección mínima.

---

## 11. Frontend: convenciones de implementación

Respeta la estructura existente de React y TypeScript.

### 11.1 Principios

- Mantén componentes enfocados en responsabilidades claras.
- Reutiliza componentes existentes cuando sea apropiado.
- Separa la presentación de la lógica de comunicación con la API.
- Mantén los tipos de TypeScript explícitos.
- Evita `any` salvo que exista una justificación documentada.
- Gestiona estados de carga, error, éxito y ausencia de datos cuando correspondan.
- Evita peticiones duplicadas y estados inconsistentes.
- No dupliques reglas de autorización del backend como si fueran controles de seguridad.
- Mantén accesibilidad y comportamiento responsive.

### 11.2 Sistema visual

Material UI es el sistema de componentes principal.

No mezcles MUI con shadcn/ui, Tailwind u otro sistema de componentes principal sin aprobación y justificación.

Respeta los temas, tokens, layouts y convenciones visuales existentes. No rediseñes pantallas cuando la tarea solo requiere conectar datos o corregir lógica.

### 11.3 Comunicación con la API

Usa el cliente HTTP existente y respeta su configuración de autenticación y CSRF.

Cuando conectes la interfaz a endpoints reales:

- Define los tipos de solicitud y respuesta.
- Gestiona errores HTTP.
- Maneja estados de carga y listas vacías.
- Evita que datos ficticios se confundan con datos reales.
- Respeta la paginación del backend.
- No implementes acciones que la API todavía no soporte.

No agregues una segunda capa de clientes HTTP o un gestor de estado global sin una necesidad demostrada.

---

## 12. Backend: convenciones de implementación

Respeta las convenciones y capacidades de Laravel existentes.

- Utiliza validación apropiada para las entradas.
- Usa controladores enfocados en HTTP y delega lógica compleja cuando esté justificado.
- Utiliza Policies o Gates cuando correspondan a la autorización.
- Mantén las reglas de negocio fuera de la presentación.
- Aprovecha Eloquent sin generar consultas innecesarias.
- Evita problemas N+1 mediante carga de relaciones y consultas adecuadas.
- Pagina colecciones que puedan crecer.
- Usa transacciones cuando varias operaciones deban mantener una misma invariante.
- Aplica restricciones en la base de datos cuando deban garantizar integridad.
- Mantén las respuestas HTTP coherentes con el contrato existente.
- No agregues repositorios, servicios o DTO para cada operación de manera automática.

La arquitectura debe resolver necesidades actuales sin impedir una evolución razonable.

---

## 13. API y contratos

La API debe permanecer bajo `/api/v1`.

Cada endpoint debe definir claramente:

- Método HTTP y ruta.
- Autenticación requerida.
- Autorización requerida.
- Validaciones.
- Forma de la respuesta.
- Códigos de estado.
- Manejo de errores.
- Paginación cuando corresponda.

No cambies contratos públicos sin evaluar las dependencias y documentar las consecuencias.

No devuelvas información interna del proveedor a menos que forme parte de un contrato expresamente definido.

Para operaciones que puedan repetirse y producir efectos secundarios, evalúa idempotencia según el riesgo real.

No implementes endpoints de escritura o envío de mensajes como extensión implícita de una tarea limitada a lectura.

---

## 14. Calidad del código y dependencias

Aplica Clean Code y SOLID con criterio práctico.

- Nombres claros y consistentes.
- Funciones y clases enfocadas.
- Evita duplicación innecesaria.
- Evita complejidad accidental.
- Comenta decisiones no obvias, no cada línea.
- Prefiere cambios pequeños y revisables.
- Mantén el tipado de TypeScript.
- Sigue las herramientas de formato y lint instaladas.
- Respeta las convenciones del proyecto.
- Actualiza documentación cuando cambie el comportamiento.

Antes de añadir una dependencia:

1. Comprueba si ya existe una solución instalada.
2. Explica qué problema resuelve.
3. Evalúa mantenimiento, compatibilidad y superficie de riesgo.
4. Justifica su coste y complejidad.
5. Evita incorporarla si una solución más simple es suficiente.

No actualices paquetes de forma general dentro de una tarea funcional, salvo autorización o necesidad demostrada.

---

## 15. Pruebas y verificación

Cada cambio debe verificarse con pruebas proporcionales a su impacto.

### 15.1 Cobertura prioritaria

Prioriza pruebas para:

- Autenticación.
- Autorización.
- Cuentas inactivas.
- Validación.
- Contratos de API.
- Reglas de negocio.
- Restricciones de base de datos.
- Transiciones de estado.
- Idempotencia.
- Manejo de errores.
- Concurrencia cuando corresponda.

Incluye casos válidos, inválidos y de permisos denegados.

### 15.2 Pruebas seguras

Antes de ejecutar pruebas que modifiquen datos o esquema:

- Confirma la base de datos de destino.
- Comprueba el entorno de testing.
- Evita producción y datos reales.
- No ejecutes operaciones destructivas sobre una base compartida.
- Usa bases de datos aisladas cuando sean necesarias.
- No cambies una prueba para ocultar un fallo real.

Una prueba omitida debe investigarse y documentarse. No cuenta como aprobada.

Si una prueba no puede ejecutarse, informa la razón y la alternativa de verificación utilizada.

### 15.3 Resultados reales

Antes de afirmar que algo funciona, ejecuta los comandos pertinentes y revisa sus resultados.

Distingue entre:

- `PASS`: ejecutado y aprobado.
- `FAIL`: ejecutado y fallido.
- `SKIPPED`: omitido por una condición explícita.
- `NOT RUN`: no ejecutado.

No declares una prueba de extremo a extremo si solo se ejecutaron pruebas unitarias.

No inventes resultados ni afirmes haber inspeccionado archivos que no leíste.

---

## 16. Documentación y decisiones pendientes

Mantén la documentación sincronizada con la implementación.

Consulta y actualiza, según corresponda:

- `README.md`.
- `docs/PROJECT-STATUS.md` (fotografía operativa del estado actual).
- `docs/architecture/`.
- `docs/decisions/`.
- `docs/development/`.
- `docs/security/`.
- `docs/testing/`.
- `docs/integrations/`.
- La matriz de permisos.
- Las decisiones pendientes.

No dupliques contenido sin necesidad.

Cuando un documento contradiga una decisión aprobada, identifica la contradicción y corrígela de forma controlada.

Distingue entre:

- Implementado.
- Probado.
- Verificado parcialmente.
- Pendiente.
- Simulado.
- Bloqueado.
- Recomendado.

No marques como completada una integración o funcionalidad por el mero hecho de que exista su documentación.

---

## 17. Git y seguridad operacional

Antes de cualquier cambio:

1. Inspecciona `git status --short`.
2. Revisa el diff existente.
3. Identifica cambios preexistentes y archivos no rastreados.
4. Conserva el trabajo del usuario.
5. Limita los cambios a los archivos necesarios.

Reglas:

- No descartes ni sobrescribas cambios preexistentes.
- No ejecutes comandos destructivos sin autorización explícita.
- No realices commits, pushes, despliegues ni operaciones remotas salvo solicitud expresa.
- No cambies configuraciones globales del equipo.
- No alteres `.env` ni secretos sin autorización.
- No incluyas credenciales o archivos generados innecesarios.
- No hagas refactorizaciones ajenas a la tarea.
- Revisa el diff final antes de informar que el trabajo terminó.

Si el trabajo existente impide aislar de forma segura una modificación, detente y solicita instrucciones.

---

## 18. Flujo de trabajo obligatorio para cada tarea

### Fase 1 — Comprender

Lee las instrucciones, los requisitos, la documentación y las decisiones relacionadas.

### Fase 2 — Inspeccionar

Revisa la estructura, los archivos afectados, el estado de Git, las dependencias y las pruebas existentes.

### Fase 3 — Planificar

Define el alcance, los pasos, los riesgos y los criterios de aceptación.

### Fase 4 — Implementar

Realiza únicamente los cambios necesarios para cumplir la tarea autorizada.

### Fase 5 — Verificar

Ejecuta las pruebas y herramientas aplicables. Reproduce los problemas cuando sea posible.

### Fase 6 — Revisar

Inspecciona el diff, los posibles efectos secundarios, la seguridad y los cambios accidentales.

### Fase 7 — Documentar

Actualiza la documentación pertinente y las ADR cuando sea necesario.

### Fase 8 — Informar

Entrega un resumen verificable, los resultados de las pruebas, los riesgos pendientes y el siguiente paso recomendado.

No continúes automáticamente a la siguiente tarea.

Si aparece un problema crítico, una decisión de alto impacto o un cambio fuera del alcance, detén la parte afectada y solicita autorización.

---

## 19. Trabajo con múltiples agentes de IA

Cuando se utilicen agentes especializados:

- Define el alcance y las responsabilidades de cada agente.
- Asigna un responsable de integrar y revisar los cambios.
- Evita que varios agentes modifiquen simultáneamente los mismos archivos sin coordinación.
- Exige evidencia para las conclusiones de seguridad.
- Revisa conflictos entre propuestas antes de implementarlas.
- No aceptes código solo porque lo haya generado otro agente.
- Evita que un agente amplíe el alcance asignado a otro.
- Integra cambios pequeños y verificables.

Un agente que revise seguridad debe distinguir vulnerabilidades demostradas de recomendaciones preventivas.

Un agente que implemente funcionalidades debe respetar los contratos y decisiones existentes.

Un agente de QA debe informar resultados reales, no limitarse a sugerir que se ejecuten pruebas.

La revisión final corresponde al responsable de la tarea, no al agente que produjo el cambio.

---

## 20. Formato obligatorio del informe final

Al terminar una tarea, entrega un informe con:

1. **Resumen:** qué se hizo y qué no se hizo.
2. **Archivos:** archivos creados y modificados.
3. **Decisiones:** decisiones tomadas y pendientes.
4. **Verificaciones:** comandos ejecutados y resultados reales.
5. **Hallazgos:** defectos confirmados, limitaciones y riesgos residuales.
6. **Diff:** resumen de los cambios relevantes.
7. **Siguiente paso:** recomendación concreta, sin comenzar la tarea siguiente.

Si no pudiste ejecutar una prueba o verificar una afirmación, indícalo expresamente.

No afirmes que el trabajo está completo si quedan criterios de aceptación sin cumplir.

---

## 21. Criterio de ingeniería

Ante varias soluciones válidas, prioriza en este orden:

1. Seguridad y cumplimiento de los requisitos confirmados.
2. Correctitud funcional.
3. Simplicidad.
4. Mantenibilidad.
5. Facilidad de prueba.
6. Compatibilidad con la arquitectura existente.
7. Capacidad de evolución futura.
8. Rendimiento, cuando exista una necesidad medible.

No optimices anticipadamente ni añadas infraestructura sin justificación.

No implementes una abstracción por moda ni una funcionalidad por anticipación.

El código debe ser suficientemente robusto para el producto real y suficientemente sencillo para que el equipo pueda comprenderlo, probarlo y mantenerlo.

## 22. Regla final

Trabaja como un ingeniero responsable de un producto real.

Respeta las decisiones vigentes, protege el trabajo existente, implementa únicamente el alcance autorizado y fundamenta tus conclusiones en evidencia.

No confundas una estructura con una funcionalidad terminada, una simulación con una integración real, una prueba omitida con una prueba aprobada ni una suposición con un requisito confirmado.
