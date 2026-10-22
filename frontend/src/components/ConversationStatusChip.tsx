import type { ChipProps } from '@mui/material'
import { Chip } from '@mui/material'
import type { ConversationStatus } from '../features/inbox/types.ts'
import { CONVERSATION_STATUS_LABELS } from '../features/inbox/statusLabels.ts'

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
      label={CONVERSATION_STATUS_LABELS[status]}
      color={COLORS[status]}
      size={size}
      variant="outlined"
    />
  )
}
