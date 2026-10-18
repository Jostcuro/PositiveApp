import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowLeft, RefreshCw, Send } from 'lucide-react'
import type { AsyncState, ConversationDetail, Message } from './types.ts'
import { formatMessageTime } from './format.ts'
import { describeError, isNotFound } from './errorMessage.ts'
import ConversationStatusChip from '../../components/ConversationStatusChip.tsx'
import EmptyState from '../../components/EmptyState.tsx'

interface ConversationThreadProps {
  detail: AsyncState<ConversationDetail>
  messages: AsyncState<Message[]>
  onRetry: () => void
  onBack?: () => void
}

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === 'outbound'

  return (
    <Box
      sx={{
        alignSelf: outbound ? 'flex-end' : 'flex-start',
        maxWidth: '72%',
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: outbound ? 'primary.main' : 'background.default',
          border: outbound ? 'none' : '1px solid',
          borderColor: 'divider',
          color: outbound ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.body ?? 'Mensaje sin texto'}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: outbound ? 'right' : 'left', mt: 0.25 }}
      >
        {formatMessageTime(message.created_at)}
      </Typography>
    </Box>
  )
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<RefreshCw size={16} />}
      onClick={onRetry}
    >
      Reintentar
    </Button>
  )
}

export default function ConversationThread({
  detail,
  messages,
  onRetry,
  onBack,
}: ConversationThreadProps) {
  const conversation = detail.data
  const name = conversation?.contact.display_name ?? 'Conversación'
  const phone = conversation?.contact.phone_e164 ?? null

  const renderBody = () => {
    if (detail.status === 'error') {
      if (isNotFound(detail.error)) {
        return (
          <EmptyState
            title="Conversación no encontrada"
            description="Puede que ya no exista o que ya no esté disponible."
          />
        )
      }
      return (
        <EmptyState
          title="No se pudo cargar la conversación"
          description={describeError(detail.error)}
          action={<RetryButton onRetry={onRetry} />}
        />
      )
    }

    if (messages.status === 'error') {
      return (
        <EmptyState
          title="No se pudieron cargar los mensajes"
          description={describeError(messages.error)}
          action={<RetryButton onRetry={onRetry} />}
        />
      )
    }

    if (detail.status === 'loading' || messages.status === 'loading') {
      return (
        <Box
          role="status"
          aria-live="polite"
          aria-label="Cargando mensajes"
          sx={{ flex: 1, display: 'grid', placeItems: 'center' }}
        >
          <CircularProgress />
        </Box>
      )
    }

    if ((messages.data ?? []).length === 0) {
      return (
        <EmptyState
          title="Esta conversación no tiene mensajes"
          description="Aún no hay mensajes en este historial."
        />
      )
    }

    return (messages.data ?? []).map((message) => (
      <MessageBubble key={message.id} message={message} />
    ))
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {onBack && (
          <IconButton
            aria-label="Volver a la lista de conversaciones"
            edge="start"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </IconButton>
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          {phone && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {phone}
            </Typography>
          )}
        </Box>
        {conversation && <ConversationStatusChip status={conversation.status} />}
      </Stack>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 1.5, md: 3 },
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: 'background.default',
        }}
      >
        {renderBody()}
      </Box>

      <Box
        sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          disabled
          placeholder="Escribe un mensaje… (pendiente de integración)"
          aria-label="Compositor de mensajes (deshabilitado)"
          helperText="El envío se habilitará cuando se implemente la mensajería saliente."
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
          <Button endIcon={<Send size={16} />} variant="contained" disabled>
            Enviar
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
