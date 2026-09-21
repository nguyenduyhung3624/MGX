import instance from './api'
import type { ScanlationGroup, ScanlationGroupResponse } from '../types/manga'

export const getScanlationGroupById = async (groupId: string): Promise<ScanlationGroup> => {
  const response = await instance.get<ScanlationGroupResponse>(`/group/${groupId}`)
  return response.data.data
}
