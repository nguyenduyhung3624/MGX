const MANGADEX_USER_AGENT = 'MGX/1.0 (+https://mgx-cm.vercel.app)'
const IMAGE_ACCEPT = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'

export function isAllowedMangaDexImageUrl(url) {
  const host = url.hostname.toLowerCase()
  return url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (host === 'uploads.mangadex.org' ||
      host === 'mangadex.network' ||
      host.endsWith('.mangadex.network'))
}

export async function proxyMangaDexImage(req, res, target) {
  const method = req.method.toUpperCase()
  const headers = {
    Accept: IMAGE_ACCEPT,
    'User-Agent': MANGADEX_USER_AGENT,
  }

  try {
    let currentUrl = target
    let upstream

    for (let redirects = 0; redirects <= 3; redirects += 1) {
      upstream = await fetch(currentUrl, {
        method,
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      })

      if (![301, 302, 303, 307, 308].includes(upstream.status)) break

      const location = upstream.headers.get('location')
      if (!location || redirects === 3) {
        return res.status(502).json({ error: 'MangaDex image redirect could not be followed' })
      }

      const nextUrl = new URL(location, currentUrl)
      if (!isAllowedMangaDexImageUrl(nextUrl)) {
        return res.status(502).json({ error: 'MangaDex redirected to an unsupported image host' })
      }
      currentUrl = nextUrl
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    res.setHeader('X-MGX-Upstream-Status', String(upstream.status))
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Content-Type', contentType)
      const errorBody = Buffer.from(await upstream.arrayBuffer())
      return res.status(upstream.status).send(errorBody)
    }

    if (!contentType.toLowerCase().startsWith('image/')) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(502).json({
        error: 'MangaDex returned a non-image response',
        upstreamContentType: contentType,
      })
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')

    const contentLength = upstream.headers.get('content-length')
    if (contentLength) res.setHeader('Content-Length', contentLength)

    if (method === 'HEAD') return res.status(200).end()

    const body = Buffer.from(await upstream.arrayBuffer())
    return res.status(200).send(body)
  } catch (error) {
    console.error('MGX MangaDex image proxy failed:', error)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(502).json({ error: 'Unable to fetch image from MangaDex' })
  }
}
