import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import InboxPage from './InboxPage.tsx'
import { renderWithProviders } from '../../test/renderWithProviders.tsx'
import { setViewportWidth } from '../../test/setup.ts'
import type {
  Conversation,
  ConversationDetail,
  CursorPaginated,
  Message,
  OffsetPaginated,
} from './types.ts'

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function baseConversation(id: string, name: string): Conversation {
  return {
    id,
    status: 'open',
    opened_at: null,
    last_message_at: null,
    resolved_at: null,
    reopened_count: 0,
    assigned_user: null,
    contact: { id: `c-${id}`, display_name: name },
    last_message: null,
  }
}

const A = baseConversation('A', 'Ana Uno')
const B = baseConversation('B', 'Bea Dos')
const C = baseConversation('C', 'Caro Tres')
const D = baseConversation('D', 'Dani Cuatro')
const E = baseConversation('E', 'Elena Cinco')
const F = baseConversation('F', 'Fabio Seis')

const DETAIL: Record<string, ConversationDetail> = {
  A: { ...A, contact: { ...A.contact, phone_e164: '+34600000000' } },
  B: { ...B, contact: { ...B.contact, phone_e164: '+34611111111' } },
  C: { ...C, contact: { ...C.contact, phone_e164: '+34622222222' } },
  D: { ...D, contact: { ...D.contact, phone_e164: '+34633333333' } },
  E: { ...E, contact: { ...E.contact, phone_e164: '+34644444444' } },
  F: { ...F, contact: { ...F.contact, phone_e164: '+34655555555' } },
}

function detailFor(id: string): ConversationDetail {
  return DETAIL[id] ?? DETAIL.A
}

function messagesFor(id: string): CursorPaginated<Message> {
  return {
    data: [
      {
        id: 1,
        direction: 'inbound',
        type: 'text',
        body: `msg-${id}`,
        sent_by: null,
        created_at: '2026-01-01T09:00:00+00:00',
      },
    ],
    links: { first: null, last: null, prev: null, next: null },
    meta: { path: 'http://localhost/api/v1/conversations', per_page: 30, next_cursor: null, prev_cursor: null },
  }
}

function offsetBody(
  data: Conversation[],
  currentPage: number,
  lastPage: number,
  total: number,
): OffsetPaginated<Conversation> {
  const perPage = 3
  return {
    data,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: currentPage,
      from: data.length > 0 ? (currentPage - 1) * perPage + 1 : null,
      to: (currentPage - 1) * perPage + data.length || null,
      last_page: lastPage,
      per_page: perPage,
      path: 'http://localhost/api/v1/conversations',
      total,
    },
  }
}

interface Harness {
  fetchMock: ReturnType<typeof vi.fn>
  listPages: number[]
  listUrls: string[]
  detailCalls: string[]
  messageCalls: string[]
}

type ListResponder = (page: number) => Response | Promise<Response>

/**
 * Stub de `fetch` local al archivo. Parsea la URL con `new URL` y lee
 * `searchParams.get('page')` para no confundir `page=2` con `page=20`.
 */
function makeHarness(listResponder: ListResponder): Harness {
  const listPages: number[] = []
  const listUrls: string[] = []
  const detailCalls: string[] = []
  const messageCalls: string[] = []

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const parsed = new URL(url, 'http://localhost')
    const pathname = parsed.pathname

    if (pathname === '/api/v1/conversations') {
      const page = Number(parsed.searchParams.get('page') ?? '1')
      listPages.push(page)
      listUrls.push(url)
      return Promise.resolve(listResponder(page))
    }

    const messages = pathname.match(/^\/api\/v1\/conversations\/([^/]+)\/messages$/)
    if (messages !== null) {
      const id = decodeURIComponent(messages[1])
      messageCalls.push(id)
      return Promise.resolve(json(messagesFor(id)))
    }

    const detail = pathname.match(/^\/api\/v1\/conversations\/([^/]+)$/)
    if (detail !== null) {
      const id = decodeURIComponent(detail[1])
      detailCalls.push(id)
      return Promise.resolve(json({ data: detailFor(id) }))
    }

    return Promise.resolve(json({ message: 'not found' }, 404))
  })

  return { fetchMock, listPages, listUrls, detailCalls, messageCalls }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.unstubAllGlobals()
  setViewportWidth(1024)
})

