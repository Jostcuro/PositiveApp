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
      assigned_user: { id: 1, name: 'Ana García' },
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
    { id: 1, direction: 'inbound', type: 'text', body: 'Primer mensaje A', sent_by: null, created_at: '2026-01-02T09:00:00+00:00' },
    { id: 2, direction: 'outbound', type: 'text', body: 'Respuesta A', sent_by: 'Ana García', created_at: '2026-01-02T10:00:00+00:00' },
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
