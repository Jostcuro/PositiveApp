import { apiRequest } from '../auth/apiClient.ts'
import type {
  Conversation,
  ConversationDetail,
  CursorPaginated,
  Message,
  OffsetPaginated,
} from './types.ts'

// Operaciones de solo lectura del read API T06B. Reutilizan el cliente HTTP
// existente (cookies de sesión Sanctum + CSRF) y el `public_id` como
// identificador de conversación. No se inventan endpoints ni parámetros.

export function fetchConversations(): Promise<OffsetPaginated<Conversation>> {
  return apiRequest('/api/v1/conversations')
}

export function fetchConversation(publicId: string): Promise<{ data: ConversationDetail }> {
  return apiRequest(`/api/v1/conversations/${encodeURIComponent(publicId)}`)
}

export function fetchConversationMessages(
  publicId: string,
  cursor?: string,
): Promise<CursorPaginated<Message>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest(`/api/v1/conversations/${encodeURIComponent(publicId)}/messages${query}`)
}
