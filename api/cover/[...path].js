export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const marker = '/api/cover/'
  const markerIndex = requestUrl.pathname.indexOf(marker)

  if (markerIndex === -1) return res.status(400).json({ error: 'Missing cover path' })

  const path = decodeURIComponent(requestUrl.pathname.slice(markerIndex + marker.length))
  if (!path || path.includes('..')) return res.status(400).json({ error: 'Invalid cover path' })

  const upstream = await fetch(`https://uploads.mangadex.org/covers/${path}`, {
    method: req.method,
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'User-Agent': 'MGX/1.0',
    },
    redirect: 'follow',
  })

  if (!upstream.ok) return res.status(upstream.status).json({ error: 'Cover request failed' })

  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800')

  if (req.method === 'HEAD') return res.status(upstream.status).end()

  return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()))
}
