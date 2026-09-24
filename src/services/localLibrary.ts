import type { Manga } from '../types/manga'

export const libraryKey = 'mgx-library-v1'
export const libraryEvent = 'mgx-library-change'
const maxEntries = 2000
export const maxBackupBytes = 2 * 1024 * 1024

export interface SavedManga {
  id: string
  title: string
  cover: string | null
  status: string
  savedAt: number
}
export interface ReadingProgress {
  mangaId: string
  chapterId: string
  chapter: string
  readAt: number
}
export interface LocalLibrary {
  version: 1
  saved: SavedManga[]
  progress: ReadingProgress[]
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max
const date = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 8640000000000000
const invalid = () => new Error('File sao lưu không hợp lệ hoặc không đúng phiên bản MGX.')

// Validate and rebuild imported records. Never trust imported URLs or object keys.
export function parseLibrary(raw: string): LocalLibrary {
  if (new TextEncoder().encode(raw).byteLength > maxBackupBytes) throw invalid()
  const value: unknown = JSON.parse(raw)
  if (!object(value) || value.version !== 1 || !Array.isArray(value.saved) || !Array.isArray(value.progress) || value.saved.length > maxEntries || value.progress.length > maxEntries) throw invalid()
  const saved = value.saved.map((item): SavedManga => {
    if (!object(item) || !uuid(item.id) || !text(item.title, 1000) || !item.title.trim() || !text(item.status, 100) || !date(item.savedAt) || !(item.cover === null || (text(item.cover, 256) && !/[\\/]/.test(item.cover)))) throw invalid()
    return { id: item.id.toLowerCase(), title: item.title, status: item.status, cover: item.cover, savedAt: item.savedAt }
  })
  const progress = value.progress.map((item): ReadingProgress => {
    if (!object(item) || !uuid(item.mangaId) || !uuid(item.chapterId) || !text(item.chapter, 100) || !date(item.readAt)) throw invalid()
    return { mangaId: item.mangaId.toLowerCase(), chapterId: item.chapterId.toLowerCase(), chapter: item.chapter, readAt: item.readAt }
  })
  if (new Set(saved.map(item => item.id)).size !== saved.length || new Set(progress.map(item => item.mangaId)).size !== progress.length) throw invalid()
  return { version: 1, saved, progress }
}

export function readLibrary(): LocalLibrary {
  const raw = localStorage.getItem(libraryKey)
  return raw === null ? { version: 1, saved: [], progress: [] } : parseLibrary(raw)
}

function writeLibrary(library: LocalLibrary) {
  const raw = JSON.stringify(library)
  parseLibrary(raw)
  try { localStorage.setItem(libraryKey, raw) } catch { throw new Error('Không thể lưu trên trình duyệt. Bộ nhớ có thể đã đầy hoặc đang bị chặn.') }
  window.dispatchEvent(new Event(libraryEvent))
}

export function toSavedManga(manga: Manga): SavedManga {
  return {
    id: manga.id,
    title: (manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled').slice(0, 1000),
    cover: manga.relationships.find(item => item.type === 'cover_art')?.attributes?.fileName ?? null,
    status: manga.attributes.status,
    savedAt: Date.now(),
  }
}

export function toggleSaved(manga: SavedManga) {
  const library = readLibrary()
  if (library.saved.some(item => item.id === manga.id)) library.saved = library.saved.filter(item => item.id !== manga.id)
  else {
    if (library.saved.length >= maxEntries) throw new Error('Danh sách đã đạt 2.000 truyện. Hãy xuất sao lưu rồi bỏ bớt truyện.')
    library.saved.unshift({ ...manga, savedAt: Date.now() })
  }
  writeLibrary(library)
}

export function rememberChapter(mangaId: string, chapterId: string, chapter: string) {
  const library = readLibrary()
  if (library.progress.find(item => item.mangaId === mangaId)?.chapterId === chapterId) return
  library.progress = [{ mangaId, chapterId, chapter: chapter.slice(0, 100), readAt: Date.now() }, ...library.progress.filter(item => item.mangaId !== mangaId)].slice(0, maxEntries)
  writeLibrary(library)
}

export function importLibrary(raw: string): number {
  let imported: LocalLibrary
  try { imported = parseLibrary(raw) } catch { throw invalid() }
  const current = readLibrary()
  const saved = new Map(imported.saved.map(item => [item.id, item]))
  current.saved.forEach(item => saved.set(item.id, item))
  if (saved.size > maxEntries) throw new Error('Danh sách sau khi nhập vượt quá 2.000 truyện.')
  const progress = new Map(current.progress.map(item => [item.mangaId, item]))
  imported.progress.forEach(item => {
    if (item.readAt > (progress.get(item.mangaId)?.readAt ?? 0)) progress.set(item.mangaId, item)
  })
  const added = saved.size - current.saved.length
  writeLibrary({ version: 1, saved: [...saved.values()].sort((a, b) => b.savedAt - a.savedAt), progress: [...progress.values()].sort((a, b) => b.readAt - a.readAt).slice(0, maxEntries) })
  return added
}
