import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMangaPage, getPopularManga } from '../services/manga'
import { getTags } from '../services/tags'
import type { Manga, Tag } from '../types/manga'

const pageSize = 20
const statuses = ['ongoing', 'completed', 'hiatus', 'cancelled']

const getMangaTitle = (manga: Manga) => {
  const titleMap = manga.attributes.title || {}
  return titleMap.en || Object.values(titleMap)[0] || 'Untitled'
}

const getCoverUrl = (manga: Manga) => {
  const cover = manga.relationships.find((item) => item.type === 'cover_art')
  return cover?.attributes?.fileName
    ? `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`
    : 'https://placehold.co/120x170/1c1c1c/ffffff?text=MANGA'
}

const getTagName = (tag: Tag) => tag.attributes.name.en || Object.values(tag.attributes.name)[0] || 'Tag'

const getAuthors = (manga: Manga) => manga.relationships
  .filter((item) => item.type === 'author' || item.type === 'artist')
  .map((item) => item.attributes?.name)
  .filter(Boolean)
  .join(', ')

const Home = () => {
  const [tagId, setTagId] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [popularIndex, setPopularIndex] = useState(0)

  const tagsQuery = useQuery({
    queryKey: ['manga-tags'],
    queryFn: () => getTags({ 'group[]': ['genre'] }),
    staleTime: 60 * 60 * 1000,
  })

  const requestParams = {
    ...(tagId ? { 'includedTags[]': [tagId] } : {}),
    ...(year ? { year: Number(year) } : {}),
    ...(status ? { 'status[]': [status] } : {}),
    ...(sort === 'latest' ? { 'order[latestUploadedChapter]': 'desc' } : {}),
    ...(sort === 'popular' ? { 'order[followedCount]': 'desc' } : {}),
    ...(sort === 'newest' ? { 'order[createdAt]': 'desc' } : {}),
    ...(sort === 'title' ? { 'order[title]': 'asc' } : {}),
  }

  const mangaQuery = useQuery({
    queryKey: ['manga-list', requestParams, page],
    queryFn: () => getMangaPage(requestParams, pageSize, (page - 1) * pageSize),
    placeholderData: (previous) => previous,
  })

  const popularQuery = useQuery({
    queryKey: ['popular-manga'],
    queryFn: () => getPopularManga(8),
    staleTime: 5 * 60 * 1000,
  })
  const popularItems = popularQuery.data?.data ?? []

  useEffect(() => {
    if (popularItems.length <= 1) return
    const timer = window.setInterval(() => setPopularIndex((current) => (current + 1) % popularItems.length), 5000)
    return () => window.clearInterval(timer)
  }, [popularItems.length])

  const updateFilters = (callback: () => void) => {
    setPage(1)
    callback()
  }

  const totalPages = Math.max(1, Math.ceil((mangaQuery.data?.total ?? 0) / pageSize))
  const mangaItems = (mangaQuery.data?.data ?? []).map((manga) => ({
    id: manga.id,
    title: getMangaTitle(manga),
    chapter: manga.attributes.lastChapter ? `Ch. ${manga.attributes.lastChapter}` : 'Recently updated',
    image: getCoverUrl(manga),
  }))

  return (
    <>
      <section className="popular-section home-popular">
        <div className="content-head">
          <h1>Popular new titles</h1>
          <div className="popular-controls">
            <button aria-label="Previous popular manga" onClick={() => setPopularIndex((current) => current === 0 ? Math.max(0, popularItems.length - 1) : current - 1)}>←</button>
            <button aria-label="Next popular manga" onClick={() => setPopularIndex((current) => popularItems.length ? (current + 1) % popularItems.length : 0)}>→</button>
          </div>
        </div>
        {popularQuery.isLoading ? <div className="state-message">Loading popular manga...</div> : popularItems.length > 0 ? (() => {
          const featured = popularItems[popularIndex]
          return <Link className="popular-hero" to={`/manga/${featured.id}`} style={{ backgroundImage: `linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 72%, transparent) 52%, color-mix(in srgb, var(--bg) 30%, transparent) 100%), url(${getCoverUrl(featured)})` }}>
            <img src={getCoverUrl(featured)} alt={getMangaTitle(featured)} />
            <div className="popular-hero-content">
              <p className="eyebrow">POPULAR NEW TITLE</p>
              <h3>{getMangaTitle(featured)}</h3>
              <p>{featured.attributes.description?.en || 'Discover a new English manga series.'}</p>
              <strong>{getAuthors(featured) || 'MangaDex author'}</strong>
            </div>
          </Link>
        })() : <div className="state-message">No popular manga available.</div>}
      </section>

      <section id="updates">
        <div className="content-head">
          <h1>Manga library</h1>
          <span className="chapter-count">{mangaQuery.data?.total ?? 0} results</span>
        </div>

        <div className="manga-filters">
          <select aria-label="Filter by genre" onChange={(event) => updateFilters(() => setTagId(event.target.value))} value={tagId}>
            <option value="">All genres</option>
            {(tagsQuery.data ?? []).slice(0, 40).map((tag) => <option key={tag.id} value={tag.id}>{getTagName(tag)}</option>)}
          </select>
          <select aria-label="Filter by status" onChange={(event) => updateFilters(() => setStatus(event.target.value))} value={status}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
          <input aria-label="Filter by year" max={new Date().getFullYear()} min="1900" onChange={(event) => updateFilters(() => setYear(event.target.value))} placeholder="Year" type="number" value={year} />
          <select aria-label="Sort manga" onChange={(event) => updateFilters(() => setSort(event.target.value))} value={sort}>
            <option value="latest">Latest updates</option>
            <option value="popular">Most followed</option>
            <option value="newest">Recently added</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>

        {mangaQuery.isLoading ? <div className="state-message">Loading manga...</div> : mangaQuery.isError ? <div className="state-message">Unable to load manga.</div> : mangaItems.length === 0 ? <div className="state-message">No manga matched your filters.</div> : (
          <div className="update-grid">
            {mangaItems.map((item) => (
              <article className="update-row" data-manga={item.title} key={item.id}>
                <Link aria-label={`View ${item.title}`} className="update-link" to={`/manga/${item.id}`}>
                  <div className="update-thumb"><img alt={item.title} src={item.image} /></div>
                  <div className="update-body">
                    <h3>{item.title}</h3>
                    <span className="update-chapter"><span className="flag">EN</span>{item.chapter}</span>
                    <div className="update-meta"><span>MangaDex</span></div>
                  </div>
                </Link>
                <button aria-label={`Save ${item.title}`} className="fav-btn" data-manga={item.title}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" /></svg>
                </button>
              </article>
            ))}
          </div>
        )}

        <div className="manga-pagination">
          <button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      </section>

      <section>
        <div className="content-head"><h2>Explore by genre</h2></div>
        <div className="tag-cloud">
          {(tagsQuery.data ?? []).slice(0, 8).map((tag) => <button key={tag.id} onClick={() => updateFilters(() => setTagId(tag.id))}>{getTagName(tag)}</button>)}
        </div>
      </section>
    </>
  )
}

export default Home
