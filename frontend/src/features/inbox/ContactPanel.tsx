import type { ReactNode } from 'react'
import { Avatar, Box, Button, Stack, Typography } from '@mui/material'
import { User } from 'lucide-react'
import type { Conversation } from '../../data/mockConversations.ts'
import { initials } from '../../utils/initials.ts'
import ConversationStatusChip from '../../components/ConversationStatusChip.tsx'

interface ContactPanelProps {
  conversation: Conversation
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
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
          {initials(conversation.name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
            {conversation.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {conversation.description}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        <PanelField label="Estado">
          <ConversationStatusChip status={conversation.status} size="medium" />
        </PanelField>
        <PanelField label="Responsable">
          <Typography variant="body2">{conversation.assignee}</Typography>
        </PanelField>
        <PanelField label="Notas">
          <Typography variant="body2" color="text.secondary">
            Datos ficticios de demostración. Aquí se mostrará la información del
            contacto cuando se conecte el backend.
          </Typography>
        </PanelField>
        <Button variant="outlined" disabled startIcon={<User size={16} />}>
          Ver perfil
        </Button>
      </Stack>
    </Box>
  )
}