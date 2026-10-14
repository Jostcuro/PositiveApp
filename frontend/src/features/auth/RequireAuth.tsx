import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext.ts'

/**
 * Guarda de rutas privadas. Es una medida de navegación/UX: la autorización
 * efectiva siempre se valida en el backend.
 */
export default function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <Box
        role="status"
        aria-live="polite"
        aria-label="Comprobando la sesión"
        sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
