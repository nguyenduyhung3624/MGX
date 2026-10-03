import { getMangaPage, getNewManga, getPopularManga } from './manga'
import type { MangaResponse } from '../types/manga'

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
      title: 'Self-Published',
      eyebrow: 'ONGOING DISCOVERY',
      description: 'Ongoing titles ordered by follower count, starting deeper in the discovery feed.',
      load: (limit, offset) => getMangaPage(
        { 'order[followedCount]': 'desc', 'status[]': ['ongoing'] },
        limit,
        60 + offset,
      ),
    },
    seasonal: {
      title: `Seasonal: Summer ${currentYear}`,
      eyebrow: `${currentYear} RELEASES`,
      description: `Titles released in ${currentYear}, ordered by latest uploaded chapter.`,
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
