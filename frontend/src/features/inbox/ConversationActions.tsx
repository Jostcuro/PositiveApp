import { Alert, Button, MenuItem, Select, Stack, Typography } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { UserCheck, UserMinus } from 'lucide-react'
import { useAuth } from '../auth/authContext.ts'
import ConversationStatusChip from '../../components/ConversationStatusChip.tsx'
import { CONVERSATION_STATUS_LABELS } from './statusLabels.ts'
import type { ConversationDetail, ConversationStatus } from './types.ts'
import type { InboxMutations } from './useInboxData.ts'

/**
 * Transiciones manuales ofrecidas por la UI. El backend es la autoridad: esta
 * tabla solo evita ofrecer opciones que el servidor rechazaría (422).
 */
const ALLOWED_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
  open: ['pending', 'resolved'],
  pending: ['open', 'resolved'],
  resolved: ['open'],
}

interface ConversationActionsProps {
  conversation: ConversationDetail
  mutations: InboxMutations
}

export default function ConversationActions({
  conversation,
  mutations,
}: ConversationActionsProps) {
  const { user } = useAuth()
  const assigned = conversation.assigned_user
  const isMine = user !== null && assigned !== null && assigned.public_id === user.public_id
  const canAssignSelf = assigned === null && user !== null
  const canUnassign = assigned !== null && (user?.role === 'admin' || isMine)
  const allowedTransitions = ALLOWED_TRANSITIONS[conversation.status]

  const handleStatusChange = (event: SelectChangeEvent) => {
    const value = event.target.value
    if (value === 'open' || value === 'pending' || value === 'resolved') {
      void mutations.changeStatus(value)
    }
  }

  return (
    <Stack spacing={1.5}>
      {mutations.error && <Alert severity="error">{mutations.error}</Alert>}

      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          Responsable
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ mr: 0.5 }}>
            {assigned?.name ?? 'Sin asignar'}
          </Typography>
          {canAssignSelf && user !== null && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UserCheck size={16} />}
              disabled={mutations.pending}
              onClick={() => void mutations.assign(user.public_id)}
            >
              Asignarme
            </Button>
          )}
          {canUnassign && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UserMinus size={16} />}
              disabled={mutations.pending}
              onClick={() => void mutations.unassign()}
            >
              Liberar
            </Button>
          )}
        </Stack>
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          Estado
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <ConversationStatusChip status={conversation.status} />
          <Select
            size="small"
            value=""
            displayEmpty
            disabled={mutations.pending || allowedTransitions.length === 0}
            onChange={handleStatusChange}
            inputProps={{ 'aria-label': 'Cambiar estado' }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="" disabled>
              Cambiar estado
            </MenuItem>
            {allowedTransitions.map((status) => (
              <MenuItem key={status} value={status}>
                {CONVERSATION_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>
    </Stack>
  )
}
