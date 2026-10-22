import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { render } from '@testing-library/react'
import AuthProvider from './AuthProvider.tsx'
import { useAuth } from './authContext.ts'
import { createFetchMock } from '../../test/fetchMock.ts'
import theme from '../../theme.ts'

const ADMIN = { id: 1, public_id: '01HQAAAAAAAAAAAAAAAAAAAAAA', name: 'Ana García', email: 'ana@positive.test', role: 'admin' as const }

function Probe() {
  const { status, user } = useAuth()
  return (
    <div data-testid="status">
      {status}:{user?.email ?? 'sin-usuario'}
    </div>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthProvider', () => {
  it('recupera la sesión existente al montar', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 200, body: { data: ADMIN } },
      ]),
    )

    render(
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </ThemeProvider>,
    )

    expect(await screen.findByText(`authenticated:${ADMIN.email}`)).toBeInTheDocument()
  })

  it('marca como anónimo cuando no hay sesión', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 401, body: { message: 'No autenticado' } },
      ]),
    )

    render(
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </ThemeProvider>,
    )

    expect(await screen.findByText('unauthenticated:sin-usuario')).toBeInTheDocument()
  })
})
