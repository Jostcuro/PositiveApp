import { useCallback } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ContactPanel from './ContactPanel.tsx'
import ConversationActions from './ConversationActions.tsx'
import ConversationList from './ConversationList.tsx'
import ConversationThread from './ConversationThread.tsx'
import { useInboxData } from './useInboxData.ts'

export default function InboxPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isWide = useMediaQuery(theme.breakpoints.up('lg'))

  const {
    list,
    detail,
    reloadDetail,
    messages,
    reloadMessages,
    selectedPublicId,
    activePublicId,
    selectConversation,
    mutations,
  } = useInboxData()

  const retryDetail = useCallback(() => {
    reloadDetail()
    reloadMessages()
  }, [reloadDetail, reloadMessages])

  const hasActive = activePublicId !== null
  const showThread = hasActive && (!isMobile || selectedPublicId !== null)
  const showContactPanel = !isMobile && isWide && showThread && detail.status === 'success'
  const actions = detail.data ? (
    <ConversationActions conversation={detail.data} mutations={mutations} />
  ) : undefined

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
            status={list.status}
            error={list.error}
            refreshError={list.refreshError}
            items={list.items}
            selectedId={activePublicId}
            hasMore={list.hasMore}
            loadingMore={list.loadingMore}
            loadMoreError={list.loadMoreError}
            onSelect={selectConversation}
            onLoadMore={list.loadMore}
            onRefresh={list.refresh}
          />
        </Box>
      )}

      {showThread && (
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
            detail={detail}
            messages={messages}
            onRetry={retryDetail}
            onBack={isMobile ? () => selectConversation(null) : undefined}
            actions={isWide ? undefined : actions}
          />
        </Box>
      )}

      {showContactPanel && detail.data && (
        <Box sx={{ width: 300, flexShrink: 0, display: 'flex', minHeight: 0 }}>
          <ContactPanel conversation={detail.data} actions={actions} />
        </Box>
      )}
    </Box>
  )
}
