const MANGADEX_API = 'https://api.mangadex.org'
const MIN_REQUEST_INTERVAL_MS = 250
const UPSTREAM_TIMEOUT_MS = 15_000

// Keep requests from a warm function instance below MangaDex's approximate
// per-IP ceiling. Vercel's CDN cache handles identical requests across users.
let requestQueue: Promise<void> = Promise.resolve()
let nextRequestAt = 0
let upstreamCooldownUntil = 0

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

async function waitForRequestSlot() {
  const previous = requestQueue
  let release!: () => void
  requestQueue = new Promise<void>((resolve) => {
    release = resolve
  })

  await previous

  try {
    const waitUntil = Math.max(nextRequestAt, upstreamCooldownUntil)
    const waitMilliseconds = waitUntil - Date.now()
    if (waitMilliseconds > 0) await sleep(waitMilliseconds)
    nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS
  } finally {
    release()
  }
}

function getRetryDeadline(response: Response): number {
  const mangaDexRetryAfter = response.headers.get('x-ratelimit-retry-after')
  if (mangaDexRetryAfter) {
    const value = Number(mangaDexRetryAfter)
    if (Number.isFinite(value)) {
      // MangaDex documents this header as a Unix timestamp.
      return value < 1_000_000_000_000 ? value * 1_000 : value
    }
    const parsedDate = Date.parse(mangaDexRetryAfter)
    if (Number.isFinite(parsedDate)) return parsedDate
  }

  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Date.now() + Math.max(0, seconds) * 1_000
    const parsedDate = Date.parse(retryAfter)
    if (Number.isFinite(parsedDate)) return parsedDate
  }

  return Date.now() + 5_000
}

function jsonError(message: string, status: number, extraHeaders?: HeadersInit) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...Object.fromEntries(new Headers(extraHeaders).entries()),
      },
    },
  )
}

export default {
  async fetch(request: Request): Promise<Response> {
    const method = request.method.toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      return jsonError('Only GET and HEAD are supported by this MangaDex proxy.', 405, {
        Allow: 'GET, HEAD',
      })
    }

    const incomingUrl = new URL(request.url)
    const routedPath = incomingUrl.searchParams.get('_mgx_path') || ''
    const safePath = routedPath.replace(/^\/+/, '')
    const upstreamUrl = new URL(safePath ? `${MANGADEX_API}/${safePath}` : MANGADEX_API)

    for (const [key, value] of incomingUrl.searchParams) {
      if (key !== '_mgx_path' && key !== '_vercel_share' && key !== 'path') {
        upstreamUrl.searchParams.append(key, value)
      }
    }

    const upstreamHeaders = new Headers({
      Accept: request.headers.get('accept') || 'application/json',
      'User-Agent': 'MGX/1.0 (+https://mgx-cm.vercel.app)',
    })
    const acceptLanguage = request.headers.get('accept-language')
    if (acceptLanguage) upstreamHeaders.set('Accept-Language', acceptLanguage)

    try {
      await waitForRequestSlot()

      const upstream = await fetch(upstreamUrl, {
        method,
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })

      if (upstream.status === 429) {
        upstreamCooldownUntil = Math.max(
          upstreamCooldownUntil,
          getRetryDeadline(upstream),
        )
      }

      const responseHeaders = new Headers({
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'X-Content-Type-Options': 'nosniff',
      })

      for (const header of [
        'retry-after',
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-ratelimit-retry-after',
      ]) {
        const value = upstream.headers.get(header)
        if (value) responseHeaders.set(header, value)
      }

      if (upstream.status === 200 && method === 'GET') {
        responseHeaders.set(
          'Cache-Control',
          'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        )
      } else {
        responseHeaders.set('Cache-Control', 'no-store')
      }

      const body = method === 'HEAD' ? null : await upstream.arrayBuffer()
      return new Response(body, {
        status: upstream.status,
        headers: responseHeaders,
      })
    } catch (error) {
      console.error('MangaDex proxy request failed:', error)
      const message = error instanceof Error && error.name === 'TimeoutError'
        ? 'MangaDex did not respond before the request timed out.'
        : 'Unable to reach MangaDex right now.'
      return jsonError(message, 504)
    }
  },
}
