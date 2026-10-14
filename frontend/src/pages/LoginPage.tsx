import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { MessageSquare } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext.ts'
import { ApiError } from '../features/auth/apiError.ts'

interface RedirectState {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as RedirectState | null)?.from?.pathname ?? '/inbox'

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError('Demasiados intentos. Espera un momento e inténtalo de nuevo.')
      } else if (caught instanceof ApiError) {
        setError(caught.errors.email?.[0] ?? caught.message)
      } else {
        setError('No se pudo conectar con el servidor. Inténtalo de nuevo.')
      }
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 4,
      }}
    >
      <Card
        elevation={0}
        sx={{ width: '100%', maxWidth: 420, border: '1px solid', borderColor: 'divider' }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                display: 'grid',
                placeItems: 'center',
                color: 'background.paper',
              }}
            >
              <MessageSquare size={22} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Positive
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Accede a la bandeja compartida de conversaciones.
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              {error !== null && (
                <Alert severity="error" role="alert">
                  {error}
                </Alert>
              )}

              <TextField
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {submitting ? 'Entrando…' : 'Iniciar sesión'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
