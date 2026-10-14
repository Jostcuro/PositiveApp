import {
  Avatar,
  Badge,
  Box,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Search } from 'lucide-react'
import type { Conversation } from '../../data/mockConversations.ts'
import { initials } from '../../utils/initials.ts'
import EmptyState from '../../components/EmptyState.tsx'

interface ConversationListProps {
  conversations: Conversation[]
  query: string
  selectedId: string | null
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
}

export default function ConversationList({
  conversations,
  query,
  selectedId,
  onQueryChange,
  onSelect,
}: ConversationListProps) {
  const hasResults = conversations.length > 0

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
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Bandeja
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Datos de demostración
          </Typography>
        </Stack>
        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar conversaciones…"
          slotProps={{
            input: {
              'aria-label': 'Buscar conversaciones',
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <List sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {!hasResults ? (
          <EmptyState
            icon={<Search size={32} />}
            title="Sin resultados"
            description={
              query
                ? `Nada coincide con «${query}».`
                : 'No hay conversaciones para mostrar.'
            }
          />
        ) : (
          conversations.map((conversation) => (
            <ListItemButton
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              selected={conversation.id === selectedId}
              sx={{ mb: 0.5 }}
            >
              <ListItemAvatar>
                <Badge
                  color="error"
                  variant="dot"
                  overlap="circular"
                  invisible={!conversation.unread}
                >
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {initials(conversation.name)}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: conversation.unread ? 700 : 500 }}
                    >
                      {conversation.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {conversation.lastAt}
                    </Typography>
                  </Stack>
                }
                secondary={
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      {conversation.lastMessage}
                    </Typography>
                    {conversation.unread > 0 && (
                      <Badge badgeContent={conversation.unread} color="primary" />
                    )}
                  </Stack>
                }
              />
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  )
}