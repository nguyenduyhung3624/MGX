export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
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

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://mangadex.org/',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Page request failed' })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const body = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    return res.status(200).send(body)
  } catch {
    return res.status(502).json({ error: 'Unable to fetch page' })
  }
}
