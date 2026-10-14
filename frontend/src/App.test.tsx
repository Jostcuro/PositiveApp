import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { appRoutes } from './router.tsx'
import AuthProvider from './features/auth/AuthProvider.tsx'
import { createFetchMock } from './test/fetchMock.ts'
import theme from './theme.ts'

const ADMIN = { id: 1, name: 'Ana García', email: 'ana@positive.test', role: 'admin' as const }

function renderApp(route = '/inbox') {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: [route] })} />
      </AuthProvider>
    </ThemeProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('redirige a /login cuando no hay sesión', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 401, body: { message: 'No autenticado' } },
      ]),
    )
    renderApp()

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('muestra la bandeja y el usuario cuando hay sesión', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 200, body: { data: ADMIN } },
      ]),
    )
    renderApp()

    expect(
      await screen.findByRole('textbox', { name: 'Buscar conversaciones' }),
    ).toBeInTheDocument()
    expect(screen.getByText(ADMIN.name)).toBeInTheDocument()
  })

  it('cierra la sesión desde el menú de cuenta', async () => {
    const fetchMock = createFetchMock([
      { method: 'GET', path: '/api/v1/auth/me', status: 200, body: { data: ADMIN } },
      { method: 'GET', path: '/sanctum/csrf-cookie', status: 204 },
      { method: 'POST', path: '/api/v1/auth/logout', status: 204 },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: `Cuenta de ${ADMIN.name}` }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
