import { Button, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <Stack
      spacing={2}
      sx={{ alignItems: 'center', justifyContent: 'center', height: '100%', p: 3, textAlign: 'center' }}
    >
      <Typography variant="h4">Página no encontrada</Typography>
      <Typography color="text.secondary">
        La ruta que buscas no existe.
      </Typography>
      <Button component={Link} to="/inbox" variant="contained">
        Ir a la bandeja
      </Button>
    </Stack>
  )
}