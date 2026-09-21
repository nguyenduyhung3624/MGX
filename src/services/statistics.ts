import instance from './api'
import type { MangaStatistics, MangaStatisticsResponse } from '../types/manga'

export const getMangaStatistics = async (mangaIds: string[]): Promise<Record<string, MangaStatistics>> => {
  if (mangaIds.length === 0) return {}

  const response = await instance.get<MangaStatisticsResponse>('/statistics/manga', {
    params: { 'manga[]': mangaIds },
  })
  return response.data.statistics
}
