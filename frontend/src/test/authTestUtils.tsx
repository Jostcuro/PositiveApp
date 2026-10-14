import type { ReactElement } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import AuthProvider from '../features/auth/AuthProvider.tsx'
import theme from '../theme.ts'

/** Envuelve un árbol de UI con los proveedores necesarios y un router en memoria. */
export function renderWithAuth(
  ui: ReactElement,
  { route = '/', routes }: { route?: string; routes?: RouteObject[] } = {},
) {
  const element =
    routes === undefined ? (
      <RouterProvider router={createMemoryRouter([{ path: '*', element: ui }], {
        initialEntries: [route],
      })} />
    ) : (
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [route] })} />
    )

  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>{element}</AuthProvider>
    </ThemeProvider>,
  )
}
