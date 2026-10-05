import { useEffect } from 'react'
import { useAuth } from './useAuth'
import {
  clearOwnedLibrary,
  hydrateCloudLibrary,
  subscribeLibraryChanges,
  syncCurrentLibraryToCloud,
} from '../services/cloudLibrary'

export const useCloudLibrarySync = () => {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) {
      clearOwnedLibrary()
      return
    }

    let cancelled = false
    let unsubscribe = () => {}
    let timer: ReturnType<typeof setTimeout> | null = null

    void hydrateCloudLibrary(user)
      .then(() => {
        if (cancelled) return

        unsubscribe = subscribeLibraryChanges(() => {
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            void syncCurrentLibraryToCloud(user.id).catch(() => {
              // Local storage remains the source of truth until the next successful sync.
            })
          }, 250)
        })
      })
      .catch(() => {
        // Cloud tables may not exist yet or the network may be unavailable.
        // Keep the existing local library usable.
      })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [loading, user?.id])
}
