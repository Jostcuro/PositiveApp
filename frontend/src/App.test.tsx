import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { appRoutes } from './router.tsx'
import AuthProvider from './features/auth/AuthProvider.tsx'
import { createFetchMock } from './test/fetchMock.ts'
import theme from './theme.ts'

const ADMIN = { id: 1, public_id: '01HQAAAAAAAAAAAAAAAAAAAAAA', name: 'Ana García', email: 'ana@positive.test', role: 'admin' as const }

const EMPTY_CONVERSATIONS = {
  data: [],
  links: { first: null, last: null, prev: null, next: null },
  meta: {
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: 15,
    path: 'http://localhost/api/v1/conversations',
    to: null,
    total: 0,
  },
}

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
        { method: 'GET', path: '/api/v1/conversations', status: 200, body: EMPTY_CONVERSATIONS },
      ]),
    )
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Bandeja' })).toBeInTheDocument()
    expect(screen.getByText(ADMIN.name)).toBeInTheDocument()
  })

  it('cierra la sesión automáticamente ante un 401 del read API', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 200, body: { data: ADMIN } },
        { method: 'GET', path: '/api/v1/conversations', status: 401, body: { message: 'No autenticado' } },
      ]),
    )
    renderApp()

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('cierra la sesión desde el menú de cuenta', async () => {
    const fetchMock = createFetchMock([
      { method: 'GET', path: '/api/v1/auth/me', status: 200, body: { data: ADMIN } },
      { method: 'GET', path: '/api/v1/conversations', status: 200, body: EMPTY_CONVERSATIONS },
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
