import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getDiscoveryCollection, type DiscoveryCollection } from '../services/discoveryCollections'
import type { Manga } from '../types/manga'

const pageSize = 20
const maxPages = 3
const fallbackCover = 'https://placehold.co/300x450/1c1c1c/ffffff?text=MANGA'

const getMangaTitle = (manga: Manga) => {
  const titleMap = manga.attributes.title || {}
  return titleMap.en || Object.values(titleMap)[0] || 'Untitled'
}

const getCoverUrl = (manga: Manga) => {
  const cover = manga.relationships.find((item) => item.type === 'cover_art')
  return cover?.attributes?.fileName
    ? `/api/cover?mangaId=${encodeURIComponent(manga.id)}&fileName=${encodeURIComponent(cover.attributes.fileName)}&size=512`
    : fallbackCover
}

const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.onerror = null
  event.currentTarget.src = fallbackCover
}

const Browse = () => {
  const { collection } = useParams<{ collection: string }>()
  const [searchParams] = useSearchParams()
  const validCollections: DiscoveryCollection[] = ['recommended', 'self-published', 'seasonal', 'recently-added']
  const selectedCollection = validCollections.includes(collection as DiscoveryCollection)
    ? collection as DiscoveryCollection
    : undefined
  const config = selectedCollection ? getDiscoveryCollection(selectedCollection) : undefined
  const rawPage = Number(searchParams.get('page') || '1')
  const page = Number.isFinite(rawPage) && rawPage > 0
    ? Math.min(maxPages, Math.floor(rawPage))
    : 1
  const offset = (page - 1) * pageSize

  const query = useQuery({
    queryKey: ['browse-collection', selectedCollection, page],
    queryFn: async () => {
      if (!config) throw new Error('Unknown collection')
      return config.load(pageSize, offset)
    },
    enabled: Boolean(config),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [collection, page])

  if (!config) {
    return (
      <section className="browse-state">
        <h1>Collection not found</h1>
        <p>This discovery section does not exist.</p>
        <Link to="/">← Back home</Link>
      </section>
    )
  }

  const items = query.data?.data ?? []
  const hasPrevious = page > 1
  const hasNext = page < maxPages && items.length === pageSize

  return (
    <section className="browse-page">
      <header className="browse-header">
        <Link className="browse-back" to="/">← Home</Link>
        <div>
          <p className="browse-eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
      </header>

      {query.isLoading ? (
        <div className="browse-state" role="status">Loading titles...</div>
      ) : query.isError ? (
        <div className="browse-state" role="alert">
          <h2>Unable to load this collection</h2>
          <button type="button" onClick={() => query.refetch()}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="browse-state">No titles are available here right now.</div>
      ) : (
        <div className="browse-grid">
          {items.map((manga) => (
            <Link className="browse-card" key={manga.id} to={`/manga/${manga.id}`}>
              <div className="browse-cover">
                <img
                  alt={getMangaTitle(manga)}
                  decoding="async"
                  draggable={false}
                  loading="lazy"
                  onError={handleImageError}
                  src={getCoverUrl(manga)}
                />
              </div>
              <strong>{getMangaTitle(manga)}</strong>
            </Link>
          ))}
        </div>
      )}

      {!query.isLoading && !query.isError && items.length > 0 && (
        <nav className="browse-pagination" aria-label="Collection pages">
          {hasPrevious ? (
            <Link to={`/browse/${collection}?page=${page - 1}`}>← Previous picks</Link>
          ) : (
            <span />
          )}

          <span className="browse-page-marker">{String(page).padStart(2, '0')} / {String(maxPages).padStart(2, '0')}</span>

          {hasNext ? (
            <Link to={`/browse/${collection}?page=${page + 1}`}>More picks →</Link>
          ) : (
            <Link to="/">Back home →</Link>
          )}
        </nav>
      )}
    </section>
  )
}

export default Browse
