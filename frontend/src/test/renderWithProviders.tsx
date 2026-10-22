import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import theme from '../theme.ts'
import { AuthContext, type AuthContextValue } from '../features/auth/authContext.ts'
import type { AuthUser } from '../features/auth/types.ts'

/**
 * Usuario por defecto para pruebas de componentes que dependen de la sesión.
 * Se inyecta directamente en el contexto: no dispara `/auth/me` ni red.
 */
export const TEST_USER: AuthUser = {
  id: 1,
  public_id: '01HQAAAAAAAAAAAAAAAAAAAAAA',
  name: 'Ana García',
  email: 'ana@positive.test',
  role: 'admin',
}

interface RenderOptions {
  /** `null` simula una sesión no autenticada. */
  user?: AuthUser | null
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const user = options.user === undefined ? TEST_USER : options.user
  const authValue: AuthContextValue = {
    user,
    status: user === null ? 'unauthenticated' : 'authenticated',
    login: async () => {},
    logout: async () => {},
  }

  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}
