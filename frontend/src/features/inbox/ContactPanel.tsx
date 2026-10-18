import type { ReactNode } from 'react'
import { Avatar, Box, Button, Stack, Typography } from '@mui/material'
import { User } from 'lucide-react'
import type { ConversationDetail } from './types.ts'
import { initials } from '../../utils/initials.ts'
import { formatListTimestamp } from './format.ts'
import ConversationStatusChip from '../../components/ConversationStatusChip.tsx'

interface ContactPanelProps {
  conversation: ConversationDetail
}

function PanelField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  )
}

export default function ContactPanel({ conversation }: ContactPanelProps) {
  const name = conversation.contact.display_name ?? 'Contacto sin nombre'

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        p: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>{initials(name)}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          {conversation.contact.phone_e164 && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {conversation.contact.phone_e164}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack spacing={2}>
        <PanelField label="Estado">
          <ConversationStatusChip status={conversation.status} size="medium" />
        </PanelField>
        <PanelField label="Responsable">
          <Typography variant="body2">
            {conversation.assigned_user?.name ?? 'Sin asignar'}
          </Typography>
        </PanelField>
        <PanelField label="Abierta">
          <Typography variant="body2">{formatListTimestamp(conversation.opened_at)}</Typography>
        </PanelField>
        <PanelField label="Reaperturas">
          <Typography variant="body2">{conversation.reopened_count}</Typography>
        </PanelField>
        <Button variant="outlined" disabled startIcon={<User size={16} />}>
          Ver perfil
        </Button>
      </Stack>
    </Box>
  )
}
