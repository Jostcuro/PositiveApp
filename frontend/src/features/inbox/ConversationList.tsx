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
import { ChevronDown, MessageSquare, RefreshCw } from 'lucide-react'
import type { Conversation } from './types.ts'
import type { ConversationListStatus } from './useConversationList.ts'
import { initials } from '../../utils/initials.ts'
import { formatListTimestamp } from './format.ts'
import EmptyState from '../../components/EmptyState.tsx'

interface ConversationListProps {
  status: ConversationListStatus
  error: string | null
  refreshError: string | null
  items: Conversation[]
  selectedId: string | null
  hasMore: boolean
  loadingMore: boolean
  loadMoreError: string | null
  onSelect: (publicId: string) => void
  onLoadMore: () => void
  onRefresh: () => void
}

function displayName(conversation: Conversation): string {
  return conversation.contact.display_name ?? 'Contacto sin nombre'
}

export default function ConversationList({
  status,
  error,
  refreshError,
  items,
  selectedId,
  hasMore,
  loadingMore,
  loadMoreError,
  onSelect,
  onLoadMore,
  onRefresh,
}: ConversationListProps) {
  const hasItems = items.length > 0
  const showList = hasItems
  const showInitialError = status === 'error' && !hasItems

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
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Bandeja
        </Typography>
        {hasItems && (
          <Button
            size="small"
            variant="text"
            onClick={onRefresh}
            disabled={status === 'loading'}
            startIcon={<RefreshCw size={16} />}
          >
            Refrescar
          </Button>
        )}
      </Stack>

      {hasItems && refreshError !== null && (
        <Box
          role="alert"
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            bgcolor: 'error.light',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="error" sx={{ fontWeight: 500 }}>
            {refreshError}
          </Typography>
          <Button size="small" variant="text" onClick={onRefresh} startIcon={<RefreshCw size={16} />}>
            Reintentar
          </Button>
        </Box>
      )}

      {status === 'loading' && !hasItems && (
        <Box
          role="status"
          aria-live="polite"
          aria-label="Cargando conversaciones"
          sx={{ flex: 1, display: 'grid', placeItems: 'center' }}
        >
          <CircularProgress />
        </Box>
      )}

      {showInitialError && (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="No se pudieron cargar las conversaciones"
          description={error ?? 'No se pudo conectar con el servidor.'}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={onRefresh}
            >
              Reintentar
            </Button>
          }
        />
      )}

      {status === 'ready' && !hasItems && (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="No hay conversaciones"
          description="Cuando existan conversaciones aparecerán aquí."
        />
      )}

      {showList && (
        <List sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          {items.map((conversation) => {
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

          <Box sx={{ px: 1, py: 1, textAlign: 'center' }}>
            <Box aria-live="polite">
              {loadingMore && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Cargando más conversaciones…
                </Typography>
              )}
            </Box>

            {loadMoreError !== null && (
              <Typography
                variant="caption"
                color="error"
                sx={{ display: 'block', mb: 0.5 }}
              >
                {loadMoreError}
              </Typography>
            )}

            {hasMore && loadMoreError === null && (
              <Button
                size="small"
                variant="text"
                onClick={onLoadMore}
                disabled={loadingMore}
                startIcon={
                  loadingMore ? <CircularProgress size={16} /> : <ChevronDown size={16} />
                }
              >
                Cargar más conversaciones
              </Button>
            )}

            {loadMoreError !== null && (
              <Button size="small" variant="text" onClick={onLoadMore} disabled={loadingMore}>
                Reintentar
              </Button>
            )}
          </Box>
        </List>
      )}
    </Box>
  )
}
