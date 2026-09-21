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

export const setMangaReadingStatus = async (
  mangaId: string,
  status: string | null,
  token: string
): Promise<void> => {
  await instance.post(`/manga/${mangaId}/status`, { status }, { headers: authHeaders(token) })
}

export const followManga = async (mangaId: string, token: string): Promise<void> => {
  await instance.post(`/manga/${mangaId}/follow`, undefined, { headers: authHeaders(token) })
}

export const unfollowManga = async (mangaId: string, token: string): Promise<void> => {
  await instance.delete(`/manga/${mangaId}/follow`, { headers: authHeaders(token) })
}

export const getMangaReadingStatus = async (mangaId: string, token: string): Promise<string | null> => {
  const response = await instance.get<{ status: string | null }>(`/manga/${mangaId}/status`, {
    headers: authHeaders(token),
  })
  return response.data.status
}
