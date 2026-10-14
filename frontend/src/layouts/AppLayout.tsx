import { useState } from 'react'
import type { MouseEvent } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { BarChart3, Inbox, LogOut, Menu as MenuIcon, MessageSquare, Users } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext.ts'
import { initials } from '../utils/initials.ts'

const DRAWER_WIDTH = 240

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  agent: 'Agente',
}

interface SidebarProps {
  onNavigate?: () => void
}

function Sidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const goToInbox = () => {
    navigate('/inbox')
    onNavigate?.()
  }

  return (
    <Stack
      component="nav"
      aria-label="Principal"
      spacing={0.5}
      sx={{ p: 1.5 }}
    >
      <ListItemButton
        onClick={goToInbox}
        selected={pathname === '/inbox'}
        aria-current={pathname === '/inbox' ? 'page' : undefined}
      >
        <ListItemIcon>
          <Inbox size={20} />
        </ListItemIcon>
        <ListItemText primary="Bandeja" />
      </ListItemButton>

      <Divider sx={{ my: 1 }} />
      <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
        Próximamente
      </Typography>
      <ListItemButton disabled>
        <ListItemIcon>
          <Users size={20} />
        </ListItemIcon>
        <ListItemText primary="Contactos" secondary="En construcción" />
      </ListItemButton>
      <ListItemButton disabled>
        <ListItemIcon>
          <BarChart3 size={20} />
        </ListItemIcon>
        <ListItemText primary="Reportes" secondary="En construcción" />
      </ListItemButton>
    </Stack>
  )
}

export default function AppLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const closeDrawer = () => setMobileOpen(false)

  const handleLogout = async () => {
    setAccountAnchor(null)
    await logout()
    navigate('/login', { replace: true })
  }

  const openAccount = (event: MouseEvent<HTMLElement>) => {
    setAccountAnchor(event.currentTarget)
  }

  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ''

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton
              aria-label="Abrir menú"
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                display: 'grid',
                placeItems: 'center',
                color: 'background.paper',
              }}
            >
              <MessageSquare size={18} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Positive
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          {user && (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {user.name}
              </Typography>
              <Chip
                label={roleLabel}
                size="small"
                variant="outlined"
                sx={{ display: { xs: 'none', md: 'inline-flex' }, ml: 1 }}
              />
              <IconButton
                onClick={openAccount}
                aria-label={`Cuenta de ${user.name}`}
                aria-haspopup="menu"
                aria-expanded={accountAnchor !== null}
                sx={{ ml: 1, p: 0.5 }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {initials(user.name)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={accountAnchor}
                open={accountAnchor !== null}
                onClose={() => setAccountAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2">{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogOut size={18} />
                  </ListItemIcon>
                  <ListItemText primary="Cerrar sesión" />
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <Sidebar />
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Sidebar onNavigate={closeDrawer} />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
