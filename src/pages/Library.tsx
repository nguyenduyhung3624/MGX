import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getFollowedManga } from '../services/user'
import type { Manga } from '../types/manga'

const getTitle = (manga: Manga) => manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled'
const getCover = (manga: Manga) => {
  const cover = manga.relationships.find((item) => item.type === 'cover_art')?.attributes?.fileName
  return cover ? `https://uploads.mangadex.org/covers/${manga.id}/${cover}.256.jpg` : 'https://placehold.co/160x230/1c1c1c/ffffff?text=MANGA'
}

const Library = () => {
  const [token, setToken] = useState(() => localStorage.getItem('mangadex-access-token') || '')
  const [draftToken, setDraftToken] = useState(token)
  const [tab, setTab] = useState('Reading')
  const libraryQuery = useQuery({
    queryKey: ['library', token],
    queryFn: () => getFollowedManga(token, 100),
    enabled: Boolean(token),
  })

  const saveToken = () => {
    localStorage.setItem('mangadex-access-token', draftToken.trim())
    setToken(draftToken.trim())
  }

  if (!token) {
    return <section className="library-empty"><h1>Your library</h1><p>Connect your MangaDex access token to load followed manga.</p><input aria-label="MangaDex access token" onChange={(event) => setDraftToken(event.target.value)} placeholder="Paste access token" type="password" value={draftToken} /><button onClick={saveToken}>Connect</button></section>
  }

  const manga = libraryQuery.data ?? []
  return <section className="library-page">
    <div className="content-head"><h1>Library</h1><button className="library-disconnect" onClick={() => { localStorage.removeItem('mangadex-access-token'); setToken('') }}>Disconnect</button></div>
    <div className="library-tabs">{['Reading', 'Plan to Read', 'Completed', 'On Hold', 'Re-reading', 'Dropped'].map((item) => <button className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
    {libraryQuery.isLoading ? <div className="state-message">Loading library...</div> : libraryQuery.isError ? <div className="state-message">Unable to load library. Check your token.</div> : manga.length === 0 ? <div className="state-message">No followed manga yet.</div> : <div className="library-grid">{manga.map((item) => <Link className="library-card" key={item.id} to={`/manga/${item.id}`}><img src={getCover(item)} alt={getTitle(item)} /><div><h2>{getTitle(item)}</h2><span>{item.attributes.status}</span><p>{item.attributes.lastChapter ? `Chapter ${item.attributes.lastChapter}` : 'No chapters yet'}</p></div></Link>)}</div>}
  </section>
}

export default Library
