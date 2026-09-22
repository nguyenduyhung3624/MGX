import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMangaPage, getNewManga, getPopularManga } from '../services/manga'
import { getTags } from '../services/tags'
import type { Manga, Tag } from '../types/manga'

const pageSize = 20
const statuses = ['ongoing', 'completed', 'hiatus', 'cancelled']

const getMangaTitle = (manga: Manga) => {
  const titleMap = manga.attributes.title || {}
  return titleMap.en || Object.values(titleMap)[0] || 'Untitled'
}

const fallbackCover = 'https://placehold.co/120x170/1c1c1c/ffffff?text=MANGA'

const getCoverUrl = (manga: Manga, size: 256 | 512 = 256) => {
  const cover = manga.relationships.find((item) => item.type === 'cover_art')
  return cover?.attributes?.fileName
    ? `/api/mangadex/covers/${manga.id}/${cover.attributes.fileName}.${size}.jpg`
    : fallbackCover
}

const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.onerror = null
  event.currentTarget.src = fallbackCover
}

// Fields that exist in the MangaDex API but may be missing from the local Manga type
const readExtraAttributes = (manga: Manga) =>
  manga.attributes as unknown as { originalLanguage?: string; contentRating?: string }

const flagCodes: Record<string, string> = {
  ja: 'jp', ko: 'kr', zh: 'cn', 'zh-hk': 'hk', en: 'gb', vi: 'vn', th: 'th', id: 'id',
  es: 'es', fr: 'fr', de: 'de', ru: 'ru', pt: 'pt', 'pt-br': 'br',
}

const getFlagUrl = (manga: Manga) => {
  const code = flagCodes[readExtraAttributes(manga).originalLanguage ?? '']
  return code ? `https://flagcdn.com/w40/${code}.png` : ''
}

const warningTags = ['gore', 'sexual violence']

// Content rating + tags shown as pills in the hero (warnings first, like MangaDex)
const getHeroBadges = (manga: Manga) => {
  const rating = readExtraAttributes(manga).contentRating
  const badges: { key: string; label: string; tone: string }[] = []
  if (rating && rating !== 'safe') badges.push({ key: `rating-${rating}`, label: rating, tone: `is-${rating}` })
  const tags = [...(manga.attributes.tags ?? [])].map((tag) => {
    const label = tag.attributes?.name?.en || 'Tag'
    return { key: tag.id, label, tone: warningTags.includes(label.toLowerCase()) ? 'is-warning' : '' }
  })
  tags.sort((a, b) => Number(b.tone === 'is-warning') - Number(a.tone === 'is-warning'))
  return [...badges, ...tags].slice(0, 8)
}

const getTagName = (tag: Tag) => tag.attributes.name.en || Object.values(tag.attributes.name)[0] || 'Tag'

const getAuthors = (manga: Manga) => manga.relationships
  .filter((item) => item.type === 'author' || item.type === 'artist')
  .map((item) => item.attributes?.name)
  .filter(Boolean)
  .join(', ')

type MangaRailProps = {
  title: string
  items: Manga[]
  loading?: boolean
}

const MangaRail = ({ title, items, loading }: MangaRailProps) => {
  const [page, setPage] = useState(0)
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const visibleItems = items.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <section className="manga-rail">
      <div className="rail-heading">
        <h2>{title}</h2>
        <button aria-label={`Next ${title}`} onClick={() => setPage((current) => (current + 1) % totalPages)}>→</button>
      </div>
      {loading ? <div className="state-message">Loading...</div> : (
        <>
          <div className="rail-grid">
            {visibleItems.map((manga) => <Link className="rail-card" key={manga.id} to={`/manga/${manga.id}`}>
              <div className="rail-cover">
                <img alt={getMangaTitle(manga)} onError={handleImageError} src={getCoverUrl(manga, 512)} />
                {getFlagUrl(manga) && <img alt="" className="rail-flag" onError={handleImageError} src={getFlagUrl(manga)} />}
              </div>
              <span>{getMangaTitle(manga)}</span>
            </Link>)}
          </div>
          <div className="rail-dots" aria-label={`${title} pages`}>
            {Array.from({ length: totalPages }, (_, index) => <button aria-label={`Show ${title} page ${index + 1}`} className={index === page ? 'active' : ''} key={index} onClick={() => setPage(index)} />)}
          </div>
        </>
      )}
    </section>
  )
}

