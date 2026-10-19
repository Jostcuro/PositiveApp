import { useLayoutEffect, useRef } from 'react'
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
import type { MessagesPagination } from './useConversationMessages.ts'
import { formatMessageTime } from './format.ts'
import { describeError, isNotFound } from './errorMessage.ts'
import ConversationStatusChip from '../../components/ConversationStatusChip.tsx'
import EmptyState from '../../components/EmptyState.tsx'

interface ConversationThreadProps {
  detail: AsyncState<ConversationDetail>
  messages: MessagesPagination
  onRetry: () => void
  onBack?: () => void
}

interface ScrollAnchor {
  scrollHeight: number
  scrollTop: number
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

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollAnchorRef = useRef<ScrollAnchor | null>(null)
  const lastCountRef = useRef(0)

  // El historial llega paginado `id DESC` (más recientes primero). Al cargar una
  // página anterior, conservamos la posición de lectura: registramos la altura y
  // el desplazamiento antes del prepend y los ajustamos por la diferencia. Si no
  // hay ancla, mantenemos la vista en los mensajes más recientes (abajo).
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (element === null) return

    const count = messages.state.data?.length ?? 0
    const previousCount = lastCountRef.current
    lastCountRef.current = count

    const anchor = scrollAnchorRef.current
    if (anchor !== null) {
      // Solo consumimos el ancla cuando llega la página anterior (crece el número
      // de mensajes); así no la gastamos en un re-render de solo carga.
      if (count > previousCount) {
        scrollAnchorRef.current = null
        element.scrollTop = element.scrollHeight - anchor.scrollHeight + anchor.scrollTop
        return
      }
      // La carga terminó sin agregar mensajes: descartamos el ancla.
      if (!messages.loadingOlder) {
        scrollAnchorRef.current = null
      }
      return
    }

    element.scrollTop = element.scrollHeight
  }, [messages.state.data, messages.loadingOlder])

  const handleLoadOlder = () => {
    const element = scrollRef.current
    if (element !== null) {
      scrollAnchorRef.current = { scrollHeight: element.scrollHeight, scrollTop: element.scrollTop }
    }
    messages.loadOlder()
  }

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

    if (messages.state.status === 'error') {
      return (
        <EmptyState
          title="No se pudieron cargar los mensajes"
          description={describeError(messages.state.error)}
          action={<RetryButton onRetry={onRetry} />}
        />
      )
    }

    if (detail.status === 'loading' || messages.state.status === 'loading') {
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

    if ((messages.state.data ?? []).length === 0) {
      return (
        <EmptyState
          title="Esta conversación no tiene mensajes"
          description="Aún no hay mensajes en este historial."
        />
      )
    }

    return (messages.state.data ?? []).map((message) => (
      <MessageBubble key={message.id} message={message} />
    ))
  }

  const showOlderControl = messages.state.status === 'success' && messages.hasOlder

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
        ref={scrollRef}
        role="log"
        aria-label="Historial de mensajes"
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
        {showOlderControl && (
          <Box sx={{ alignSelf: 'center', textAlign: 'center', mb: 0.5 }}>
            {messages.loadOlderError !== null && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5 }}>
                {describeError(messages.loadOlderError)}
              </Typography>
            )}
            <Button
              size="small"
              variant="text"
              onClick={handleLoadOlder}
              disabled={messages.loadingOlder}
              startIcon={messages.loadingOlder ? <CircularProgress size={16} /> : undefined}
            >
              Cargar mensajes anteriores
            </Button>
          </Box>
        )}

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
