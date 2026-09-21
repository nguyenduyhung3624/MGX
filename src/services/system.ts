import instance from './api'

export const pingMangaDex = async (): Promise<boolean> => {
  const response = await instance.get<{ result: string }>('/ping')
  return response.data.result === 'ok'
}