const Home = () => {
  const [tagId, setTagId] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [popularIndex, setPopularIndex] = useState(0)
  const heroSearchRef = useRef<HTMLInputElement>(null)

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
  const recommendedQuery = useQuery({
    queryKey: ['home-recommended'],
    queryFn: () => getPopularManga(15),
    staleTime: 5 * 60 * 1000,
  })
  const selfPublishedQuery = useQuery({
    queryKey: ['home-self-published'],
    queryFn: () => getMangaPage({ 'order[createdAt]': 'desc' }, 15),
    staleTime: 5 * 60 * 1000,
  })
  const seasonalQuery = useQuery({
    queryKey: ['home-seasonal'],
    queryFn: () => getMangaPage({ year: new Date().getFullYear(), 'order[latestUploadedChapter]': 'desc' }, 15),
    staleTime: 5 * 60 * 1000,
  })
  const recentlyAddedQuery = useQuery({
    queryKey: ['home-recently-added'],
    queryFn: () => getNewManga(15),
    staleTime: 5 * 60 * 1000,
  })
  const popularItems = popularQuery.data?.data ?? []
  const featured = popularItems[popularIndex] ?? popularItems[0]

  useEffect(() => {
    if (popularItems.length <= 1) return
    const timer = window.setInterval(() => setPopularIndex((current) => (current + 1) % popularItems.length), 5000)
    return () => window.clearInterval(timer)
  }, [popularItems.length])

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        heroSearchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const updateFilters = (callback: () => void) => {
    setPage(1)
    setPageInput('1')
    callback()
  }

  const goToPage = () => {
    const nextPage = Math.min(totalPages, Math.max(1, Number(pageInput) || 1))
    setPage(nextPage)
    setPageInput(String(nextPage))
  }

  const totalPages = Math.max(1, Math.ceil((mangaQuery.data?.total ?? 0) / pageSize))
  const mangaItems = (mangaQuery.data?.data ?? []).map((manga) => ({
    id: manga.id,
    title: getMangaTitle(manga),
    chapter: manga.attributes.lastChapter ? `Ch. ${manga.attributes.lastChapter}` : 'Recently updated',
    image: getCoverUrl(manga),
  }))
  const splitIndex = Math.ceil(mangaItems.length / 2)
  const mangaColumns = [mangaItems.slice(0, splitIndex), mangaItems.slice(splitIndex)]

  return (
    <>
      <section className="popular-section home-popular">
        {popularQuery.isLoading ? <div className="state-message">Loading popular manga...</div> : featured ? (
          <div className="popular-hero">
            <div aria-hidden="true" className="popular-hero-bg" key={`bg-${featured.id}`} style={{ backgroundImage: `url(${getCoverUrl(featured, 512)})` }} />

            <button aria-label="Open menu" className="home-menu-toggle" id="navToggle">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <h1 className="popular-hero-heading">Popular New Titles</h1>

            <div className="hero-tools">
              <label className="hero-search search-box">
                <input aria-label="Search manga" placeholder="Search" ref={heroSearchRef} type="search" />
                <kbd>Ctrl</kbd>
                <kbd>K</kbd>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20 16.5 16.5" /></svg>
              </label>
              <button aria-label="Account" className="hero-avatar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" /><path d="M4.8 20c.7-3.7 3.4-5.6 7.2-5.6s6.5 1.9 7.2 5.6" /></svg>
              </button>
            </div>

            <Link className="popular-hero-link" key={featured.id} to={`/manga/${featured.id}`}>
              <div className="popular-hero-cover">
                <img alt={getMangaTitle(featured)} onError={handleImageError} src={getCoverUrl(featured, 512)} />
                {getFlagUrl(featured) && <img alt="" className="popular-hero-flag" onError={handleImageError} src={getFlagUrl(featured)} />}
              </div>
              <div className="popular-hero-content">
                <h2>{getMangaTitle(featured)}</h2>
                <div className="popular-tags">{getHeroBadges(featured).map((badge) => <span className={badge.tone} key={badge.key}>{badge.label}</span>)}</div>
                <p>{featured.attributes.description?.en || 'Discover a new English manga series.'}</p>
                <strong>{getAuthors(featured) || 'MangaDex author'}</strong>
              </div>
            </Link>

            <div className="popular-controls">
              <span className="popular-index">NO. {popularIndex + 1}</span>
              <button aria-label="Previous popular manga" onClick={() => setPopularIndex((current) => current === 0 ? Math.max(0, popularItems.length - 1) : current - 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
              </button>
              <button aria-label="Next popular manga" onClick={() => setPopularIndex((current) => popularItems.length ? (current + 1) % popularItems.length : 0)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        ) : <div className="state-message">No popular manga available.</div>}
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
            {mangaColumns.map((column, columnIndex) => <div className="update-column" key={columnIndex}>{column.map((item) => (
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
            ))}</div>)}
          </div>
        )}

        <div className="manga-pagination">
          <button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span className="current-page">Current page: {page}</span>
          <label>Go to page <input aria-label="Page number" min="1" max={totalPages} onChange={(event) => setPageInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') goToPage() }} type="number" value={pageInput} /> of {totalPages}</label>
          <button onClick={goToPage}>Go</button>
          <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      </section>


      <MangaRail loading={recommendedQuery.isLoading} items={recommendedQuery.data?.data ?? []} title="Recommended" />
      <MangaRail loading={selfPublishedQuery.isLoading} items={selfPublishedQuery.data?.data ?? []} title="Self-Published" />
      <MangaRail loading={seasonalQuery.isLoading} items={seasonalQuery.data?.data ?? []} title={`Seasonal: Summer ${new Date().getFullYear()}`} />
      <MangaRail loading={recentlyAddedQuery.isLoading} items={recentlyAddedQuery.data?.data ?? []} title="Recently Added" />
    </>
  )
}

export default Home
