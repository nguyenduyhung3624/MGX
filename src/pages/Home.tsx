import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getLatestManga, getMangaPage, getNewManga, getPopularManga } from '../services/manga'
import { getTags } from '../services/tags'
import SaveButton from '../components/manga/SaveButton'
import { toSavedManga } from '../services/localLibrary'
import type { Manga } from '../types/manga'

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

const MangaRail = ({ title, items, loading }: MangaRailProps) => (
  <section className="manga-rail">
    <div className="rail-heading">
      <h2>{title}</h2>
      <span aria-hidden="true">→</span>
    </div>
    {loading ? <div className="state-message">Loading...</div> : (
      <div className="rail-grid">
        {items.map((manga) => <Link className="rail-card" key={manga.id} to={`/manga/${manga.id}`}>
          <div className="rail-cover">
            <img alt={getMangaTitle(manga)} loading="lazy" decoding="async" onError={handleImageError} src={getCoverUrl(manga, 512)} />
            {getFlagUrl(manga) && <img alt="" className="rail-flag" onError={handleImageError} src={getFlagUrl(manga)} />}
          </div>
          <span>{getMangaTitle(manga)}</span>
        </Link>)}
      </div>
    )}
  </section>
)

const Home = () => {
  const navigate = useNavigate()
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
        setMobileSearchOpen(true)
        window.setTimeout(() => heroSearchRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])


