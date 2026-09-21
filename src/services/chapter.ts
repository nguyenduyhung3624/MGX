import instance from './api'
import type {
  AtHomeServerResponse,
  Chapter,
  ChapterDetailResponse,
  ChapterResponse,
} from '../types/manga'

export const getChapterList = async (
  params: Record<string, unknown> = {},
  limit = 20,
  offset = 0
): Promise<Chapter[]> => {
  const response = await instance.get<ChapterResponse>('/chapter', {
    params: {
      limit,
      offset,
      'includes[]': ['scanlation_group', 'manga'],
      ...params,
    },
  })

  return response.data.data
}

export const getChaptersByManga = async (
  mangaId: string,
  limit = 100,
  offset = 0
): Promise<Chapter[]> => {
  return getChapterList(
    {
      'manga[]': [mangaId],
      'translatedLanguage[]': ['en'],
      'order[chapter]': 'desc',
      'order[volume]': 'desc',
    },
    limit,
    offset
  )
}

export const getChapterById = async (id: string): Promise<Chapter> => {
  const response = await instance.get<ChapterDetailResponse>(`/chapter/${id}`)
  return response.data.data
}

export const getAtHomeServer = async (chapterId: string): Promise<AtHomeServerResponse> => {
  const response = await instance.get<AtHomeServerResponse>(`/at-home/server/${chapterId}`)
  return response.data
}
