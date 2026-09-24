import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import SearchForm from '../components/manga/SearchForm'
import { getMangaPage } from '../services/manga'

const limit = 20

export default function Search() {
  const [params, setParams] = useSearchParams()
  const title = (params.get('q') ?? '').trim().slice(0, 200)
  const page = Math.min(500, Math.max(1, Math.floor(Number(params.get('page'))) || 1))
  const unavailable = params.get('unavailable') === '1'
  const query = useQuery({
    queryKey: ['search', title, page, unavailable],
    queryFn: () => getMangaPage({ title, 'availableTranslatedLanguage[]': undefined, 'order[relevance]': 'desc', ...(unavailable ? { hasUnavailableChapters: 'true' } : {}) }, limit, (page - 1) * limit),
    enabled: Boolean(title),
  })
  const total = query.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(Math.min(total, 10000) / limit))
  const go = (next: number) => setParams({ q: title, page: String(next), ...(unavailable ? { unavailable: '1' } : {}) })
  return <section className="search-page">
    <h1>Search manga</h1>
    <SearchForm key={title} initialValue={title} />
    <label className="search-option"><input type="checkbox" checked={unavailable} onChange={(event) => setParams({ q: title, ...(event.target.checked ? { unavailable: '1' } : {}) })} /> Only titles with unavailable chapters</label>
    <p className="search-hint">Search includes titles without readable chapters. Unavailable chapters are marked on the title page.</p>
    {!title ? <p className="state-message">Enter a manga title to begin.</p> : query.isLoading ? <p className="state-message" role="status">Searching MangaDex…</p> : query.isError ? <div className="state-message" role="alert">Could not search MangaDex. <button onClick={() => query.refetch()}>Try again</button></div> : <>
      <p role="status">{total} results for “{title}”{unavailable ? ' with unavailable chapters' : ''}</p>
      {query.data?.data.length === 0 ? <p className="state-message">No matching titles. Try another name or remove the unavailable filter.</p> : <div className="search-results">{query.data?.data.map((manga) => {
        const name = manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled'
        const cover = manga.relationships.find((item) => item.type === 'cover_art')?.attributes?.fileName
        return <Link className="search-result" key={manga.id} to={`/manga/${manga.id}`}>
          <div className="search-cover">{cover ? <img loading="lazy" src={`/api/cover?mangaId=${encodeURIComponent(manga.id)}&fileName=${encodeURIComponent(cover)}&size=256`} alt={name} onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <span>No cover</span>}</div>
          <div><h2>{name}</h2><p>{manga.attributes.year ?? 'Year unknown'} · {manga.attributes.status}</p>{unavailable && <span className="unavailable-badge">Has unavailable chapters</span>}<p className="search-description">{manga.attributes.description.en || Object.values(manga.attributes.description)[0] || 'No description available.'}</p></div>
        </Link>
      })}</div>}
      <nav className="manga-pagination" aria-label="Search pages"><button disabled={page <= 1} onClick={() => go(page - 1)}>Previous</button><span>Page {page} / {pages}</span><button disabled={page >= pages} onClick={() => go(page + 1)}>Next</button></nav>
    </>}
  </section>
}
