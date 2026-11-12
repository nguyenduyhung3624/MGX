const MANGADEX_COVER_HOST = 'https://uploads.mangadex.org'

export function getCoverImageUrl(
  mangaId: string,
  fileName: string,
  size: 256 | 512 = 256,
): string {
  return `${MANGADEX_COVER_HOST}/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}.${size}.jpg`
}

export function getChapterPageImageUrl(
  baseUrl: string,
  quality: 'data' | 'data-saver',
  hash: string,
  fileName: string,
): string {
  const base = new URL(baseUrl)
  const hostname = base.hostname.toLowerCase()
  const allowedHost =
    hostname === 'uploads.mangadex.org' ||
    hostname === 'mangadex.network' ||
    hostname.endsWith('.mangadex.network')

  if (base.protocol !== 'https:' || !allowedHost) {
    throw new Error('MangaDex returned an unsupported image host.')
  }

  return `${base.origin}/${quality}/${encodeURIComponent(hash)}/${encodeURIComponent(fileName)}`
}
