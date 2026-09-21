import instance from './api'
import type { Tag, TagResponse } from '../types/manga'

export const getTags = async (
  params: Record<string, unknown> = {},
  limit = 100,
  offset = 0
): Promise<Tag[]> => {
  const response = await instance.get<TagResponse>('/manga/tag', {
    params: {
      limit,
      offset,
      ...params,
    },
  })

  return response.data.data
}
