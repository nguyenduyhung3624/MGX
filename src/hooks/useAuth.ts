import { useCallback, useEffect, useState } from 'react'
import {
  getCurrentUser,
  signOut,
  subscribeAuth,
  type AuthUser,
} from '../services/auth'

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    void getCurrentUser()
      .then((currentUser) => {
        if (mounted) setUser(currentUser)
      })
      .catch(() => {
        if (mounted) setUser(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const unsubscribe = subscribeAuth((nextUser) => {
      if (!mounted) return
      setUser(nextUser)
      setLoading(false)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut()
  }, [])

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    logout,
  }
}