describe('Inbox listado — paginación incremental (T08)', () => {
  it('T1: la carga inicial no envía query de página', async () => {
    const harness = makeHarness((page) =>
      json(page === 1 ? offsetBody([A, B, C], 1, 2, 4) : offsetBody([D], 2, 2, 4)),
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })

    expect(harness.listPages).toEqual([1])
    expect(harness.listUrls[0]).toBe('/api/v1/conversations')
    expect(new URL(harness.listUrls[0], 'http://localhost').searchParams.has('page')).toBe(false)
  })

  it('T2: «Cargar más» es visible cuando current_page < last_page', async () => {
    const harness = makeHarness((page) =>
      json(page === 1 ? offsetBody([A, B, C], 1, 2, 4) : offsetBody([D], 2, 2, 4)),
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    expect(
      await screen.findByRole('button', { name: 'Cargar más conversaciones' }),
    ).toBeInTheDocument()
  })

  it('T2b: «Cargar más» está oculto en la última página', async () => {
    const harness = makeHarness(() => json(offsetBody([A, B, C], 1, 1, 3)))
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    expect(
      screen.queryByRole('button', { name: 'Cargar más conversaciones' }),
    ).not.toBeInTheDocument()
  })

  it('T3: al pulsar «Cargar más» pide exactamente page=2 y anexa los items', async () => {
    const harness = makeHarness((page) =>
      json(page === 1 ? offsetBody([A, B, C], 1, 2, 4) : offsetBody([D], 2, 2, 4)),
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))

    expect(await screen.findByRole('button', { name: /Dani Cuatro/ })).toBeInTheDocument()

    expect(harness.listPages).toEqual([1, 2])
    const pageTwoUrl = harness.listUrls[1]
    const parsed = new URL(pageTwoUrl, 'http://localhost')
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.has('per_page')).toBe(false)
  })

  it('T4: deduplica por public_id si la página 2 repite un item de la página 1', async () => {
    const harness = makeHarness((page) =>
      json(page === 1 ? offsetBody([A, B, C], 1, 2, 4) : offsetBody([B, D], 2, 2, 4)),
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))

    expect(await screen.findByRole('button', { name: /Dani Cuatro/ })).toBeInTheDocument()
    expect(screen.getAllByText('Bea Dos')).toHaveLength(1)
  })

  it('T5: doble clic rápido dispara una sola petición a page=2', async () => {
    const pageTwo = deferred<Response>()
    const harness = makeHarness((page) =>
      page === 1 ? json(offsetBody([A, B, C], 1, 2, 4)) : pageTwo.promise,
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    const button = screen.getByRole('button', { name: 'Cargar más conversaciones' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(harness.listPages.filter((page) => page === 2)).toHaveLength(1)

    pageTwo.resolve(json(offsetBody([D], 2, 2, 4)))
    expect(await screen.findByRole('button', { name: /Dani Cuatro/ })).toBeInTheDocument()
  })

  it('T6: «Refrescar» vuelve a la página 1, reemplaza la lista y conserva la selección', async () => {
    const harness = makeHarness((page) =>
      json(page === 1 ? offsetBody([A, B, C], 1, 2, 4) : offsetBody([D], 2, 2, 4)),
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    fireEvent.click(screen.getByRole('button', { name: /Bea Dos/ }))
    await screen.findByText('msg-B')

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))
    expect(await screen.findByRole('button', { name: /Dani Cuatro/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }))

    await waitFor(() => expect(harness.listPages).toEqual([1, 2, 1]))
    // La lista acumulada se reemplaza: D ya no está.
    expect(screen.queryByRole('button', { name: /Dani Cuatro/ })).not.toBeInTheDocument()
    // La selección previa (B) se mantiene.
    expect(screen.getByText('msg-B')).toBeInTheDocument()
  })

  it('T7: una respuesta tardía de page=2 no modifica la lista tras refrescar', async () => {
    const pageTwo = deferred<Response>()
    const harness = makeHarness((page) =>
      page === 1 ? json(offsetBody([A, B, C], 1, 2, 4)) : pageTwo.promise,
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))
    expect(harness.listPages).toEqual([1, 2])

    fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }))
    await waitFor(() => expect(harness.listPages).toEqual([1, 2, 1]))

    // Se resuelve dentro de act() y se drena la cadena fetch → json → handler
    // antes de afirmar. Así la ausencia de D prueba que el handler se ejecutó y
    // descartó la respuesta tardía, no que la respuesta aún no había llegado.
    await act(async () => {
      pageTwo.resolve(json(offsetBody([D], 2, 2, 4)))
      // Macrotarea de 0 ms: vacía todos los microtasks pendientes de la cadena.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
    })

    expect(screen.queryByRole('button', { name: /Dani Cuatro/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ana Uno/ })).toBeInTheDocument()
  })

  it('T8: error en page=2 conserva items, muestra error y Reintentar recarga', async () => {
    let pageTwoAttempts = 0
    const harness = makeHarness((page) => {
      if (page === 1) return json(offsetBody([A, B, C], 1, 2, 4))
      pageTwoAttempts += 1
      return pageTwoAttempts === 1 ? json({ message: 'boom' }, 500) : json(offsetBody([D], 2, 2, 4))
    })
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))

    expect(
      await screen.findByText('El servidor no está disponible en este momento.'),
    ).toBeInTheDocument()
    // Los items previos siguen visibles.
    expect(screen.getByRole('button', { name: /Ana Uno/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Caro Tres/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: /Dani Cuatro/ })).toBeInTheDocument()
  })

  it('T9: la selección es estable y no repite detalle/mensajes tras «Cargar más»', async () => {
    const harness = makeHarness((page) =>
      json(page === 1 ? offsetBody([A, B, C], 1, 2, 4) : offsetBody([D], 2, 2, 4)),
    )
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('msg-A')
    expect(harness.detailCalls).toEqual(['A'])
    expect(harness.messageCalls).toEqual(['A'])

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))
    await screen.findByRole('button', { name: /Dani Cuatro/ })

    expect(harness.detailCalls).toEqual(['A'])
    expect(harness.messageCalls).toEqual(['A'])
  })

  it('T10: si la conversación seleccionada sale de la página 1, el hilo sigue mostrándose', async () => {
    let pageOneAttempts = 0
    const harness = makeHarness((page) => {
      if (page !== 1) return json(offsetBody([D], 2, 2, 4))
      pageOneAttempts += 1
      return pageOneAttempts === 1
        ? json(offsetBody([A, B, C], 1, 2, 4))
        : json(offsetBody([B, C], 1, 1, 2))
    })
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('msg-A')
    // Selección explícita de A.
    fireEvent.click(screen.getByRole('button', { name: /Ana Uno/ }))
    await screen.findByText('msg-A')

    fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }))
    await waitFor(() => expect(harness.listPages).toEqual([1, 1]))

    // A ya no está en la página 1, pero el hilo sigue mostrando su historial.
    expect(screen.queryByRole('button', { name: /Ana Uno/ })).not.toBeInTheDocument()
    expect(screen.getByText('msg-A')).toBeInTheDocument()
  })

  it('T11: StrictMode hace una sola petición inicial y aplica la respuesta', async () => {
    const harness = makeHarness(() => json(offsetBody([A, B, C], 1, 1, 3)))
    vi.stubGlobal('fetch', harness.fetchMock)

    renderWithProviders(
      <StrictMode>
        <InboxPage />
      </StrictMode>,
    )

    // La respuesta se aplica: la lista es visible.
    expect(await screen.findByRole('button', { name: /Ana Uno/ })).toBeInTheDocument()
    // El doble efecto de StrictMode no dispara una segunda carga inicial.
    expect(harness.listPages).toEqual([1])
  })

  it('T12: un refresco fallido con datos mantiene la lista y muestra aviso inline', async () => {
    let pageOneAttempts = 0
    const harness = makeHarness((page) => {
      if (page !== 1) return json(offsetBody([D], 2, 2, 4))
      pageOneAttempts += 1
      if (pageOneAttempts === 2) return json({ message: 'boom' }, 500)
      return json(offsetBody([A, B, C], 1, 2, 4))
    })
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }))

    expect(
      await screen.findByText('El servidor no está disponible en este momento.'),
    ).toBeInTheDocument()
    // Los datos permanecen y no se cae al EmptyState de error.
    expect(screen.getByRole('button', { name: /Ana Uno/ })).toBeInTheDocument()
    expect(screen.queryByText('No se pudieron cargar las conversaciones')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(
        screen.queryByText('El servidor no está disponible en este momento.'),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /Ana Uno/ })).toBeInTheDocument()
  })

  it('T13: loadMore durante un refresco en vuelo no mezcla datos de generaciones distintas', async () => {
    const refreshResponse = deferred<Response>()
    const pageTwo = deferred<Response>()
    let listCalls = 0
    const harness = makeHarness((page) => {
      if (page === 2) return pageTwo.promise
      listCalls += 1
      return listCalls === 1
        ? json(offsetBody([A, B, C], 1, 2, 4))
        : refreshResponse.promise
    })
    vi.stubGlobal('fetch', harness.fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByRole('button', { name: /Ana Uno/ })

    // Refresco en vuelo y, sin esperarlo, intento de paginar.
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }))
    await waitFor(() => expect(harness.listPages).toEqual([1, 1]))
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))

    const requestedPageTwo = harness.listPages.includes(2)

    // Primero resuelve la generación nueva; después, la respuesta tardía de page=2.
    await act(async () => {
      refreshResponse.resolve(json(offsetBody([E, F], 1, 2, 4)))
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
    })
    await act(async () => {
      pageTwo.resolve(json(offsetBody([D], 2, 2, 4)))
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
    })

    // La lista final refleja solo la generación nueva.
    expect(screen.getByRole('button', { name: /Elena Cinco/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dani Cuatro/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ana Uno/ })).not.toBeInTheDocument()
    // La corrección evita que se llegue a pedir page=2 durante el refresco.
    expect(requestedPageTwo).toBe(false)
  })
})
