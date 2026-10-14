export type UserRole = 'admin' | 'agent'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
}
