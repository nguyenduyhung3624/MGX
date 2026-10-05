import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser, signOut, subscribeAuth, type AuthUser } from '../services/auth'

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser())

  useEffect(() => subscribeAuth(() => setUser(getCurrentUser())), [])

  const logout = useCallback(async () => {
    await signOut()
  }, [])

  return {
    user,
    isAuthenticated: Boolean(user),
    logout,
  }
}
