import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './apiClient.ts'
import { ApiError } from './apiError.ts'
import { createFetchMock } from '../../test/fetchMock.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('apiRequest', () => {
  it('devuelve el cuerpo JSON en peticiones correctas', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([{ method: 'GET', path: '/api/v1/auth/me', status: 200, body: { data: { id: 1 } } }]),
    )

    await expect(apiRequest('/api/v1/auth/me')).resolves.toEqual({ data: { id: 1 } })
  })

  it('adjunta el encabezado X-XSRF-TOKEN en peticiones que cambian estado', async () => {
    document.cookie = `XSRF-TOKEN=${encodeURIComponent('token-de-prueba')}; path=/`
    const fetchMock = createFetchMock([
      { method: 'POST', path: '/api/v1/auth/login', status: 200, body: { data: { id: 1 } } },
    ])
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c' } })

    const [, init] = fetchMock.mock.calls[0]
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers['X-XSRF-TOKEN']).toBe('token-de-prueba')
    expect(init?.body).toBe(JSON.stringify({ email: 'a@b.c' }))
  })

  it('normaliza los errores de validación en ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        {
          method: 'POST',
          path: '/api/v1/auth/login',
          status: 422,
          body: { message: 'Datos inválidos', errors: { email: ['El correo es obligatorio.'] } },
        },
      ]),
    )

    const error = await apiRequest('/api/v1/auth/login', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      message: 'Datos inválidos',
      errors: { email: ['El correo es obligatorio.'] },
    })
  })
})
