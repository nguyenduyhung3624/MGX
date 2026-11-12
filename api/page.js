import { isAllowedMangaDexImageUrl, proxyMangaDexImage } from './_lib/mangadexImage.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }

  const rawUrl = typeof req.query.url === 'string' ? req.query.url : ''
  if (!rawUrl) return res.status(400).json({ error: 'Missing page URL' })

  let target
  try {
    target = new URL(rawUrl)
  } catch {
    return res.status(400).json({ error: 'Invalid page URL' })
  }

  if (
    !isAllowedMangaDexImageUrl(target) ||
    target.search ||
    target.hash
  ) {
    return res.status(400).json({ error: 'Unsupported image URL' })
  }

  let segments
  try {
    segments = target.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return res.status(400).json({ error: 'Invalid page path' })
  }

  if (
    segments.length !== 3 ||
    !['data', 'data-saver'].includes(segments[0]) ||
    !/^[a-f0-9]{32}$/i.test(segments[1]) ||
    !/^[a-z0-9][a-z0-9._-]{0,255}$/i.test(segments[2]) ||
    segments[2].includes('..')
  ) {
    return res.status(400).json({ error: 'Invalid MangaDex page path' })
  }

  return proxyMangaDexImage(req, res, target)
}
