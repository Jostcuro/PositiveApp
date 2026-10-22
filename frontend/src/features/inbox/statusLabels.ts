import type { ConversationStatus } from './types.ts'

/**
 * Etiquetas visibles de los estados de conversación. Se comparten entre el
 * chip de estado y los controles de cambio de estado para evitar divergencias.
 */
export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Abierta',
  pending: 'Esperando respuesta',
  resolved: 'Resuelta',
}
