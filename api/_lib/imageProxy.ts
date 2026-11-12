const IMAGE_HOSTS = new Set(['uploads.mangadex.org'])

function isAllowedImageHost(hostname: string) {
  const host = hostname.toLowerCase()
  return IMAGE_HOSTS.has(host) || host === 'mangadex.network' || host.endsWith('.mangadex.network')
}

export async function proxyMangaDexImage(target: URL): Promise<Response> {
  if (target.protocol !== 'https:' || !isAllowedImageHost(target.hostname)) {
    return Response.json(
      { error: 'Unsupported image host.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; MGX/1.0)',
        Referer: 'https://mangadex.org/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })

    if (!upstream.ok) {
      return Response.json(
        { error: 'MangaDex image request failed.', upstreamStatus: upstream.status },
        { status: upstream.status, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    if (!contentType.toLowerCase().startsWith('image/')) {
      return Response.json(
        { error: 'MangaDex returned a non-image response.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return new Response(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('MGX image proxy failed:', error)
    return Response.json(
      { error: 'Unable to fetch the MangaDex image.' },
      { status: 504, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
