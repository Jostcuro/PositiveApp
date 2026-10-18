import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './authContext.ts'
import type { AuthStatus } from './authContext.ts'
import { fetchCurrentUser, loginUser, logoutUser } from './authApi.ts'
import { setUnauthorizedHandler } from './apiClient.ts'
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

  /**
   * Descarta la sesión local sin llamadas de red. Se reutiliza tanto en el
   * cierre de sesión explícito (tras el POST) como en el manejo central de 401,
   * evitando bucles si el propio POST de logout devuelve 401.
   */
  const resetSession = useCallback(() => {
    setUser(null)
    setStatus('unauthenticated')
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
      resetSession()
    }
  }, [resetSession])

  /**
   * Manejo central de 401: cualquier petición autenticada que reciba 401
   * descarta la sesión local (una sola vía, sin logout por feature). `resetSession`
   * es idempotente, por lo que varios 401 no provocan múltiples redirecciones.
   */
  useEffect(() => {
    setUnauthorizedHandler(resetSession)
    return () => setUnauthorizedHandler(null)
  }, [resetSession])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
