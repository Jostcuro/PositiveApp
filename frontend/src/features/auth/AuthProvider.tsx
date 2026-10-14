import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './authContext.ts'
import type { AuthStatus } from './authContext.ts'
import { fetchCurrentUser, loginUser, logoutUser } from './authApi.ts'
import type { AuthUser } from './types.ts'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  /**
   * Recupera la sesión al montar (recarga de página): si la cookie de sesión
   * sigue viva, `/auth/me` devuelve el usuario; si no, se marca como anónimo.
   * La bandera `active` evita actualizar estado tras desmontar.
   */
  useEffect(() => {
    let active = true

    fetchCurrentUser()
      .then((current) => {
        if (!active) return
        setUser(current)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const authenticated = await loginUser(email, password)
    setUser(authenticated)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
