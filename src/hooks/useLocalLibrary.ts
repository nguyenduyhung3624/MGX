import { useSyncExternalStore } from 'react'
import { libraryEvent, libraryKey, parseLibrary, type LocalLibrary } from '../services/localLibrary'

type Snapshot = LocalLibrary & { error: string | null }
let cachedRaw: string | null | undefined
let cached: Snapshot = { version: 1, saved: [], progress: [], error: null }
const storageError: Snapshot = { version: 1, saved: [], progress: [], error: 'Could not read saved data. Browser storage may be blocked.' }

function getSnapshot(): Snapshot {
  let raw: string | null
  try { raw = localStorage.getItem(libraryKey) } catch { return storageError }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try { cached = { ...(raw === null ? { version: 1 as const, saved: [], progress: [] } : parseLibrary(raw)), error: null } }
    catch { cached = { version: 1, saved: [], progress: [], error: 'Saved data is damaged or uses an unsupported version. Your existing data has not been overwritten.' } }
  }
  return cached
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === libraryKey || event.key === null) listener() }
  window.addEventListener('storage', onStorage)
  window.addEventListener(libraryEvent, listener)
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(libraryEvent, listener) }
}

export function useLocalLibrary() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
