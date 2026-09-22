export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const mangaId = typeof req.query.mangaId === 'string' ? req.query.mangaId : ''
  const fileName = typeof req.query.fileName === 'string' ? req.query.fileName : ''
  const size = req.query.size === '512' ? '512' : '256'

  if (!mangaId || !fileName || mangaId.includes('/') || fileName.includes('/')) {
    return res.status(400).json({ error: 'Invalid cover parameters' })
  }

  const target = `https://uploads.mangadex.org/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}.${size}.jpg`

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: 'image/jpeg,image/*;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://mangadex.org/',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Cover request failed' })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const body = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800')
    return res.status(200).send(body)
  } catch {
    return res.status(502).json({ error: 'Unable to fetch cover' })
  }
}
