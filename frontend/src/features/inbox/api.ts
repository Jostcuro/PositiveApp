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

export function fetchConversations(page?: number): Promise<OffsetPaginated<Conversation>> {
  const query = new URLSearchParams()
  // La página 1 es la URL canónica sin query; solo se pide página explícita a partir de la 2.
  if (page !== undefined && page > 1) {
    query.set('page', String(page))
  }
  const suffix = query.toString()
  return apiRequest(`/api/v1/conversations${suffix ? `?${suffix}` : ''}`)
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
