import { apiRequest } from './apiClient.ts'
import type { AuthUser } from './types.ts'

interface UserEnvelope {
  data: AuthUser
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest<UserEnvelope>('/api/v1/auth/me').then((response) => response.data)
}

export function loginUser(email: string, password: string): Promise<AuthUser> {
  return apiRequest<UserEnvelope>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  }).then((response) => response.data)
}

export function logoutUser(): Promise<void> {
  return apiRequest<null>('/api/v1/auth/logout', { method: 'POST' }).then(() => undefined)
}
