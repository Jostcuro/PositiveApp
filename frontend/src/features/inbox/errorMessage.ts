import { ApiError } from '../auth/apiError.ts'

/** Traduce un error de la API a un mensaje de UI sin filtrar detalles internos. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'El recurso solicitado no existe o ya no está disponible.'
    if (error.status === 422) return 'La solicitud no es válida.'
    if (error.status >= 500) return 'El servidor no está disponible en este momento.'
    if (error.status === 401) return 'La sesión ha expirado.'
    return error.message
  }
  return 'No se pudo conectar con el servidor.'
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
