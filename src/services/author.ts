import instance from './api'
import type { Author, AuthorResponse } from '../types/manga'

export const getAuthorById = async (authorId: string): Promise<Author> => {
  const response = await instance.get<AuthorResponse>(`/author/${authorId}`)
  return response.data.data
}
