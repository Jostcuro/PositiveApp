import { useCallback, useEffect, useRef, useState } from 'react'
import {
  assignConversation,
  changeConversationStatus,
  fetchConversation,
  unassignConversation,
} from './api.ts'
import { describeError } from './errorMessage.ts'
import { useConversationList, type ConversationListPagination } from './useConversationList.ts'
import { useConversationMessages, type MessagesPagination } from './useConversationMessages.ts'
import type { AsyncState, ConversationDetail, ConversationStatus } from './types.ts'

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
 *
 * El setter permite publicar una versión confirmada por el backend (respuesta
 * de una mutación) sin disparar una petición adicional ni mostrar un estado de
 * carga transitorio.
 */
function useKeyedResource<T>(
  key: string | null,
  version: number,
  load: (key: string) => Promise<T>,
): [AsyncState<T>, (data: T) => void] {
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

  const setData = useCallback(
    (data: T) => {
      if (requestKey === null) return
      setResult({ key: requestKey, state: { status: 'success', data, error: null } })
    },
    [requestKey],
  )

  if (requestKey === null || result === null || result.key !== requestKey) {
    return [IDLE, setData]
  }

  return [result.state, setData]
}

export interface InboxMutations {
  /** true mientras una mutación está en curso. */
  pending: boolean
  /** Error de la última mutación, ya traducido para la UI. */
  error: string | null
  assign: (targetPublicId: string) => Promise<void>
  unassign: () => Promise<void>
  changeStatus: (status: ConversationStatus) => Promise<void>
  clearError: () => void
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
  mutations: InboxMutations
}

/**
 * Datos del Inbox contra el read API T06B y las mutaciones internas T09.
 * Concentra la lista acumulada, la selección por `public_id`, el detalle, los
 * mensajes y las acciones de asignación/estado, además de la cancelación de
 * respuestas obsoletas al cambiar de conversación.
 *
 * Tras una mutación se usa la respuesta confirmada del backend (nunca un cambio
 * optimista) para actualizar el detalle y el elemento correspondiente de la
 * lista. Si la selección cambió durante la petición, solo se actualiza la
 * lista, evitando aplicar el resultado a otra conversación.
 *
 * El 401 no se maneja aquí: `apiClient` notifica al handler central registrado
 * por `AuthProvider`.
 */
export function useInboxData(): InboxData {
  const [selectedPublicId, setSelectedPublicId] = useState<string | null>(null)
  const [detailNonce, setDetailNonce] = useState(0)
  const [messagesNonce, setMessagesNonce] = useState(0)
  const [mutation, setMutation] = useState<{ pending: boolean; error: string | null }>({
    pending: false,
    error: null,
  })

  const list = useConversationList()
  // La selección explícita manda; sin ella, se usa la primera conversación cargada.
  // Un `loadMore` o `refresh` no cambia la selección una vez elegida.
  const activePublicId = selectedPublicId ?? list.items[0]?.id ?? null
  const [detail, setDetailData] = useKeyedResource(activePublicId, detailNonce, loadDetail)
  const messages = useConversationMessages(activePublicId, messagesNonce)

  const activePublicIdRef = useRef(activePublicId)

  useEffect(() => {
    activePublicIdRef.current = activePublicId
  }, [activePublicId])

  const updateItem = list.updateItem

  const applyConversationUpdate = useCallback(
    (updated: ConversationDetail) => {
      updateItem(updated)
      if (updated.id === activePublicIdRef.current) {
        setDetailData(updated)
      }
    },
    [updateItem, setDetailData],
  )

  const runMutation = useCallback(
    async (operation: (publicId: string) => Promise<ConversationDetail>) => {
      const publicId = activePublicIdRef.current
      if (publicId === null) return

      setMutation({ pending: true, error: null })

      try {
        const updated = await operation(publicId)
        applyConversationUpdate(updated)
        setMutation({ pending: false, error: null })
      } catch (error) {
        setMutation({ pending: false, error: describeError(error) })
      }
    },
    [applyConversationUpdate],
  )

  const assign = useCallback(
    (targetPublicId: string) =>
      runMutation(async (publicId) => (await assignConversation(publicId, targetPublicId)).data),
    [runMutation],
  )

  const unassign = useCallback(
    () => runMutation(async (publicId) => (await unassignConversation(publicId)).data),
    [runMutation],
  )

  const changeStatus = useCallback(
    (status: ConversationStatus) =>
      runMutation(async (publicId) => (await changeConversationStatus(publicId, status)).data),
    [runMutation],
  )

  const clearError = useCallback(
    () => setMutation((previous) => ({ ...previous, error: null })),
    [],
  )

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
    mutations: { ...mutation, assign, unassign, changeStatus, clearError },
  }
}
