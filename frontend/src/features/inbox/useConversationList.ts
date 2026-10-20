import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversations } from './api.ts'
import { describeError } from './errorMessage.ts'
import type { Conversation, OffsetPaginationMeta } from './types.ts'

export type ConversationListStatus = 'loading' | 'ready' | 'error'

export interface ConversationListPagination {
  /** Conversaciones acumuladas, sin duplicados por `public_id`, en orden de llegada. */
  items: Conversation[]
  /** Metadatos de la última página recibida; null antes de la primera respuesta. */
  meta: OffsetPaginationMeta | null
  /** Estado de la carga inicial. Un refresco con datos no lo cambia a 'error'. */
  status: ConversationListStatus
  /** Mensaje de error de la carga inicial, ya traducido para la UI. */
  error: string | null
  /** Error del último refresco cuando ya había datos (la lista sigue visible). */
  refreshError: string | null
  /** true mientras se carga una página siguiente. */
  loadingMore: boolean
  /** Error de la última carga de página siguiente (null si no hubo). */
  loadMoreError: string | null
  /** Quedan páginas por cargar según `meta.current_page < meta.last_page`. */
  hasMore: boolean
  /** Carga la página siguiente derivada de `meta.current_page`; no-op si no procede. */
  loadMore: () => void
  /** Reinicia desde la página 1 y reemplaza la lista acumulada. */
  refresh: () => void
}

interface ListState {
  items: Conversation[]
  meta: OffsetPaginationMeta | null
  status: ConversationListStatus
  error: string | null
  refreshError: string | null
  loadingMore: boolean
  loadMoreError: string | null
}

const INITIAL: ListState = {
  items: [],
  meta: null,
  status: 'loading',
  error: null,
  refreshError: null,
  loadingMore: false,
  loadMoreError: null,
}

/** Une páginas conservando la primera aparición de cada `public_id`. */
function mergeUnique(current: Conversation[], incoming: Conversation[]): Conversation[] {
  const seen = new Set(current.map((conversation) => conversation.id))
  const merged = [...current]
  for (const conversation of incoming) {
    if (!seen.has(conversation.id)) {
      seen.add(conversation.id)
      merged.push(conversation)
    }
  }
  return merged
}

/**
 * Lista acumulada del Inbox con paginación offset (T08, ADR-007).
 *
 * No gestiona la selección de conversación. Descarta respuestas tardías por
 * generación (un `refresh` invalida las peticiones en vuelo) y evita cargas
 * concurrentes de la misma página. La página siguiente se deriva únicamente de
 * `meta.current_page` del servidor, nunca de input del usuario.
 */
export function useConversationList(): ConversationListPagination {
  const [state, setState] = useState<ListState>(INITIAL)

  const generationRef = useRef(0)
  const loadingMoreRef = useRef(false)
  // Bloquea la paginación mientras un refresco va a sustituir la meta vigente.
  const refreshingRef = useRef(false)
  const mountedRef = useRef(true)
  const initialLoadStartedRef = useRef(false)
  // La meta se publica de forma síncrona junto al estado que la origina: así
  // `loadMore` nunca lee un valor nulo u obsoleto por un efecto diferido.
  const metaRef = useRef<OffsetPaginationMeta | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(() => {
    const generation = generationRef.current + 1
    generationRef.current = generation
    refreshingRef.current = true
    loadingMoreRef.current = false

    // No se vacían los datos previos: si el refresco falla, la lista sigue visible.
    setState((previous) => ({
      ...previous,
      status: previous.items.length === 0 ? 'loading' : previous.status,
      error: null,
      refreshError: null,
      loadingMore: false,
      loadMoreError: null,
    }))

    fetchConversations(1).then(
      (page) => {
        if (!mountedRef.current || generationRef.current !== generation) return
        metaRef.current = page.meta
        setState({
          items: page.data,
          meta: page.meta,
          status: 'ready',
          error: null,
          refreshError: null,
          loadingMore: false,
          loadMoreError: null,
        })
      },
      (error: unknown) => {
        if (!mountedRef.current || generationRef.current !== generation) return
        setState((previous) => {
          const message = describeError(error)
          // Con datos ya cargados el refresco fallido no rompe la vista: aviso inline.
          if (previous.items.length > 0) {
            return {
              ...previous,
              status: 'ready',
              error: null,
              refreshError: message,
              loadingMore: false,
              loadMoreError: null,
            }
          }
          return {
            ...previous,
            status: 'error',
            error: message,
            refreshError: null,
            loadingMore: false,
            loadMoreError: null,
          }
        })
      },
    ).finally(() => {
      // Un refresco obsoleto no debe reactivar la paginación de uno más reciente.
      if (generationRef.current === generation) refreshingRef.current = false
    })
  }, [])

  useEffect(() => {
    // StrictMode ejecuta los efectos dos veces; el ref evita la doble carga inicial.
    if (initialLoadStartedRef.current) return
    initialLoadStartedRef.current = true
    refresh()
  }, [refresh])

  const loadMore = useCallback(() => {
    const meta = metaRef.current
    if (refreshingRef.current || loadingMoreRef.current || meta === null) return
    if (meta.current_page >= meta.last_page) return

    loadingMoreRef.current = true
    const generation = generationRef.current

    setState((previous) => ({ ...previous, loadingMore: true, loadMoreError: null }))

    fetchConversations(meta.current_page + 1)
      .then(
        (page) => {
          if (!mountedRef.current || generationRef.current !== generation) return
          metaRef.current = page.meta
          setState((previous) => ({
            items: mergeUnique(previous.items, page.data),
            meta: page.meta,
            status: 'ready',
            error: null,
            refreshError: null,
            loadingMore: false,
            loadMoreError: null,
          }))
        },
        (error: unknown) => {
          if (!mountedRef.current || generationRef.current !== generation) return
          // Se conservan items y meta intactos para permitir reintentar la misma página.
          setState((previous) => ({
            ...previous,
            loadingMore: false,
            loadMoreError: describeError(error),
          }))
        },
      )
      .finally(() => {
        if (generationRef.current === generation) loadingMoreRef.current = false
      })
  }, [])

  const hasMore = state.meta !== null && state.meta.current_page < state.meta.last_page

  return {
    items: state.items,
    meta: state.meta,
    status: state.status,
    error: state.error,
    refreshError: state.refreshError,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError,
    hasMore,
    loadMore,
    refresh,
  }
}
