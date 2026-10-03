import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getLatestManga, getPopularManga } from '../services/manga'
import { getDiscoveryCollection } from '../services/discoveryCollections'
import type { Manga } from '../types/manga'

const getMangaTitle = (manga: Manga) => {
  const titleMap = manga.attributes.title || {}
  return titleMap.en || Object.values(titleMap)[0] || 'Untitled'
}

const fallbackCover = 'https://placehold.co/120x170/1c1c1c/ffffff?text=MANGA'

const getCoverUrl = (manga: Manga, size: 256 | 512 = 256) => {
  const cover = manga.relationships.find((item) => item.type === 'cover_art')
  return cover?.attributes?.fileName
    ? `/api/cover?mangaId=${encodeURIComponent(manga.id)}&fileName=${encodeURIComponent(cover.attributes.fileName)}&size=${size}`
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

const getAuthors = (manga: Manga) => manga.relationships
  .filter((item) => item.type === 'author' || item.type === 'artist')
  .map((item) => item.attributes?.name)
  .filter(Boolean)
  .join(', ')

type MangaRailProps = {
  title: string
  items: Manga[]
  href: string
  loading?: boolean
}

const MangaRail = ({ title, items, href, loading }: MangaRailProps) => {
  const railRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  })
  const [dragging, setDragging] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const syncRailPosition = () => {
    const rail = railRef.current
    if (!rail) return
    setAtStart(rail.scrollLeft <= 8)
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8)
  }

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.9, 280),
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    syncRailPosition()
    rail.addEventListener('scroll', syncRailPosition, { passive: true })
    window.addEventListener('resize', syncRailPosition)

    return () => {
      rail.removeEventListener('scroll', syncRailPosition)
      window.removeEventListener('resize', syncRailPosition)
    }
  }, [items.length])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const rail = railRef.current
    if (!rail) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const dragRail = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current
    if (!rail || dragRef.current.pointerId !== event.pointerId) return

    const delta = event.clientX - dragRef.current.startX
    if (Math.abs(delta) > 5) dragRef.current.moved = true
    rail.scrollLeft = dragRef.current.scrollLeft - delta
  }

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current.pointerId = -1
    setDragging(false)
  }

  const cancelDraggedLink = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.moved) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current.moved = false
  }

  return (
    <section className="manga-rail">
      <div className="rail-heading">
        <h2>{title}</h2>
        <div className="rail-actions">
          <div className="rail-scroll-controls" aria-label={`Scroll ${title}`}>
            <button
              aria-label={`Previous ${title}`}
              disabled={atStart}
              onClick={() => scrollRail(-1)}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label={`Next ${title}`}
              disabled={atEnd}
              onClick={() => scrollRail(1)}
              type="button"
            >
              ›
            </button>
          </div>
          <Link aria-label={`View more ${title}`} className="rail-more" to={href}>→</Link>
        </div>
      </div>
      {loading ? <div className="state-message">Loading...</div> : (
        <div className="rail-viewport">
          <div
            className={`rail-grid${dragging ? ' is-dragging' : ''}`}
            onClickCapture={cancelDraggedLink}
            onPointerCancel={stopDrag}
            onPointerDown={startDrag}
            onPointerMove={dragRail}
            onPointerUp={stopDrag}
            ref={railRef}
          >
            {items.map((manga) => <Link className="rail-card" key={manga.id} to={`/manga/${manga.id}`}>
              <div className="rail-cover">
                <img alt={getMangaTitle(manga)} draggable={false} loading="lazy" decoding="async" onError={handleImageError} src={getCoverUrl(manga, 512)} />
                {getFlagUrl(manga) && <img alt="" className="rail-flag" draggable={false} onError={handleImageError} src={getFlagUrl(manga)} />}
              </div>
              <span>{getMangaTitle(manga)}</span>
            </Link>)}
          </div>
        </div>
      )}
    </section>
  )
}

