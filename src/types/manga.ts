export interface Manga {
  id: string;
  type: 'manga';
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    description: Record<string, string>;
    status: string;
    year: number | null;
    contentRating: string;
    latestUploadedChapter: string | null;
    tags?: Array<{ id: string; type: string; attributes?: { name?: Record<string, string> } }>;
    isLocked?: boolean;
    originalLanguage?: string | null;
    availableTranslatedLanguages?: string[];
    lastChapter?: string | null;
    publicationDemographic?: string | null;
  };
  relationships: MangaRelationship[];
}

export interface MangaRelationship {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
    title?: string;
    description?: string;
    name?: string;
    locale?: string | null;
    volume?: string | null;
    chapter?: string | null;
  };
}

export interface MangaResponse {
  result: string;
  response: string;
  data: Manga[];
  limit: number;
  offset: number;
  total: number;
}

export interface MangaDetailResponse {
  result: string;
  response: string;
  data: Manga;
}

export interface AggregateChapter {
  id: string;
  chapter: string;
  volume?: string | null;
  count?: number;
}

export interface AggregateVolume {
  volume: string;
  count: number;
  chapters: Record<string, AggregateChapter>;
}

export interface MangaAggregateResponse {
  result: string;
  volumes: Record<string, AggregateVolume>;
  total: number;
}

export interface Chapter {
  id: string;
  type: 'chapter';
  attributes: {
    title: string;
    volume: string | null;
    chapter: string | null;
    pages: number;
    translatedLanguage: string | null;
    externalUrl: string | null;
    publishAt: string | null;
    readableAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  relationships: MangaRelationship[];
}

export interface ChapterResponse {
  result: string;
  response: string;
  data: Chapter[];
  limit: number;
  offset: number;
  total: number;
}

export interface ChapterDetailResponse {
  result: string;
  response: string;
  data: Chapter;
}

export interface Cover {
  id: string;
  type: 'cover_art';
  attributes: {
    description?: string | null;
    volume?: string | null;
    fileName: string;
    locale?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
}

export interface CoverResponse {
  result: string;
  response: string;
  data: Cover[];
  limit: number;
  offset: number;
  total: number;
}

export interface Tag {
  id: string;
  type: 'tag';
  attributes: {
    name: Record<string, string>;
    description: Record<string, string>;
    group: string;
    version: number;
  };
}

export interface TagResponse {
  result: string;
  response: string;
  data: Tag[];
  limit: number;
  offset: number;
  total: number;
}

export interface Author {
  id: string;
  type: 'author';
  attributes: {
    name: string;
    imageUrl?: string | null;
    biography?: Record<string, string>;
    website?: string | null;
    twitter?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
}

export interface AuthorResponse {
  result: string;
  response: string;
  data: Author;
}

export interface ScanlationGroup {
  id: string;
  type: 'scanlation_group';
  attributes: {
    name: string;
    altNames?: string[];
    website?: string | null;
    twitter?: string | null;
    discord?: string | null;
    description?: string | null;
  };
}

export interface ScanlationGroupResponse {
  result: string;
  response: string;
  data: ScanlationGroup;
}

export interface MangaStatistics {
  rating?: { average?: number | null; bayesian?: number | null };
  follows?: number;
  comments?: { threadId?: number; repliesCount?: number };
}

export interface MangaStatisticsResponse {
  result: string;
  statistics: Record<string, MangaStatistics>;
}

export interface AtHomeServer {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

export interface AtHomeServerResponse {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}
