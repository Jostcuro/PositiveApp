import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import InboxPage from './InboxPage.tsx'
import { renderWithProviders } from '../../test/renderWithProviders.tsx'
import { setViewportWidth } from '../../test/setup.ts'
import { createFetchMock } from '../../test/fetchMock.ts'
import type { MockRoute } from '../../test/fetchMock.ts'
import type {
  Conversation,
  ConversationDetail,
  CursorPaginated,
  Message,
  OffsetPaginated,
} from './types.ts'

const A = '01HQAAAAAAAAAAAAAAAAAAAAAA'
const B = '01HQBBBBBBBBBBBBBBBBBBBBBB'

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const listBody: OffsetPaginated<Conversation> = {
  data: [
    {
      id: A,
      status: 'open',
      opened_at: '2026-01-01T09:00:00+00:00',
      last_message_at: '2026-01-02T10:00:00+00:00',
      resolved_at: null,
      reopened_count: 0,
      assigned_user: { public_id: '01HQAAAAAAAAAAAAAAAAAAAAAA', name: 'Ana García' },
      contact: { id: 'c-1', display_name: 'María López' },
      last_message: {
        id: 10,
        direction: 'inbound',
        type: 'text',
        body: 'Cierre pendiente',
        sent_by: null,
        created_at: '2026-01-02T10:00:00+00:00',
      },
    },
    {
      id: B,
      status: 'pending',
      opened_at: '2026-01-02T11:00:00+00:00',
      last_message_at: null,
      resolved_at: null,
      reopened_count: 1,
      assigned_user: null,
      contact: { id: 'c-2', display_name: 'Carlos Ruiz' },
      last_message: null,
    },
  ],
  links: { first: null, last: null, prev: null, next: null },
  meta: {
    current_page: 1,
    from: 1,
    last_page: 1,
    per_page: 15,
    path: 'http://localhost/api/v1/conversations',
    to: 2,
    total: 2,
  },
}

const detailA: ConversationDetail = {
  ...listBody.data[0],
  contact: { id: 'c-1', display_name: 'María López', phone_e164: '+34600000000' },
}

const detailB: ConversationDetail = {
  ...listBody.data[1],
  contact: { id: 'c-2', display_name: 'Carlos Ruiz', phone_e164: '+34611111111' },
}

const messagesA: CursorPaginated<Message> = {
  data: [
    { id: 2, direction: 'outbound', type: 'text', body: 'Respuesta A', sent_by: 'Ana García', created_at: '2026-01-02T10:00:00+00:00' },
    { id: 1, direction: 'inbound', type: 'text', body: 'Primer mensaje A', sent_by: null, created_at: '2026-01-02T09:00:00+00:00' },
  ],
  links: { first: null, last: null, prev: null, next: null },
  meta: { path: 'http://localhost/api/v1/conversations', per_page: 30, next_cursor: null, prev_cursor: null },
}

const messagesB: CursorPaginated<Message> = {
  data: [
    { id: 3, direction: 'inbound', type: 'text', body: 'Mensaje B uno', sent_by: null, created_at: '2026-01-02T11:00:00+00:00' },
  ],
  links: { first: null, last: null, prev: null, next: null },
  meta: { path: 'http://localhost/api/v1/conversations', per_page: 30, next_cursor: null, prev_cursor: null },
}

const happyRoutes: MockRoute[] = [
  { method: 'GET', path: `/api/v1/conversations/${A}/messages`, status: 200, body: messagesA },
  { method: 'GET', path: `/api/v1/conversations/${A}`, status: 200, body: { data: detailA } },
  { method: 'GET', path: `/api/v1/conversations/${B}/messages`, status: 200, body: messagesB },
  { method: 'GET', path: `/api/v1/conversations/${B}`, status: 200, body: { data: detailB } },
  { method: 'GET', path: '/api/v1/conversations', status: 200, body: listBody },
]

afterEach(() => {
  vi.unstubAllGlobals()
  setViewportWidth(1024)
})

