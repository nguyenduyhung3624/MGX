export default async function handler(req, res) {
  const requestUrl = new URL(
    req.url || '/',
    `https://${req.headers.host || 'localhost'}`
  )

  const marker = '/api/mangadex/'
  const markerIndex = requestUrl.pathname.indexOf(marker)

  let path = ''

  if (markerIndex !== -1) {
    path = decodeURIComponent(
      requestUrl.pathname.slice(markerIndex + marker.length)
    )
  }

  if (!path) {
    const rawPath = Array.isArray(req.query?.path)
      ? req.query.path
      : String(req.query?.path || '').split('/').filter(Boolean)

    path = rawPath.map((segment) => decodeURIComponent(segment)).join('/')
  }

  if (!path) {
    return res.status(400).json({ error: 'Missing MangaDex path' })
  }

  const isCover = path.startsWith('covers/')
  const origin = isCover
    ? 'https://uploads.mangadex.org'
    : 'https://api.mangadex.org'

  const targetUrl = new URL(`${origin}/${path}`)

  requestUrl.searchParams.forEach((value, key) => {
    if (key === '__path' || key === '___path') return

    targetUrl.searchParams.append(key, value)
  })

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
