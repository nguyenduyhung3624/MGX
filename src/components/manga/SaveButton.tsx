import { useState } from 'react'
import { useLocalLibrary } from '../../hooks/useLocalLibrary'
import { toggleSaved, type SavedManga } from '../../services/localLibrary'

export default function SaveButton({ manga, compact = false }: { manga: SavedManga; compact?: boolean }) {
  const library = useLocalLibrary()
  const [error, setError] = useState('')
  const saved = library.saved.some(item => item.id === manga.id)
  const label = saved ? 'Bỏ lưu' : 'Lưu truyện'
  return <span className={`save-control${compact ? ' compact' : ''}`}>
    <button type="button" className={`save-button${saved ? ' is-saved' : ''}`} aria-pressed={saved} aria-label={`${label}: ${manga.title}`} title={label} onClick={() => {
      try { toggleSaved(manga); setError('') } catch (cause) { setError(library.error || (cause instanceof Error ? cause.message : 'Không thể lưu truyện.')) }
    }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" /></svg>
      {!compact && <span>{saved ? 'Đã lưu · Bỏ lưu' : 'Lưu truyện'}</span>}
    </button>
    {error && <span role="alert" className="save-error">{error}</span>}
  </span>
}
