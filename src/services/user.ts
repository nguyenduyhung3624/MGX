import instance from './api'
import type { Manga, MangaResponse } from '../types/manga'

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

export const getFollowedManga = async (
  token: string,
  limit = 20,
  offset = 0
): Promise<Manga[]> => {
  const response = await instance.get<MangaResponse>('/user/follows/manga', {
    headers: authHeaders(token),
    params: {
      limit,
      offset,
      'includes[]': ['cover_art'],
    },
  })
  return response.data.data
}
