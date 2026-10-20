import { useCallback, useEffect, useState } from 'react'
import { fetchConversation } from './api.ts'
import { useConversationList, type ConversationListPagination } from './useConversationList.ts'
import { useConversationMessages, type MessagesPagination } from './useConversationMessages.ts'
import type { AsyncState, ConversationDetail } from './types.ts'

const IDLE: AsyncState<never> = { status: 'loading', data: null, error: null }

const loadDetail = (id: string): Promise<ConversationDetail> =>
  fetchConversation(id).then((r) => r.data)

interface Keyed<T> {
  key: string
  state: AsyncState<T>
}

/**
 * Carga un recurso identificado por `key` (null = sin recurso) e ignora
 * respuestas obsoletas: si la clave cambia, el resultado previo deja de ser
 * válido aunque su petición aún no haya terminado. `version` fuerza un refetch.
 */
function useKeyedResource<T>(
  key: string | null,
  version: number,
  load: (key: string) => Promise<T>,
): AsyncState<T> {
  const [result, setResult] = useState<Keyed<T> | null>(null)
  const requestKey = key === null ? null : `${version}:${key}`

  useEffect(() => {
    if (key === null || requestKey === null) return undefined

    let active = true
    load(key).then(
      (data) => {
        if (active) setResult({ key: requestKey, state: { status: 'success', data, error: null } })
      },
      (error: unknown) => {
        if (active) setResult({ key: requestKey, state: { status: 'error', data: null, error } })
      },
    )

    return () => {
      active = false
    }
  }, [requestKey, key, load])

  if (requestKey === null || result === null || result.key !== requestKey) {
    return IDLE
  }

  return result.state
}

export interface InboxData {
  list: ConversationListPagination
  detail: AsyncState<ConversationDetail>
  reloadDetail: () => void
  messages: MessagesPagination
  reloadMessages: () => void
  selectedPublicId: string | null
  activePublicId: string | null
  selectConversation: (publicId: string | null) => void
}

/**
 * Datos del Inbox contra el read API T06B. Concentra la lista acumulada, la
 * selección por `public_id`, el detalle y los mensajes, además de la
 * cancelación de respuestas obsoletas al cambiar de conversación.
 *
 * El 401 no se maneja aquí: `apiClient` notifica al handler central registrado
 * por `AuthProvider`.
 */
export function useInboxData(): InboxData {
  const [selectedPublicId, setSelectedPublicId] = useState<string | null>(null)
  const [detailNonce, setDetailNonce] = useState(0)
  const [messagesNonce, setMessagesNonce] = useState(0)

  const list = useConversationList()
  // La selección explícita manda; sin ella, se usa la primera conversación cargada.
  // Un `loadMore` o `refresh` no cambia la selección una vez elegida.
  const activePublicId = selectedPublicId ?? list.items[0]?.id ?? null
  const detail = useKeyedResource(activePublicId, detailNonce, loadDetail)
  const messages = useConversationMessages(activePublicId, messagesNonce)

  const reloadDetail = useCallback(() => setDetailNonce((value) => value + 1), [])
  const reloadMessages = useCallback(() => setMessagesNonce((value) => value + 1), [])
  const selectConversation = useCallback((publicId: string | null) => {
    setSelectedPublicId(publicId)
  }, [])

  return {
    list,
    detail,
    reloadDetail,
    messages,
    reloadMessages,
    selectedPublicId,
    activePublicId,
    selectConversation,
  }
}
