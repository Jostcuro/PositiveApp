import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        minHeight: 220,
        p: 4,
        textAlign: 'center',
      }}
    >
      {icon && <Box sx={{ color: 'text.disabled' }}>{icon}</Box>}
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
  )
}