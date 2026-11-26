import { getMangaPage, getNewManga, getPopularManga } from './manga'
import type { MangaResponse } from '../types/manga'

export const DISCOVERY_REFRESH_INTERVAL = 24 * 60 * 60 * 1000

export type DiscoveryCollection =
  | 'recommended'
  | 'self-published'
  | 'seasonal'
  | 'recently-added'

type CollectionDefinition = {
  title: string
  eyebrow: string
  description: string
  load: (limit: number, offset: number) => Promise<MangaResponse>
}

export const getDiscoveryCollection = (
  collection: DiscoveryCollection
): CollectionDefinition => {
  const currentYear = new Date().getFullYear()

  const collections: Record<DiscoveryCollection, CollectionDefinition> = {
    recommended: {
      title: 'Recommended',
      eyebrow: 'MOST FOLLOWED',
      description: 'Popular English-readable manga ordered by follower count.',
      load: (limit, offset) => getPopularManga(limit, offset),
    },
    'self-published': {
      title: 'Ongoing Titles',
      eyebrow: 'ONGOING MANGA',
      description: 'English-readable manga currently marked as ongoing, ordered by follower count.',
      load: (limit, offset) => getMangaPage(
        { 'order[followedCount]': 'desc', 'status[]': ['ongoing'] },
        limit,
        offset,
      ),
    },
    seasonal: {
      title: `New Releases: ${currentYear}`,
      eyebrow: `${currentYear} RELEASES`,
      description: `English-readable manga published in ${currentYear}, ordered by latest uploaded chapter.`,
      load: (limit, offset) => getMangaPage(
        { year: currentYear, 'order[latestUploadedChapter]': 'desc' },
        limit,
        offset,
      ),
    },
    'recently-added': {
      title: 'Recently Added',
      eyebrow: 'NEW DATABASE ENTRIES',
      description: 'English-readable manga ordered by creation date, newest first.',
      load: (limit, offset) => getNewManga(limit, offset),
    },
  }

  return collections[collection]
}