describe('InboxPage', () => {
  it('carga y muestra la lista de conversaciones', async () => {
    vi.stubGlobal('fetch', createFetchMock(happyRoutes))
    renderWithProviders(<InboxPage />)

    expect(await screen.findByText('María López')).toBeInTheDocument()
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Cierre pendiente')).toBeInTheDocument()
    expect(screen.getByText('Sin mensajes')).toBeInTheDocument()
  })

  it('selecciona la primera conversación por defecto y muestra su historial', async () => {
    vi.stubGlobal('fetch', createFetchMock(happyRoutes))
    renderWithProviders(<InboxPage />)

    expect(await screen.findByText('Primer mensaje A')).toBeInTheDocument()
    expect(screen.getByText('Respuesta A')).toBeInTheDocument()
    expect(screen.getByText('+34600000000')).toBeInTheDocument()
  })

  it('presenta el historial en orden cronológico (antiguo → reciente)', async () => {
    vi.stubGlobal('fetch', createFetchMock(happyRoutes))
    renderWithProviders(<InboxPage />)

    // El backend devuelve `id DESC`; la UI invierte para mostrar el más
    // antiguo arriba (id 1) y el más reciente abajo (id 2).
    const oldest = await screen.findByText('Primer mensaje A')
    const newest = screen.getByText('Respuesta A')
    expect(
      oldest.compareDocumentPosition(newest) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('carga mensajes anteriores, los antepone y deduplica', async () => {
    const firstPage: CursorPaginated<Message> = {
      data: [
        { id: 4, direction: 'outbound', type: 'text', body: 'Cuarto', sent_by: 'Ana García', created_at: '2026-01-02T12:00:00+00:00' },
        { id: 3, direction: 'inbound', type: 'text', body: 'Tercero', sent_by: null, created_at: '2026-01-02T11:00:00+00:00' },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { path: 'http://localhost/api/v1/conversations', per_page: 2, next_cursor: 'CURSOR-OLDER', prev_cursor: null },
    }
    const secondPage: CursorPaginated<Message> = {
      // Repite el id 3 para verificar el dedupe por `message.id`.
      data: [
        { id: 3, direction: 'inbound', type: 'text', body: 'Tercero', sent_by: null, created_at: '2026-01-02T11:00:00+00:00' },
        { id: 2, direction: 'inbound', type: 'text', body: 'Segundo', sent_by: null, created_at: '2026-01-02T10:00:00+00:00' },
        { id: 1, direction: 'inbound', type: 'text', body: 'Primero', sent_by: null, created_at: '2026-01-02T09:00:00+00:00' },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { path: 'http://localhost/api/v1/conversations', per_page: 2, next_cursor: null, prev_cursor: null },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/api/v1/conversations')) return Promise.resolve(json(listBody))
        if (url.includes(`/${A}/messages`) && url.includes('cursor=CURSOR-OLDER')) {
          return Promise.resolve(json(secondPage))
        }
        if (url.endsWith(`/${A}/messages`)) return Promise.resolve(json(firstPage))
        if (url.endsWith(`/${A}`)) return Promise.resolve(json({ data: detailA }))
        return Promise.resolve(json({ message: 'not found' }, 404))
      }),
    )
    renderWithProviders(<InboxPage />)

    const tercero = await screen.findByText('Tercero')
    const cuarto = screen.getByText('Cuarto')
    // Primera página ya en orden cronológico dentro de sí misma.
    expect(tercero.compareDocumentPosition(cuarto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cargar mensajes anteriores' }))

    expect(await screen.findByText('Primero')).toBeInTheDocument()
    expect(screen.getByText('Segundo')).toBeInTheDocument()
    // Dedupe: 'Tercero' aparece una sola vez aunque la página 2 lo repita.
    expect(screen.getAllByText('Tercero')).toHaveLength(1)
    // Prepender: los históricos quedan por encima de los ya visibles.
    const primero = screen.getByText('Primero')
    expect(primero.compareDocumentPosition(tercero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Sin más historial, el control desaparece.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cargar mensajes anteriores' })).not.toBeInTheDocument(),
    )
  })

  it('no dispara peticiones concurrentes al cargar anteriores', async () => {
    const firstPage: CursorPaginated<Message> = {
      data: [
        { id: 2, direction: 'inbound', type: 'text', body: 'Segundo', sent_by: null, created_at: '2026-01-02T10:00:00+00:00' },
        { id: 1, direction: 'inbound', type: 'text', body: 'Primero', sent_by: null, created_at: '2026-01-02T09:00:00+00:00' },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { path: 'http://localhost/api/v1/conversations', per_page: 2, next_cursor: 'CURSOR-ONE', prev_cursor: null },
    }
    let resolveOlder: (value: Response) => void = () => {}
    const older = new Promise<Response>((resolve) => { resolveOlder = resolve })
    const cursorCalls: string[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/api/v1/conversations')) return Promise.resolve(json(listBody))
        if (url.includes(`/${A}/messages`) && url.includes('cursor=CURSOR-ONE')) {
          cursorCalls.push(url)
          return older
        }
        if (url.endsWith(`/${A}/messages`)) return Promise.resolve(json(firstPage))
        if (url.endsWith(`/${A}`)) return Promise.resolve(json({ data: detailA }))
        return Promise.resolve(json({ message: 'not found' }, 404))
      }),
    )
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primero')
    const button = screen.getByRole('button', { name: 'Cargar mensajes anteriores' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(cursorCalls).toHaveLength(1)

    resolveOlder(json({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: { path: 'http://localhost/api/v1/conversations', per_page: 2, next_cursor: null, prev_cursor: null },
    }))
    // Sin más historial el control desaparece; confirma que la única petición
    // en vuelo terminó y actualizó el estado.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cargar mensajes anteriores' })).not.toBeInTheDocument(),
    )
  })

  it('conserva la posición de lectura al prepender mensajes anteriores', async () => {
    const firstPage: CursorPaginated<Message> = {
      data: [
        { id: 102, direction: 'inbound', type: 'text', body: 'Segundo', sent_by: null, created_at: '2026-01-02T10:00:00+00:00' },
        { id: 101, direction: 'inbound', type: 'text', body: 'Primero', sent_by: null, created_at: '2026-01-02T09:00:00+00:00' },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { path: 'http://localhost/api/v1/conversations', per_page: 2, next_cursor: 'CURSOR-SCROLL', prev_cursor: null },
    }
    const secondPage: CursorPaginated<Message> = {
      data: [
        { id: 100, direction: 'inbound', type: 'text', body: 'Anterior uno', sent_by: null, created_at: '2026-01-02T08:00:00+00:00' },
        { id: 99, direction: 'inbound', type: 'text', body: 'Anterior dos', sent_by: null, created_at: '2026-01-02T07:00:00+00:00' },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { path: 'http://localhost/api/v1/conversations', per_page: 2, next_cursor: null, prev_cursor: null },
    }

    let scrollHeight = 1000
    let scrollTop = 0

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/api/v1/conversations')) return Promise.resolve(json(listBody))
        if (url.includes(`/${A}/messages`) && url.includes('cursor=CURSOR-SCROLL')) {
          scrollHeight = 1200
          return Promise.resolve(json(secondPage))
        }
        if (url.endsWith(`/${A}/messages`)) return Promise.resolve(json(firstPage))
        if (url.endsWith(`/${A}`)) return Promise.resolve(json({ data: detailA }))
        return Promise.resolve(json({ message: 'not found' }, 404))
      }),
    )
    renderWithProviders(<InboxPage />)

    await screen.findByText('Segundo')
    const log = screen.getByRole('log')
    Object.defineProperty(log, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    Object.defineProperty(log, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => { scrollTop = value },
    })

    // El usuario está leyendo a mitad del hilo.
    scrollTop = 400
    fireEvent.click(screen.getByRole('button', { name: 'Cargar mensajes anteriores' }))
    await screen.findByText('Anterior uno')

    // 1200 (nueva altura) - 1000 (altura previa) + 400 (posición previa) = 600.
    await waitFor(() => expect(scrollTop).toBe(600))
  })

  it('seleccionar otra conversación carga su detalle y mensajes', async () => {
    setViewportWidth(1400)
    vi.stubGlobal('fetch', createFetchMock(happyRoutes))
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    fireEvent.click(screen.getByRole('button', { name: /Carlos Ruiz/ }))

    expect(await screen.findByText('Mensaje B uno')).toBeInTheDocument()
    expect(screen.queryByText('Primer mensaje A')).not.toBeInTheDocument()
    expect(screen.getAllByText('+34611111111').length).toBeGreaterThan(0)
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay conversaciones', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        {
          method: 'GET',
          path: '/api/v1/conversations',
          status: 200,
          body: { data: [], links: { first: null, last: null, prev: null, next: null }, meta: { ...listBody.meta, from: null, to: null, total: 0 } },
        },
      ]),
    )
    renderWithProviders(<InboxPage />)

    expect(await screen.findByText('No hay conversaciones')).toBeInTheDocument()
  })

  it('muestra error de la lista y permite reintentar', async () => {
    let listAttempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/api/v1/conversations')) {
          listAttempts += 1
          return Promise.resolve(listAttempts === 1 ? json({ message: 'boom' }, 500) : json(listBody))
        }
        return Promise.resolve(json({ message: 'not found' }, 404))
      }),
    )
    renderWithProviders(<InboxPage />)

    expect(await screen.findByText('No se pudieron cargar las conversaciones')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('María López')).toBeInTheDocument()
  })

  it('muestra un mensaje específico cuando la conversación no existe', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: `/api/v1/conversations/${A}/messages`, status: 200, body: messagesA },
        { method: 'GET', path: `/api/v1/conversations/${A}`, status: 404, body: { message: 'Recurso no encontrado.' } },
        { method: 'GET', path: '/api/v1/conversations', status: 200, body: listBody },
      ]),
    )
    renderWithProviders(<InboxPage />)

    expect(await screen.findByText('Conversación no encontrada')).toBeInTheDocument()
  })

  it('no aplica respuestas obsoletas al cambiar de conversación', async () => {
    let resolveADetail: (value: Response) => void = () => {}
    let resolveAMessages: (value: Response) => void = () => {}
    const aDetail = new Promise<Response>((resolve) => { resolveADetail = resolve })
    const aMessages = new Promise<Response>((resolve) => { resolveAMessages = resolve })

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.endsWith('/api/v1/conversations')) return Promise.resolve(json(listBody))
        if (url.endsWith(`/${A}/messages`)) return aMessages
        if (url.endsWith(`/${A}`)) return aDetail
        if (url.endsWith(`/${B}/messages`)) return Promise.resolve(json(messagesB))
        if (url.endsWith(`/${B}`)) return Promise.resolve(json({ data: detailB }))
        return Promise.resolve(json({ message: 'not found' }, 404))
      }),
    )
    renderWithProviders(<InboxPage />)

    await screen.findByText('María López')
    fireEvent.click(screen.getByRole('button', { name: /Carlos Ruiz/ }))
    expect(await screen.findByText('Mensaje B uno')).toBeInTheDocument()

    resolveADetail(json({ data: detailA }))
    resolveAMessages(json(messagesA))

    await waitFor(() => expect(screen.getByText('Mensaje B uno')).toBeInTheDocument())
    expect(screen.queryByText('Primer mensaje A')).not.toBeInTheDocument()
    expect(screen.getByText('+34611111111')).toBeInTheDocument()
  })

  it('el compositor está deshabilitado (integración pendiente)', async () => {
    vi.stubGlobal('fetch', createFetchMock(happyRoutes))
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('en móvil muestra la lista o el historial, no ambos a la vez', async () => {
    setViewportWidth(375)
    vi.stubGlobal('fetch', createFetchMock(happyRoutes))
    renderWithProviders(<InboxPage />)

    expect(await screen.findByText('Carlos Ruiz')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Carlos Ruiz/ }))

    expect(
      await screen.findByRole('button', { name: 'Volver a la lista de conversaciones' }),
    ).toBeInTheDocument()
  })
})
