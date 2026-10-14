import { vi } from 'vitest'

export interface MockRoute {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  status: number
  body?: unknown
  headers?: Record<string, string>
}

const NO_BODY_STATUSES = [204, 205, 304]

/**
 * Crea un `fetch` simulado que responde según las rutas declaradas. Sirve para
 * probar el flujo de autenticación sin depender del backend real.
 */
export function createFetchMock(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init?.method ?? 'GET').toUpperCase()
    const route = routes.find(
      (candidate) =>
        url.includes(candidate.path) && (candidate.method ?? 'GET').toUpperCase() === method,
    )

    if (route === undefined) {
      return new Response(JSON.stringify({ message: `Sin mock para ${method} ${url}` }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }

    if (NO_BODY_STATUSES.includes(route.status)) {
      return new Response(null, { status: route.status })
    }

    return new Response(route.body === undefined ? null : JSON.stringify(route.body), {
      status: route.status,
      headers: { 'content-type': 'application/json', ...(route.headers ?? {}) },
    })
  })
}
