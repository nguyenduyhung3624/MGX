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
      setError(''); setMessage('Đã xuất danh sách truyện và chương đang đọc.')
    } catch { setError('Không thể xuất sao lưu. Hãy kiểm tra quyền lưu dữ liệu của trình duyệt.'); setMessage('') }
  }

  return <section className="saved-library">
    <div className="content-head"><h1>Truyện đã lưu</h1><span>{library.saved.length} truyện</span></div>
    <p className="library-note">Lưu trên trình duyệt này, không cần tài khoản. Danh sách không tự đồng bộ giữa các thiết bị và sẽ mất nếu bạn xóa dữ liệu trình duyệt.</p>
    <div className="library-toolbar">
      <input type="search" aria-label="Tìm trong truyện đã lưu" placeholder="Tìm trong danh sách…" value={filter} onChange={event => setFilter(event.target.value)} />
      <button onClick={exportBackup} disabled={Boolean(library.error)}>Xuất sao lưu</button>
      <button onClick={() => fileInput.current?.click()} disabled={importing || Boolean(library.error)}>{importing ? 'Đang nhập…' : 'Nhập sao lưu'}</button>
      <input ref={fileInput} hidden type="file" accept="application/json,.json" aria-label="File sao lưu MGX" onChange={async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setImporting(true); setError(''); setMessage('')
        try {
          if (file.size > maxBackupBytes) throw new Error('File sao lưu phải nhỏ hơn 2 MB.')
          const added = importLibrary(await file.text())
          setMessage(`Đã nhập ${added} truyện mới. Giữ nguyên truyện hiện có và cập nhật chương đọc mới hơn.`)
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể nhập sao lưu.') }
        finally { setImporting(false) }
      }} />
    </div>
    <p className="library-note">Nhập sao lưu sẽ gộp danh sách, không tạo truyện trùng.</p>
    {(error || library.error) && <p className="save-error" role="alert">{error || library.error}</p>}
    {message && <p role="status">{message}</p>}
    {!library.error && (items.length === 0 ? <div className="state-message"><p>{library.saved.length ? 'Không tìm thấy truyện phù hợp.' : 'Bạn chưa lưu truyện nào. Bấm tim ở trang chủ, tìm kiếm hoặc trang truyện để lưu.'}</p><Link to="/search">Tìm truyện →</Link></div> : <div className="saved-grid">{items.map(item => {
      const lastRead = progress.get(item.id)
      return <article className="saved-card" key={item.id}>
        <Link className="saved-cover" to={`/manga/${item.id}`} aria-label={`Xem ${item.title}`}>{item.cover ? <img loading="lazy" src={`/api/cover?mangaId=${encodeURIComponent(item.id)}&fileName=${encodeURIComponent(item.cover)}&size=256`} alt={item.title} onError={event => { event.currentTarget.style.visibility = 'hidden' }} /> : <span>MGX</span>}</Link>
        <div className="saved-card-copy"><Link to={`/manga/${item.id}`}><h2>{item.title}</h2></Link><p>{item.status}</p>{lastRead && <Link className="continue-reading" to={`/read/${lastRead.chapterId}`}>Đọc tiếp · Chương {lastRead.chapter || '?'}</Link>}<SaveButton manga={item} /></div>
      </article>
    })}</div>)}
  </section>
}
