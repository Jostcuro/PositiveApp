import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import LoginPage from './LoginPage.tsx'
import { renderWithAuth } from '../test/authTestUtils.tsx'
import { createFetchMock } from '../test/fetchMock.ts'

const ADMIN = { id: 1, public_id: '01HQAAAAAAAAAAAAAAAAAAAAAA', name: 'Ana García', email: 'ana@positive.test', role: 'admin' as const }

const routes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/inbox', element: <div>BANDEJA</div> },
]

function submitLogin() {
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
    target: { value: 'ana@positive.test' },
  })
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'secreto' } })
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('inicia sesión y redirige a la bandeja', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 401, body: { message: 'No autenticado' } },
        { method: 'GET', path: '/sanctum/csrf-cookie', status: 204 },
        { method: 'POST', path: '/api/v1/auth/login', status: 200, body: { data: ADMIN } },
      ]),
    )
    renderWithAuth(<div />, { route: '/login', routes })

    submitLogin()

    expect(await screen.findByText('BANDEJA')).toBeInTheDocument()
  })

  it('muestra el error genérico cuando las credenciales son incorrectas', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 401, body: { message: 'No autenticado' } },
        { method: 'GET', path: '/sanctum/csrf-cookie', status: 204 },
        {
          method: 'POST',
          path: '/api/v1/auth/login',
          status: 422,
          body: { message: 'Las credenciales proporcionadas son incorrectas.' },
        },
      ]),
    )
    renderWithAuth(<div />, { route: '/login', routes })

    submitLogin()

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Las credenciales proporcionadas son incorrectas.')
  })

  it('informa cuando se supera el límite de intentos', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        { method: 'GET', path: '/api/v1/auth/me', status: 401, body: { message: 'No autenticado' } },
        { method: 'GET', path: '/sanctum/csrf-cookie', status: 204 },
        { method: 'POST', path: '/api/v1/auth/login', status: 429, body: { message: 'Too many' } },
      ]),
    )
    renderWithAuth(<div />, { route: '/login', routes })

    submitLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos')
  })
})
