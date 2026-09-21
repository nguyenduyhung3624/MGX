import instance from './api'
import type { Cover, CoverResponse } from '../types/manga'

export const getCoverList = async (
  params: Record<string, unknown> = {},
  limit = 20,
  offset = 0
): Promise<Cover[]> => {
  const response = await instance.get<CoverResponse>('/cover', {
    params: {
      limit,
      offset,
      ...params,
    },
  })

  return response.data.data
}

export const getCoverById = async (coverId: string): Promise<Cover> => {
  const response = await instance.get<{ data: Cover }>(`/cover/${coverId}`)
  return response.data.data
}
