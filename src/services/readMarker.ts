import instance from './api'

export const getMangaReadMarkers = async (mangaId: string, token: string): Promise<string[]> => {
  const response = await instance.get<{ data: string[] }>(`/manga/${mangaId}/read`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data.data
}

export const getAllReadMarkers = async (token: string): Promise<string[]> => {
  const response = await instance.get<{ data: string[] }>('/manga/read', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data.data
}

export const markMangaAsRead = async (
  mangaId: string,
  chapterIds: string[],
  token: string
): Promise<void> => {
  await instance.post(`/manga/${mangaId}/read`, { chapterIds }, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
