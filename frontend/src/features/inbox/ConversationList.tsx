import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { MessageSquare, RefreshCw } from 'lucide-react'
import type { AsyncStatus, Conversation } from './types.ts'
import { initials } from '../../utils/initials.ts'
import { formatListTimestamp } from './format.ts'
import { describeError } from './errorMessage.ts'
import EmptyState from '../../components/EmptyState.tsx'

interface ConversationListProps {
  status: AsyncStatus
  error: unknown
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (publicId: string) => void
  onRetry: () => void
}

function displayName(conversation: Conversation): string {
  return conversation.contact.display_name ?? 'Contacto sin nombre'
}

export default function ConversationList({
  status,
  error,
  conversations,
  selectedId,
  onSelect,
  onRetry,
}: ConversationListProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Bandeja
        </Typography>
      </Box>

      {status === 'loading' && (
        <Box
          role="status"
          aria-live="polite"
          aria-label="Cargando conversaciones"
          sx={{ flex: 1, display: 'grid', placeItems: 'center' }}
        >
          <CircularProgress />
        </Box>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="No se pudieron cargar las conversaciones"
          description={describeError(error)}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={onRetry}
            >
              Reintentar
            </Button>
          }
        />
      )}

      {status === 'success' && conversations.length === 0 && (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="No hay conversaciones"
          description="Cuando existan conversaciones aparecerán aquí."
        />
      )}

      {status === 'success' && conversations.length > 0 && (
        <List sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          {conversations.map((conversation) => {
            const name = displayName(conversation)

            return (
              <ListItemButton
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                selected={conversation.id === selectedId}
                sx={{ mb: 0.5 }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>{initials(name)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 500 }}>
                        {name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {formatListTimestamp(conversation.last_message_at)}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ display: 'block' }}
                    >
                      {conversation.last_message?.body ?? 'Sin mensajes'}
                    </Typography>
                  }
                />
              </ListItemButton>
            )
          })}
        </List>
      )}
    </Box>
  )
}
