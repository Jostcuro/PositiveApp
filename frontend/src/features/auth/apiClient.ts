import { ApiError } from './apiError.ts'
import type { ApiValidationErrors } from './apiError.ts'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const CSRF_COOKIE = 'XSRF-TOKEN'

function readCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1] ?? '') : null
}

/**
 * Inicializa la cookie CSRF del flujo SPA de Sanctum. Debe existir antes de
 * cualquier petición que modifique estado (login, logout, envíos…).
 */
export async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

interface ErrorPayload {
  message?: string
  errors?: ApiValidationErrors
}

function isStateChanging(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method)
}

/**
 * Cliente HTTP mínimo y explícito para la API `/api/v1`.
 *
 * - Envía cookies de sesión (`credentials: 'include'`), requisito de Sanctum.
 * - Añade el encabezado `X-XSRF-TOKEN` en peticiones que cambian estado,
 *   tomando el valor de la cookie `XSRF-TOKEN` (esquema SPA de Sanctum).
 * - Normaliza los errores en `ApiError` sin asumir la forma del cuerpo.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (isStateChanging(method)) {
    if (!readCookie(CSRF_COOKIE)) {
      await ensureCsrfCookie()
    }
    const token = readCookie(CSRF_COOKIE)
    if (token) {
      headers['X-XSRF-TOKEN'] = token
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload: unknown = contentType.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ErrorPayload
    throw new ApiError(
      response.status,
      errorPayload.message ?? 'Ha ocurrido un error inesperado.',
      errorPayload.errors ?? {},
    )
  }

  return payload as T
}
