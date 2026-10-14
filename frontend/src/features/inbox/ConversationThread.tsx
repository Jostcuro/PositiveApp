import type { ConversationMessage } from './../../data/mockConversations.ts'
import type { Conversation } from '../../data/mockConversations.ts'
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowLeft, Send } from 'lucide-react'
import ConversationStatusChip from '../../components/ConversationStatusChip.tsx'

interface ConversationThreadProps {
  conversation: Conversation
  onBack?: () => void
}

function MessageBubble({ message }: { message: ConversationMessage }) {
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
        <Typography variant="body2">{message.text}</Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: outbound ? 'right' : 'left', mt: 0.25 }}
      >
        {message.at}
      </Typography>
    </Box>
  )
}

export default function ConversationThread({ conversation, onBack }: ConversationThreadProps) {
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
            {conversation.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {conversation.description}
          </Typography>
        </Box>
        <ConversationStatusChip status={conversation.status} />
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
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
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
          helperText="El envío se habilitará cuando se conecte la integración con el backend."
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