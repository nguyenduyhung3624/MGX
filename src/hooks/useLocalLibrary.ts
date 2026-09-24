import { useSyncExternalStore } from 'react'
import { libraryEvent, libraryKey, parseLibrary, type LocalLibrary } from '../services/localLibrary'

type Snapshot = LocalLibrary & { error: string | null }
let cachedRaw: string | null | undefined
let cached: Snapshot = { version: 1, saved: [], progress: [], error: null }
const storageError: Snapshot = { version: 1, saved: [], progress: [], error: 'Không thể đọc dữ liệu đã lưu. Trình duyệt có thể đang chặn bộ nhớ.' }

function getSnapshot(): Snapshot {
  let raw: string | null
  try { raw = localStorage.getItem(libraryKey) } catch { return storageError }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try { cached = { ...(raw === null ? { version: 1 as const, saved: [], progress: [] } : parseLibrary(raw)), error: null } }
    catch { cached = { version: 1, saved: [], progress: [], error: 'Dữ liệu đã lưu bị lỗi hoặc không đúng phiên bản. MGX giữ nguyên dữ liệu và không ghi đè.' } }
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