const Home = () => {
  const navigate = useNavigate()
  const [popularIndex, setPopularIndex] = useState(0)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [heroDragging, setHeroDragging] = useState(false)
  const heroSearchRef = useRef<HTMLInputElement>(null)
  const heroDragRef = useRef({
    pointerId: -1,
    startX: 0,
    moved: false,
  })

  const latestQuery = useQuery({
    queryKey: ['home-latest-updates'],
    queryFn: () => getLatestManga(6),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
  const popularQuery = useQuery({
    queryKey: ['popular-manga'],
    queryFn: () => getPopularManga(8),
    staleTime: 5 * 60 * 1000,
  })
  const recommendedQuery = useQuery({
    queryKey: ['home-recommended'],
    queryFn: () => getDiscoveryCollection('recommended').load(15, 0),
    staleTime: 5 * 60 * 1000,
  })
  const selfPublishedQuery = useQuery({
    queryKey: ['home-self-published'],
    queryFn: () => getDiscoveryCollection('self-published').load(15, 0),
    staleTime: 5 * 60 * 1000,
  })
  const seasonalQuery = useQuery({
    queryKey: ['home-seasonal'],
    queryFn: () => getDiscoveryCollection('seasonal').load(15, 0),
    staleTime: 5 * 60 * 1000,
  })
  const recentlyAddedQuery = useQuery({
    queryKey: ['home-recently-added'],
    queryFn: () => getDiscoveryCollection('recently-added').load(15, 0),
    staleTime: 5 * 60 * 1000,
  })
  const popularItems = popularQuery.data?.data ?? []
  const featured = popularItems[popularIndex] ?? popularItems[0]

  // Keep discovery sections distinct even when MangaDex queries overlap.
  const recommendedItems = recommendedQuery.data?.data ?? []
  const recommendedIds = new Set(recommendedItems.map((manga) => manga.id))
  const selfPublishedItems = (selfPublishedQuery.data?.data ?? []).filter((manga) => !recommendedIds.has(manga.id))
  const selfPublishedIds = new Set(selfPublishedItems.map((manga) => manga.id))
  const seasonalItems = (seasonalQuery.data?.data ?? []).filter((manga) => !recommendedIds.has(manga.id) && !selfPublishedIds.has(manga.id))
  const seasonalIds = new Set(seasonalItems.map((manga) => manga.id))
  const recentlyAddedItems = (recentlyAddedQuery.data?.data ?? []).filter((manga) =>
    !recommendedIds.has(manga.id) && !selfPublishedIds.has(manga.id) && !seasonalIds.has(manga.id)
  )

  useEffect(() => {
    if (popularItems.length <= 1) return
    const timer = window.setInterval(() => setPopularIndex((current) => (current + 1) % popularItems.length), 5000)
    return () => window.clearInterval(timer)
  }, [popularItems.length])

  const startHeroDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !window.matchMedia('(max-width: 980px)').matches || popularItems.length <= 1) return

    const target = event.target as HTMLElement
    if (target.closest('.hero-tools, .popular-controls, .home-menu-toggle')) return

    heroDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setHeroDragging(true)
  }

  const moveHeroDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (heroDragRef.current.pointerId !== event.pointerId) return
    if (Math.abs(event.clientX - heroDragRef.current.startX) > 8) {
      heroDragRef.current.moved = true
    }
  }

  const finishHeroDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (heroDragRef.current.pointerId !== event.pointerId) return

    const delta = event.clientX - heroDragRef.current.startX
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    heroDragRef.current.pointerId = -1
    setHeroDragging(false)

    if (Math.abs(delta) < 48 || popularItems.length <= 1) return

    setPopularIndex((current) => (
      delta < 0
        ? (current + 1) % popularItems.length
        : current === 0 ? popularItems.length - 1 : current - 1
    ))
  }

  const cancelHeroDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (heroDragRef.current.pointerId !== event.pointerId) return
    heroDragRef.current.pointerId = -1
    heroDragRef.current.moved = false
    setHeroDragging(false)
  }

  const cancelHeroClickAfterDrag = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!heroDragRef.current.moved) return
    event.preventDefault()
    heroDragRef.current.moved = false
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMobileSearchOpen(true)
        window.setTimeout(() => heroSearchRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <section className="popular-section home-popular">
        {popularQuery.isLoading ? <div className="state-message">Loading popular manga...</div> : featured ? (
          <div
            className={`popular-hero${heroDragging ? ' is-dragging' : ''}`}
            onPointerCancel={cancelHeroDrag}
            onPointerDown={startHeroDrag}
            onPointerMove={moveHeroDrag}
            onPointerUp={finishHeroDrag}
          >
            <div aria-hidden="true" className="popular-hero-bg" key={`bg-${featured.id}`} style={{ backgroundImage: `url(${getCoverUrl(featured, 512)})` }} />

            <button aria-label="Open menu" className="home-menu-toggle" onClick={() => window.dispatchEvent(new Event("open-mobile-menu"))} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <h1 className="popular-hero-heading">Popular New Titles</h1>

            <div className="hero-tools">
              <div className={'hero-search-wrap' + (mobileSearchOpen ? ' open' : '')}>
                <form className="hero-search search-box" role="search" onSubmit={(event) => { event.preventDefault(); const title = heroSearchRef.current?.value.trim(); if (title) navigate(`/search?q=${encodeURIComponent(title)}`) }}>
                  <input aria-label="Search manga" placeholder="Search" ref={heroSearchRef} maxLength={200} type="search" />
                  <kbd>Ctrl</kbd>
                  <kbd>K</kbd>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20 16.5 16.5" /></svg>
                </form>
                <button
                  aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
                  className="hero-search-toggle"
                  onClick={() => {
                    setMobileSearchOpen((open) => {
                      if (!open) window.setTimeout(() => heroSearchRef.current?.focus(), 0)
                      return !open
                    })
                  }}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20 16.5 16.5" /></svg>
                </button>
              </div>
              <Link aria-label="Saved manga" className="hero-avatar" title="Saved manga" to="/library">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" /></svg>
              </Link>
            </div>

            <Link className="popular-hero-link" key={featured.id} onClick={cancelHeroClickAfterDrag} to={`/manga/${featured.id}`}>
              <div className="popular-hero-cover">
                <img alt={getMangaTitle(featured)} draggable={false} onError={handleImageError} src={getCoverUrl(featured, 512)} />
                {getFlagUrl(featured) && <img alt="" className="popular-hero-flag" draggable={false} onError={handleImageError} src={getFlagUrl(featured)} />}
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

      <section id="updates" className="home-latest">
        <div className="rail-heading">
          <h2>Latest Updates</h2>
        </div>
        {latestQuery.isLoading ? <div className="state-message">Loading updates...</div> : latestQuery.isError ? <div className="state-message">Unable to load updates.</div> : (
          <div className="latest-list">
            {(latestQuery.data?.data ?? []).map((manga) => (
              <Link className="latest-row" key={manga.id} to={`/manga/${manga.id}`}>
                <img alt={getMangaTitle(manga)} loading="lazy" decoding="async" onError={handleImageError} src={getCoverUrl(manga)} />
                <div>
                  <strong>{getMangaTitle(manga)}</strong>
                  <span>EN · {manga.attributes.lastChapter ? `Ch. ${manga.attributes.lastChapter}` : 'Recently updated'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <MangaRail href="/browse/recommended" loading={recommendedQuery.isLoading} items={recommendedItems} title="Recommended" />
      <MangaRail href="/browse/self-published" loading={selfPublishedQuery.isLoading} items={selfPublishedItems} title="Self-Published" />
      <MangaRail href="/browse/seasonal" loading={seasonalQuery.isLoading} items={seasonalItems} title={`Seasonal: Summer ${new Date().getFullYear()}`} />
      <MangaRail href="/browse/recently-added" loading={recentlyAddedQuery.isLoading} items={recentlyAddedItems} title="Recently Added" />
    </>
  )
}

export default Home
