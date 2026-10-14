export interface ApiValidationErrors {
  [field: string]: string[]
}

/**
 * Error normalizado de la API. `status` es el código HTTP, `message` el
 * mensaje genérico del backend y `errors` los errores de validación (422).
 */
export class ApiError extends Error {
  status: number
  errors: ApiValidationErrors

  constructor(status: number, message: string, errors: ApiValidationErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}
