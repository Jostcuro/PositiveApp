import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversationMessages } from './api.ts'
import type { AsyncState, AsyncStatus, Message } from './types.ts'

export interface MessagesPagination {
  /** Historial acumulado, normalizado a orden cronológico (antiguo → reciente). */
  state: AsyncState<Message[]>
  /** true si queda `next_cursor` (hay mensajes anteriores por cargar). */
  hasOlder: boolean
  /** true mientras se carga una página anterior. */
  loadingOlder: boolean
  /** Error de la última carga de página anterior (null si no hubo). */
  loadOlderError: unknown
  /** Carga la siguiente página de mensajes anteriores; no-op si no procede. */
  loadOlder: () => void
}

const LOADING: AsyncState<Message[]> = { status: 'loading', data: null, error: null }

interface MessagesData {
  key: string
  status: AsyncStatus
  data: Message[] | null
  error: unknown
  nextCursor: string | null
  loadingOlder: boolean
  loadOlderError: unknown
}

/**
 * Historial de mensajes de una conversación con paginación keyset (T06B).
 *
 * El backend devuelve los mensajes más recientes primero (`id DESC`). Este hook
 * normaliza cada página al orden cronológico (antiguo → reciente) y agrega las
 * páginas anteriores al principio. Descarta respuestas tardías cuando cambia la
 * conversación y evita peticiones concurrentes de la misma página.
 */
export function useConversationMessages(
  publicId: string | null,
  version: number,
): MessagesPagination {
  const requestKey = publicId === null ? null : `${version}:${publicId}`

  const [data, setData] = useState<MessagesData | null>(null)

  const activeKeyRef = useRef<string | null>(null)
  const nextCursorRef = useRef<string | null>(null)
  const loadingOlderRef = useRef(false)

  useEffect(() => {
    if (requestKey === null || publicId === null) return undefined

    activeKeyRef.current = requestKey
    nextCursorRef.current = null
    loadingOlderRef.current = false

    let active = true
    fetchConversationMessages(publicId).then(
      (page) => {
        if (!active) return
        nextCursorRef.current = page.meta.next_cursor
        setData({
          key: requestKey,
          status: 'success',
          data: [...page.data].reverse(),
          error: null,
          nextCursor: page.meta.next_cursor,
          loadingOlder: false,
          loadOlderError: null,
        })
      },
      (error: unknown) => {
        if (active) {
          setData({
            key: requestKey,
            status: 'error',
            data: null,
            error,
            nextCursor: null,
            loadingOlder: false,
            loadOlderError: null,
          })
        }
      },
    )

    return () => {
      active = false
    }
  }, [requestKey, publicId])

  const loadOlder = useCallback(() => {
    const key = activeKeyRef.current
    const cursor = nextCursorRef.current
    if (publicId === null || key === null || cursor === null || loadingOlderRef.current) return

    loadingOlderRef.current = true
    setData((previous) =>
      previous !== null && previous.key === key
        ? { ...previous, loadingOlder: true, loadOlderError: null }
        : previous,
    )

    fetchConversationMessages(publicId, cursor)
      .then(
        (page) => {
          if (activeKeyRef.current !== key) return
          nextCursorRef.current = page.meta.next_cursor
          const older = [...page.data].reverse()
          setData((previous) => {
            if (previous === null || previous.key !== key) return previous
            const existing = previous.data ?? []
            const seen = new Set(existing.map((message) => message.id))
            const merged = [...older.filter((message) => !seen.has(message.id)), ...existing]
            return {
              ...previous,
              status: 'success',
              data: merged,
              error: null,
              nextCursor: page.meta.next_cursor,
              loadingOlder: false,
              loadOlderError: null,
            }
          })
        },
        (error: unknown) => {
          if (activeKeyRef.current !== key) return
          setData((previous) =>
            previous !== null && previous.key === key
              ? { ...previous, loadingOlder: false, loadOlderError: error }
              : previous,
          )
        },
      )
      .finally(() => {
        if (activeKeyRef.current === key) loadingOlderRef.current = false
      })
  }, [publicId])

  const isCurrent = requestKey !== null && data !== null && data.key === requestKey

  if (!isCurrent) {
    return {
      state: LOADING,
      hasOlder: false,
      loadingOlder: false,
      loadOlderError: null,
      loadOlder,
    }
  }

  return {
    state: { status: data.status, data: data.data, error: data.error },
    hasOlder: data.nextCursor !== null,
    loadingOlder: data.loadingOlder,
    loadOlderError: data.loadOlderError,
    loadOlder,
  }
}
