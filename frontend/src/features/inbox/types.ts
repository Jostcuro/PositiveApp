// Tipos del contrato de lectura T06B. Reflejan lo que el backend expone
// realmente (ver docs/decisions/ADR-005-read-api-conversations-messages.md y
// backend/app/Http/Resources). No añadir campos que no existan en el contrato.

export type ConversationStatus = 'open' | 'pending' | 'resolved'

export type MessageDirection = 'inbound' | 'outbound'

export interface AssignedUser {
  public_id: string
  name: string
}

export interface Contact {
  id: string
  display_name: string | null
}

export interface ContactDetail extends Contact {
  phone_e164: string | null
}

export interface Message {
  id: number
  direction: MessageDirection
  type: string
  body: string | null
  sent_by: string | null
  created_at: string | null
}

export interface Conversation {
  id: string
  status: ConversationStatus
  opened_at: string | null
  last_message_at: string | null
  resolved_at: string | null
  reopened_count: number
  assigned_user: AssignedUser | null
  contact: Contact
  last_message: Message | null
}

export interface ConversationDetail extends Omit<Conversation, 'contact'> {
  contact: ContactDetail
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface OffsetPaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  path: string
  to: number | null
  total: number
}

export interface CursorPaginationMeta {
  path: string
  per_page: number
  next_cursor: string | null
  prev_cursor: string | null
}

export interface OffsetPaginated<T> {
  data: T[]
  links: PaginationLinks
  meta: OffsetPaginationMeta
}

export interface CursorPaginated<T> {
  data: T[]
  links: PaginationLinks
  meta: CursorPaginationMeta
}

export type AsyncStatus = 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: unknown
}
