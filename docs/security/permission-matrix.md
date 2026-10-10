# Matriz de permisos — MVP de Positive

> **Estado:** propuesta. **No implementado.** La política de visibilidad de conversaciones está **pendiente de
> aprobación del responsable del producto** ([DD-001](design-decisions-pending.md#dd-001)).
> Fuente de estados: [`../architecture/state-machines.md`](../architecture/state-machines.md). Modelo:
> [`../architecture/data-model.md`](../architecture/data-model.md).

## 1. Principios de autorización

1. **La autorización se aplica en el backend.** Ocultar un botón en React **no** es un control de seguridad.
2. **Denegar por defecto.** Toda acción no concedida explícitamente se deniega.
3. **Mínimo privilegio.** Cada rol recibe solo lo necesario para su función.
4. **Scoping en la consulta, no solo en el detalle** (anti-IDOR): los listados, búsquedas, historial y errores
   deben filtrar por visibilidad **en la consulta**, no solo al abrir un recurso por id.
5. **Sin secretos.** Ningún rol operativo puede leer tokens, credenciales ni claves. Residen en un gestor de
   secretos y se referencian por `secret_ref` (`whatsapp_accounts`).
6. **Todo lo sensible se audita** (`audit_logs`), sin secretos ni contenido de mensajes.

## 2. Roles

| Rol | Descripción |
|---|---|
| `admin` | Administra usuarios y configuración permitida; supervisa conversaciones según la política aprobada. |
| `agent` | Atiende conversaciones que le corresponden según la política de visibilidad. |

Los roles son **preliminares** hasta aprobar esta matriz.

## 3. Política de visibilidad de conversaciones (propuesta)

> **[Pendiente de aprobación — DD-001](design-decisions-pending.md#dd-001).** No es un requisito confirmado.

| Rol | Alcance de visibilidad propuesto |
|---|---|
| `admin` | Puede consultar **todas** las conversaciones del MVP. |
| `agent` | Conversaciones **sin asignar** y conversaciones **asignadas a sí mismo**. |
| `agent` | **No** puede acceder a conversaciones asignadas exclusivamente a **otros** agentes. |
| Cualquier rol operativo | **No** puede leer directamente secretos o tokens de integración. |

- La visibilidad se implementa como **scope de consulta** reutilizable y aplicado a: listado, búsqueda, detalle,
  historial, envío y consulta de errores.
- Una conversación que se reasigna a otro agente **deja de ser visible** para el agente anterior (salvo que
  además cumpla otra condición de visibilidad).

## 4. Matriz de operaciones

Convención: **Sí** = permitido · **No** = denegado · **Cond.** = condicionado (se detalla debajo).

| # | Operación | `admin` | `agent` | Condición / notas |
|---|---|---|---|---|
| 1 | Consultar el propio perfil | Sí | Sí | Solo el propio; nunca campos sensibles. |
| 2 | Listar usuarios | Sí | No | |
| 3 | Crear usuarios | Sí | No | Rol inicial asignable solo por `admin`. |
| 4 | Modificar usuarios (nombre, email) | Sí | No | |
| 5 | Activar/desactivar usuarios | Sí | No | Ver §5 (conversaciones asignadas). |
| 6 | Cambiar roles | Sí | No | Ver §5 (mínimo privilegio, auditoría). |
| 7 | Consultar contactos | Sí | **Cond.** | Solo los contactos de conversaciones visibles. |
| 8 | Crear contactos | Sí | **Cond.** | Vía conversación entrante; creación manual evaluar. |
| 9 | Modificar contactos | Sí | **Cond.** | Solo contactos visibles; evaluar si `agent` puede editar. |
| 10 | Consultar conversaciones | Sí | **Cond.** | Según §3 (scope). |
| 11 | Asignar/reasignar conversaciones | Sí | **Cond.** | `agent` solo *claim* de **sin asignar** hacia sí mismo; reasignar a otro → solo `admin`. |
| 12 | Cambiar estado de conversación | Sí | **Cond.** | Solo conversaciones visibles y transición válida. |
| 13 | Consultar historial de mensajes | Sí | **Cond.** | Solo de conversaciones visibles. |
| 14 | Enviar mensajes | Sí | **Cond.** | Solo en conversaciones visibles/responsable. |
| 15 | Consultar errores de envío | Sí | **Cond.** | Solo de conversaciones visibles. |
| 16 | Administrar configuración de integración | Sí | No | Metadatos no secretos; secretos vía gestor. |
| 17 | Consultar auditoría | Sí | No | Filtrar por recurso si se habilita a futuro. |
| 18 | Gestionar usuarios en bloque / importación | No | No | Fuera de alcance del MVP. |
| 19 | Reasignación masiva | No | No | Fuera de alcance del MVP. |
| 20 | Leer/exportar secretos o tokens | No | No | **Nunca**, para ningún rol. |

## 5. Reglas condicionadas y casos especiales

### 5.1 Desactivar un usuario con conversaciones asignadas

- **[Provisional — DD-002](design-decisions-pending.md#dd-002).** Opciones: (a) dejar las conversaciones
  **sin asignar** automáticamente; (b) bloquear la desactivación hasta reasignarlas.
- **Recomendación provisional:** (a) en una **transacción** que además registra auditoría
  (`user.deactivated`, `conversation.unassigned`).
- Al desactivar, el usuario **no puede** iniciar sesión; no se borra su historial.

### 5.2 Cambiar roles

- Solo `admin`. Un `admin` **no puede quitarse a sí mismo** el único rol `admin` del sistema (evitar quedarse sin
  administrador). Se audita el cambio.

### 5.3 Reasignación

- `admin` puede reasignar a cualquier usuario **activo**.
- `agent` solo puede **tomar** (claim) una conversación **sin asignar** hacia sí mismo.
- Reasignar a un usuario **inactivo** se **rechaza**.
- La operación usa **update condicional** en transacción (evita carreras entre dos agentes; ver
  [data-model §6](../architecture/data-model.md)). Se audita `conversation.assigned` con el anterior y el nuevo.

### 5.4 Envío de mensajes

- Requiere visibilidad de la conversación (responsable o, según la política, visible).
- Si el contrato aprueba que `agent` envíe en conversaciones **sin asignar** sin tomarlas, se reflejará aquí; hoy
  la recomendación es que **tomar la conversación** sea requisito para responder.

## 6. Prevención de fuga de información (anti-IDOR)

- **Listados:** aplicar el scope de visibilidad antes de paginar.
- **Búsqueda:** limitar resultados y filtrar por visibilidad; no exponer el directorio completo de contactos.
- **Detalle:** revalidar autorización por recurso (no confiar en que el id no se conozca).
- **Historial y errores:** heredan la visibilidad de su conversación.
- **Identificadores públicos:** `contacts` y `conversations` usan `public_id` ULID (no enumerables). Ver
  [DD-008](design-decisions-pending.md#dd-008).
- **Errores de API:** formato consistente que **no** revela si un recurso existe o no para un usuario sin acceso
  (evitar oráculos de existencia).
- **Secretos:** nunca incluidos en respuestas, logs ni auditoría.

## 7. Aplicación en backend (requisitos de implementación)

- Policies/Gates por recurso y por acción, con comprobación explícita en cada endpoint de `/api/v1`.
- Un **scope de visibilidad** único y reutilizado en todas las consultas de conversaciones.
- **Rate limiting** en autenticación y en endpoints sensibles.
- **Auditoría** de las acciones marcadas como sensibles en esta matriz.
- Pruebas obligatorias de **permisos denegados** (un `agent` no accede a lo ajeno) además de los casos válidos.

## 8. Referencias

- Visibilidad y asignación pendientes: [`../architecture/design-decisions-pending.md`](../architecture/design-decisions-pending.md).
- Transiciones permitidas y quién puede ejecutarlas: [`../architecture/state-machines.md`](../architecture/state-machines.md).
- Controles técnicos pendientes: [`security-baseline.md`](security-baseline.md).
