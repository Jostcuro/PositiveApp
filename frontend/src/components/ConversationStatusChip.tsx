import type { ChipProps } from '@mui/material'
import { Chip } from '@mui/material'
import type { ConversationStatus } from '../data/mockConversations.ts'

const LABELS: Record<ConversationStatus, string> = {
  open: 'Abierta',
  pending: 'Esperando respuesta',
  resolved: 'Resuelta',
}

const COLORS: Record<ConversationStatus, ChipProps['color']> = {
  open: 'info',
  pending: 'warning',
  resolved: 'success',
}

interface ConversationStatusChipProps {
  status: ConversationStatus
  size?: ChipProps['size']
}

export default function ConversationStatusChip({
  status,
  size = 'small',
}: ConversationStatusChipProps) {
  return (
    <Chip
      label={LABELS[status]}
      color={COLORS[status]}
      size={size}
      variant="outlined"
    />
  )
}