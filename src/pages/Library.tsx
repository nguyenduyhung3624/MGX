import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SaveButton from '../components/manga/SaveButton'
import { useLocalLibrary } from '../hooks/useLocalLibrary'
import { importLibrary, maxBackupBytes, readLibrary } from '../services/localLibrary'

export default function Library() {
  const library = useLocalLibrary()
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const items = library.saved.filter(item => item.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()))
  const progress = new Map(library.progress.map(item => [item.mangaId, item]))

  const exportBackup = () => {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(readLibrary())], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `mgx-library-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setError(''); setMessage('Saved manga and reading progress exported.')
    } catch { setError('Could not export the backup. Check your browser storage permissions.'); setMessage('') }
  }

  return <section className="saved-library">
    <div className="content-head"><h1>Saved manga</h1><span>{library.saved.length} {library.saved.length === 1 ? 'title' : 'titles'}</span></div>
    <p className="library-note">Saved in this browser without an account. Your library does not sync across devices and will be lost if you clear site data.</p>
    <div className="library-toolbar">
      <input type="search" aria-label="Search saved manga" placeholder="Search your library…" value={filter} onChange={event => setFilter(event.target.value)} />
      <button onClick={exportBackup} disabled={Boolean(library.error)}>Export backup</button>
      <button onClick={() => fileInput.current?.click()} disabled={importing || Boolean(library.error)}>{importing ? 'Importing…' : 'Import backup'}</button>
      <input ref={fileInput} hidden type="file" accept="application/json,.json" aria-label="MGX backup file" onChange={async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setImporting(true); setError(''); setMessage('')
        try {
          if (file.size > maxBackupBytes) throw new Error('Backup files must be no larger than 2 MB.')
          const added = importLibrary(await file.text())
          setMessage(`Imported ${added} new title${added === 1 ? "" : "s"}. Existing titles were kept and newer reading progress was applied.`)
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import the backup.') }
        finally { setImporting(false) }
      }} />
    </div>
    <p className="library-note">Importing a backup merges your library without creating duplicates.</p>
    {(error || library.error) && <p className="save-error" role="alert">{error || library.error}</p>}
    {message && <p role="status">{message}</p>}
    {!library.error && (items.length === 0 ? <div className="state-message"><p>{library.saved.length ? 'No matching manga found.' : 'No saved manga yet. Select the heart on the home page, search results, or manga details to save a title.'}</p><Link to="/search">Find manga →</Link></div> : <div className="saved-grid">{items.map(item => {
      const lastRead = progress.get(item.id)
      return <article className="saved-card" key={item.id}>
        <Link className="saved-cover" to={`/manga/${item.id}`} aria-label={`View ${item.title}`}>{item.cover ? <img loading="lazy" src={`/api/cover?mangaId=${encodeURIComponent(item.id)}&fileName=${encodeURIComponent(item.cover)}&size=256`} alt={item.title} onError={event => { event.currentTarget.style.visibility = 'hidden' }} /> : <span>MGX</span>}</Link>
        <div className="saved-card-copy"><Link to={`/manga/${item.id}`}><h2>{item.title}</h2></Link><p>{item.status}</p>{lastRead && <Link className="continue-reading" to={`/read/${lastRead.chapterId}`}>Continue reading · Chapter {lastRead.chapter || '?'}</Link>}<SaveButton manga={item} /></div>
      </article>
    })}</div>)}
  </section>
}
