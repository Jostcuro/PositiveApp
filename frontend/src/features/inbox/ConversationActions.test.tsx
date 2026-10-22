import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import InboxPage from './InboxPage.tsx'
import { renderWithProviders, TEST_USER } from '../../test/renderWithProviders.tsx'
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

const listBody: OffsetPaginated<Conversation> = {
  data: [
    {
      id: A,
      status: 'open',
      opened_at: '2026-01-01T09:00:00+00:00',
      last_message_at: '2026-01-02T10:00:00+00:00',
      resolved_at: null,
      reopened_count: 0,
      assigned_user: { public_id: TEST_USER.public_id, name: TEST_USER.name },
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

const readRoutes: MockRoute[] = [
  { method: 'GET', path: `/api/v1/conversations/${A}/messages`, status: 200, body: messagesA },
  { method: 'GET', path: `/api/v1/conversations/${A}`, status: 200, body: { data: detailA } },
  { method: 'GET', path: `/api/v1/conversations/${B}/messages`, status: 200, body: messagesB },
  { method: 'GET', path: `/api/v1/conversations/${B}`, status: 200, body: { data: detailB } },
  { method: 'GET', path: '/api/v1/conversations', status: 200, body: listBody },
]

interface RecordedCall {
  url: string
  method: string
  body: unknown
}

/** Llamadas de escritura registradas por el mock, excluyendo el bootstrap CSRF. */
function writeCalls(fetchMock: ReturnType<typeof createFetchMock>): RecordedCall[] {
  return fetchMock.mock.calls
    .map(([input, init]) => ({
      url: String(input),
      method: (init?.method ?? 'GET').toUpperCase(),
      body: init?.body,
    }))
    .filter((call) => call.method !== 'GET' && !call.url.includes('/sanctum/csrf-cookie'))
}

afterEach(() => {
  vi.unstubAllGlobals()
  setViewportWidth(1024)
})

describe('InboxPage · acciones T09', () => {
  it('asigna al usuario actual con la respuesta confirmada del backend', async () => {
    const updatedB: ConversationDetail = {
      ...detailB,
      assigned_user: { public_id: TEST_USER.public_id, name: TEST_USER.name },
    }
    const fetchMock = createFetchMock([
      { method: 'POST', path: `/api/v1/conversations/${B}/assignment`, status: 200, body: { data: updatedB } },
      ...readRoutes,
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    fireEvent.click(screen.getByRole('button', { name: /Carlos Ruiz/ }))
    await screen.findByText('Mensaje B uno')

    fireEvent.click(screen.getByRole('button', { name: 'Asignarme' }))

    // Sigue en la conversación B y el botón cambia a "Liberar".
    expect(await screen.findByRole('button', { name: 'Liberar' })).toBeInTheDocument()
    expect(screen.getByText('Mensaje B uno')).toBeInTheDocument()

    const calls = writeCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('POST')
    expect(calls[0]?.url).toContain(`/api/v1/conversations/${B}/assignment`)
    expect(JSON.parse(String(calls[0]?.body))).toEqual({ user: TEST_USER.public_id })
  })

  it('libera una conversación asignada al usuario actual', async () => {
    const updatedA: ConversationDetail = { ...detailA, assigned_user: null }
    const fetchMock = createFetchMock([
      { method: 'DELETE', path: `/api/v1/conversations/${A}/assignment`, status: 200, body: { data: updatedA } },
      ...readRoutes,
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    fireEvent.click(screen.getByRole('button', { name: 'Liberar' }))

    expect(await screen.findByRole('button', { name: 'Asignarme' })).toBeInTheDocument()
    expect(screen.getAllByText('Sin asignar').length).toBeGreaterThan(0)

    const calls = writeCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('DELETE')
    expect(calls[0]?.url).toContain(`/api/v1/conversations/${A}/assignment`)
    expect(calls[0]?.body).toBeUndefined()
  })

  it('cambia el estado y ofrece solo transiciones permitidas', async () => {
    const updatedA: ConversationDetail = {
      ...detailA,
      status: 'resolved',
      resolved_at: '2026-01-03T09:00:00+00:00',
    }
    const fetchMock = createFetchMock([
      { method: 'PATCH', path: `/api/v1/conversations/${A}/status`, status: 200, body: { data: updatedA } },
      ...readRoutes,
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Cambiar estado' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Resuelta' }))

    // La mutación termina y la conversación queda en `resolved`: la UI solo
    // ofrece la transición permitida desde ese estado.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Cambiar estado' })).not.toBeDisabled(),
    )
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'Resuelta' })).not.toBeInTheDocument(),
    )

    const calls = writeCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('PATCH')
    expect(JSON.parse(String(calls[0]?.body))).toEqual({ status: 'resolved' })

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Cambiar estado' }))
    expect(await screen.findByRole('option', { name: 'Abierta' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Esperando respuesta' })).not.toBeInTheDocument()
  })

  it('muestra el conflicto devuelto por el backend sin alterar la vista', async () => {
    const fetchMock = createFetchMock([
      {
        method: 'POST',
        path: `/api/v1/conversations/${B}/assignment`,
        status: 409,
        body: { message: 'La conversación ya está asignada.' },
      },
      ...readRoutes,
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    fireEvent.click(screen.getByRole('button', { name: /Carlos Ruiz/ }))
    await screen.findByText('Mensaje B uno')

    fireEvent.click(screen.getByRole('button', { name: 'Asignarme' }))

    expect(await screen.findByText('La conversación ya está asignada.')).toBeInTheDocument()
    // La conversación B sigue sin asignar y el botón sigue disponible.
    expect(screen.getByRole('button', { name: 'Asignarme' })).toBeInTheDocument()
  })

  it('no aplica una respuesta tardía a la conversación seleccionada después', async () => {
    let resolveAssignment: (value: Response) => void = () => {}
    const assignment = new Promise<Response>((resolve) => {
      resolveAssignment = resolve
    })
    const updatedB: ConversationDetail = {
      ...detailB,
      assigned_user: { public_id: TEST_USER.public_id, name: TEST_USER.name },
    }

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'POST' && url.includes(`/api/v1/conversations/${B}/assignment`)) {
        return assignment
      }
      if (method === 'GET' && url.endsWith(`/${B}/messages`)) {
        return Promise.resolve(json(messagesB))
      }
      if (method === 'GET' && url.endsWith(`/${B}`)) {
        return Promise.resolve(json({ data: detailB }))
      }
      if (method === 'GET' && url.endsWith(`/${A}/messages`)) {
        return Promise.resolve(json(messagesA))
      }
      if (method === 'GET' && url.endsWith(`/${A}`)) {
        return Promise.resolve(json({ data: detailA }))
      }
      if (method === 'GET' && url.endsWith('/api/v1/conversations')) {
        return Promise.resolve(json(listBody))
      }
      return Promise.resolve(json({ message: 'not found' }, 404))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<InboxPage />)

    await screen.findByText('Primer mensaje A')
    fireEvent.click(screen.getByRole('button', { name: /Carlos Ruiz/ }))
    await screen.findByText('Mensaje B uno')
    fireEvent.click(screen.getByRole('button', { name: 'Asignarme' }))

    // El usuario vuelve a A antes de que responda la asignación de B.
    fireEvent.click(screen.getByRole('button', { name: /María López/ }))
    await screen.findByText('Primer mensaje A')

    resolveAssignment(json({ data: updatedB }))

    await waitFor(() => {
      // Sigue en A: el detalle de B no se aplicó a la conversación activa.
      expect(screen.getByText('Primer mensaje A')).toBeInTheDocument()
      expect(screen.queryByText('Mensaje B uno')).not.toBeInTheDocument()
    })
    expect(screen.getByText('+34600000000')).toBeInTheDocument()
  })
})

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
