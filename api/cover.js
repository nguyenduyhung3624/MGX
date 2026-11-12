export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }

  const mangaId = typeof req.query.mangaId === 'string' ? req.query.mangaId : ''
  const fileName = typeof req.query.fileName === 'string' ? req.query.fileName : ''
  const size = req.query.size === '512' ? '512' : '256'

  if (
    !/^[0-9a-f-]{36}$/i.test(mangaId) ||
    !/^[a-z0-9._-]+$/i.test(fileName) ||
    fileName.includes('..')
  ) {
    return res.status(400).json({ error: 'Invalid cover parameters' })
  }

  const target = new URL(
    `/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}.${size}.jpg`,
    'https://uploads.mangadex.org',
  )

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('Location', target.toString())
  return res.status(307).end()
}
