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

  const host = target.hostname.toLowerCase()
  const allowed =
    target.protocol === 'https:' &&
    (host === 'uploads.mangadex.org' ||
      host === 'mangadex.network' ||
      host.endsWith('.mangadex.network'))

  if (!allowed) return res.status(400).json({ error: 'Unsupported image host' })

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('Location', target.toString())
  return res.status(307).end()
}
