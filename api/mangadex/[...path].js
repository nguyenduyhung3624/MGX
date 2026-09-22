export default async function handler(req, res) {
  const rawPath = Array.isArray(req.query.path)
    ? req.query.path
    : String(req.query.path || '').split('/').filter(Boolean)

  const path = rawPath.join('/')

  if (!path) {
    return res.status(400).json({ error: 'Missing MangaDex path' })
  }

  const isCover = rawPath[0] === 'covers'
  const origin = isCover
    ? 'https://uploads.mangadex.org'
    : 'https://api.mangadex.org'

  const targetUrl = new URL(`${origin}/${path}`)

  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue

    if (Array.isArray(value)) {
      value.forEach((item) => targetUrl.searchParams.append(key, String(item)))
    } else if (value != null) {
      targetUrl.searchParams.set(key, String(value))
    }
  }

  const upstream = await fetch(targetUrl.toString(), {
    method: req.method,
    headers: {
      Accept: req.headers.accept || '*/*',
      ...(req.headers['content-type']
        ? { 'Content-Type': req.headers['content-type'] }
        : {}),
      ...(req.headers.authorization
        ? { Authorization: req.headers.authorization }
        : {}),
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  })

  const contentType = upstream.headers.get('content-type')

  if (contentType) {
    res.setHeader('Content-Type', contentType)
  }

  const cacheControl = upstream.headers.get('cache-control')
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl)
  }

  res.status(upstream.status)

  if (req.method === 'HEAD') {
    return res.end()
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  return res.send(buffer)
}
