export type UserRole = 'admin' | 'agent'

export interface AuthUser {
  id: number
  public_id: string
  name: string
  email: string
  role: UserRole
}
