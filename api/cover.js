import { isAllowedMangaDexImageUrl, proxyMangaDexImage } from './_lib/mangadexImage.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }

  const mangaId = typeof req.query.mangaId === 'string' ? req.query.mangaId : ''
  const fileName = typeof req.query.fileName === 'string' ? req.query.fileName : ''
  const rawSize = typeof req.query.size === 'string' ? req.query.size : '256'

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mangaId) ||
    !/^[a-z0-9][a-z0-9._-]{0,255}$/i.test(fileName) ||
    fileName.includes('..') ||
    !/\.(jpe?g|png|gif|webp)$/i.test(fileName) ||
    !['256', '512'].includes(rawSize)
  ) {
    return res.status(400).json({ error: 'Invalid cover parameters' })
  }

  const target = new URL(
    `/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}.${rawSize}.jpg`,
    'https://uploads.mangadex.org',
  )

  if (!isAllowedMangaDexImageUrl(target)) {
    return res.status(400).json({ error: 'Unsupported MangaDex image host' })
  }

  return proxyMangaDexImage(req, res, target)
}
