import { useMemo, useState } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { MOCK_CONVERSATIONS } from '../../data/mockConversations.ts'
import ContactPanel from './ContactPanel.tsx'
import ConversationList from './ConversationList.tsx'
import ConversationThread from './ConversationThread.tsx'

export default function InboxPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isWide = useMediaQuery(theme.breakpoints.up('lg'))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MOCK_CONVERSATIONS
    return MOCK_CONVERSATIONS.filter((conversation) =>
      `${conversation.name} ${conversation.description} ${conversation.lastMessage}`
        .toLowerCase()
        .includes(q),
    )
  }, [query])

  const hasExplicitSelection =
    selectedId !== null && filtered.some((conversation) => conversation.id === selectedId)
  const activeId = hasExplicitSelection ? selectedId : (filtered[0]?.id ?? null)
  const activeConversation =
    MOCK_CONVERSATIONS.find((conversation) => conversation.id === activeId) ?? null

  const showThread = activeConversation !== null && (!isMobile || hasExplicitSelection)
  const showContactPanel = !isMobile && isWide && showThread && activeConversation !== null

  return (
    <Box
      role="region"
      aria-label="Bandeja de conversaciones"
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      {(!isMobile || !showThread) && (
        <Box
          sx={{
            width: { xs: '100%', sm: 340 },
            flexShrink: 0,
            display: 'flex',
            minHeight: 0,
          }}
        >
          <ConversationList
            conversations={filtered}
            query={query}
            selectedId={activeId}
            onQueryChange={setQuery}
            onSelect={setSelectedId}
          />
        </Box>
      )}

      {showThread && activeConversation && (
        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <ConversationThread
            conversation={activeConversation}
            onBack={isMobile ? () => setSelectedId(null) : undefined}
          />
        </Box>
      )}

      {showContactPanel && activeConversation && (
        <Box sx={{ width: 300, flexShrink: 0, display: 'flex', minHeight: 0 }}>
          <ContactPanel conversation={activeConversation} />
        </Box>
      )}
    </Box>
  )
}