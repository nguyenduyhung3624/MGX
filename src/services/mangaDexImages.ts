export function getCoverImageUrl(
  mangaId: string,
  fileName: string,
  size: 256 | 512 = 256,
): string {
  const params = new URLSearchParams({
    mangaId,
    fileName,
    size: String(size),
  })
  return `/api/cover?${params.toString()}`
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

  if (
    base.protocol !== 'https:' ||
    !allowedHost ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error('MangaDex returned an unsupported image host.')
  }

  // MangaDex@Home baseUrl may contain a temporary access-token path.
  // Preserve it when appending the quality/hash/file segments.
  const basePath = base.pathname.replace(/\/+$/, '')
  const target = `${base.origin}${basePath}/${quality}/${encodeURIComponent(hash)}/${encodeURIComponent(fileName)}`
  return `/api/page?url=${encodeURIComponent(target)}`
}
