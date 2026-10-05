import type { AuthUser } from './auth'
import {
  clearLibrary,
  libraryEvent,
  readLibrary,
  writeLibrary,
  type LocalLibrary,
  type ReadingProgress,
  type SavedManga,
} from './localLibrary'
import { supabase } from './supabase'

const ownerKey = 'mgx-library-owner-v1'

type SavedRow = {
  manga_id: string
  title: string
  cover: string | null
  status: string
  saved_at: string
}

type ProgressRow = {
  manga_id: string
  chapter_id: string
  chapter: string
  read_at: string
}

const toMillis = (value: string) => {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

const toIso = (value: number) => new Date(value).toISOString()

const getOwner = () => {
  try {
    return localStorage.getItem(ownerKey)
  } catch {
    return null
  }
}

const setOwner = (userId: string) => {
  try {
    localStorage.setItem(ownerKey, userId)
  } catch {
    // Library still works locally if the ownership marker cannot be persisted.
  }
}

export const clearOwnedLibrary = () => {
  if (!getOwner()) return
  clearLibrary()
  try {
    localStorage.removeItem(ownerKey)
  } catch {
    // Ignore ownership marker cleanup failures.
  }
}

const fetchCloudLibrary = async (userId: string): Promise<LocalLibrary> => {
  const [savedResult, progressResult] = await Promise.all([
    supabase
      .from('user_library')
      .select('manga_id,title,cover,status,saved_at')
      .eq('user_id', userId),
    supabase
      .from('reading_progress')
      .select('manga_id,chapter_id,chapter,read_at')
      .eq('user_id', userId),
  ])

  if (savedResult.error) throw savedResult.error
  if (progressResult.error) throw progressResult.error

  const saved: SavedManga[] = ((savedResult.data ?? []) as SavedRow[]).map((row) => ({
    id: row.manga_id,
    title: row.title,
    cover: row.cover,
    status: row.status,
    savedAt: toMillis(row.saved_at),
  }))

  const progress: ReadingProgress[] = ((progressResult.data ?? []) as ProgressRow[]).map((row) => ({
    mangaId: row.manga_id,
    chapterId: row.chapter_id,
    chapter: row.chapter,
    readAt: toMillis(row.read_at),
  }))

  return {
    version: 1,
    saved: saved.sort((a, b) => b.savedAt - a.savedAt),
    progress: progress.sort((a, b) => b.readAt - a.readAt),
  }
}

const mergeLibraries = (local: LocalLibrary, cloud: LocalLibrary): LocalLibrary => {
  const saved = new Map<string, SavedManga>()
  for (const item of [...cloud.saved, ...local.saved]) {
    const existing = saved.get(item.id)
    if (!existing || item.savedAt >= existing.savedAt) saved.set(item.id, item)
  }

  const progress = new Map<string, ReadingProgress>()
  for (const item of [...cloud.progress, ...local.progress]) {
    const existing = progress.get(item.mangaId)
    if (!existing || item.readAt >= existing.readAt) progress.set(item.mangaId, item)
  }

  return {
    version: 1,
    saved: [...saved.values()].sort((a, b) => b.savedAt - a.savedAt),
    progress: [...progress.values()].sort((a, b) => b.readAt - a.readAt),
  }
}

const syncRows = async (userId: string, library: LocalLibrary) => {
  const savedRows = library.saved.map((item) => ({
    user_id: userId,
    manga_id: item.id,
    title: item.title,
    cover: item.cover,
    status: item.status,
    saved_at: toIso(item.savedAt),
  }))

  const progressRows = library.progress.map((item) => ({
    user_id: userId,
    manga_id: item.mangaId,
    chapter_id: item.chapterId,
    chapter: item.chapter,
    read_at: toIso(item.readAt),
  }))

  if (savedRows.length) {
    const { error } = await supabase
      .from('user_library')
      .upsert(savedRows, { onConflict: 'user_id,manga_id' })
    if (error) throw error
  }

  if (progressRows.length) {
    const { error } = await supabase
      .from('reading_progress')
      .upsert(progressRows, { onConflict: 'user_id,manga_id' })
    if (error) throw error
  }

  const [cloudSaved, cloudProgress] = await Promise.all([
    supabase.from('user_library').select('manga_id').eq('user_id', userId),
    supabase.from('reading_progress').select('manga_id').eq('user_id', userId),
  ])

  if (cloudSaved.error) throw cloudSaved.error
  if (cloudProgress.error) throw cloudProgress.error

  const localSavedIds = new Set(library.saved.map((item) => item.id))
  const localProgressIds = new Set(library.progress.map((item) => item.mangaId))
  const savedToDelete = (cloudSaved.data ?? [])
    .map((row) => row.manga_id as string)
    .filter((id) => !localSavedIds.has(id))
  const progressToDelete = (cloudProgress.data ?? [])
    .map((row) => row.manga_id as string)
    .filter((id) => !localProgressIds.has(id))

  if (savedToDelete.length) {
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('user_id', userId)
      .in('manga_id', savedToDelete)
    if (error) throw error
  }

  if (progressToDelete.length) {
    const { error } = await supabase
      .from('reading_progress')
      .delete()
      .eq('user_id', userId)
      .in('manga_id', progressToDelete)
    if (error) throw error
  }
}

export const hydrateCloudLibrary = async (user: AuthUser) => {
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        display_name: user.displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (profileError) throw profileError

  const cloud = await fetchCloudLibrary(user.id)
  const previousOwner = getOwner()
  const local = previousOwner && previousOwner !== user.id
    ? { version: 1 as const, saved: [], progress: [] }
    : readLibrary()
  const merged = mergeLibraries(local, cloud)

  writeLibrary(merged)
  setOwner(user.id)
  await syncRows(user.id, merged)
}

export const syncCurrentLibraryToCloud = async (userId: string) => {
  await syncRows(userId, readLibrary())
}

export const subscribeLibraryChanges = (listener: () => void) => {
  window.addEventListener(libraryEvent, listener)
  return () => window.removeEventListener(libraryEvent, listener)
}
