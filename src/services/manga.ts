import instance from './api'
import type {
  Manga,
  MangaAggregateResponse,
  MangaDetailResponse,
  MangaResponse,
} from '../types/manga'

export const getMangaList = async (
  params: Record<string, unknown> = {},
  limit = 20,
  offset = 0
): Promise<Manga[]> => {
  const response = await getMangaPage(params, limit, offset)
  return response.data
}

export const getMangaPage = async (
  params: Record<string, unknown> = {},
  limit = 20,
  offset = 0
): Promise<MangaResponse> => {
  const response = await instance.get<MangaResponse>('/manga', {
    params: {
      limit,
      offset,
      'availableTranslatedLanguage[]': ['en'],
      'contentRating[]': ['safe', 'suggestive'],
      'includes[]': ['cover_art'],
      ...params,
    },
  })

  return response.data
}

export const getMangaById = async (id: string): Promise<Manga> => {
  const response = await instance.get<MangaDetailResponse>(`/manga/${id}`, {
    params: {
      'includes[]': ['cover_art', 'author', 'artist'],
    },
  })
  return response.data.data
}

export const searchManga = async (
  title: string,
  limit = 20,
  offset = 0
): Promise<Manga[]> => {
  const response = await instance.get<MangaResponse>('/manga', {
    params: {
      title,
      limit,
      offset,
      'availableTranslatedLanguage[]': ['en'],
      'contentRating[]': ['safe', 'suggestive'],
      'includes[]': ['cover_art'],
    },
  })

  return response.data.data
}

export const getRandomManga = async (): Promise<Manga> => {
  const response = await instance.get<MangaDetailResponse>('/manga/random', {
    params: {
      'includes[]': ['cover_art', 'author', 'artist'],
    },
  })
  return response.data.data
}

export const getMangaByAuthor = async (
  authorId: string,
  limit = 20,
  offset = 0
): Promise<MangaResponse> => {
  const response = await instance.get<MangaResponse>('/manga', {
    params: {
      'author[]': [authorId],
      limit,
      offset,
      'includes[]': ['cover_art'],
    },
  })
  return response.data
}

export const getLatestManga = async (
  limit = 20,
  offset = 0
): Promise<MangaResponse> => {
  const response = await instance.get<MangaResponse>('/manga', {
    params: {
      limit,
      offset,
      'availableTranslatedLanguage[]': ['en'],
      'order[latestUploadedChapter]': 'desc',
      'contentRating[]': ['safe', 'suggestive'],
      'includes[]': ['cover_art'],
    },
  })

  return response.data
}

export const getPopularManga = async (
  limit = 20,
  offset = 0
): Promise<MangaResponse> => {
  const response = await instance.get<MangaResponse>('/manga', {
    params: {
      limit,
      offset,
      'availableTranslatedLanguage[]': ['en'],
      'order[followedCount]': 'desc',
      'contentRating[]': ['safe', 'suggestive'],
      'includes[]': ['cover_art'],
    },
  })

  return response.data
}

export const getNewManga = async (
  limit = 20,
  offset = 0
): Promise<MangaResponse> => {
  const response = await instance.get<MangaResponse>('/manga', {
    params: {
      limit,
      offset,
      'availableTranslatedLanguage[]': ['en'],
      'order[createdAt]': 'desc',
      'contentRating[]': ['safe', 'suggestive'],
      'includes[]': ['cover_art'],
    },
  })

  return response.data
}

export const getMangaAggregate = async (
  id: string,
  params: Record<string, unknown> = {}
): Promise<MangaAggregateResponse> => {
  const response = await instance.get<MangaAggregateResponse>(`/manga/${id}/aggregate`, {
    params: {
      'translatedLanguage[]': ['en'],
      includeUnavailable: 1,
      ...params,
    },
  })

  return response.data
}
