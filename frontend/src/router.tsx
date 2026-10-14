import { Navigate, createBrowserRouter } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import RequireAuth from './features/auth/RequireAuth.tsx'
import InboxPage from './features/inbox/InboxPage.tsx'
import AppLayout from './layouts/AppLayout.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

/**
 * Definición de rutas de la SPA.
 *
 * - `/login` es pública.
 * - El resto está tras `RequireAuth` (medida de navegación; la autorización
 *   real vive en el backend).
 */
export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/inbox" replace /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
