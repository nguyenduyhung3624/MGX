export default async function handler(request, response) {
  const { method, headers } = request
  const requestUrl = new URL(request.url, 'https://example.com')
  const pathname = requestUrl.pathname.replace(/^\/api\/mangadex\/?/, '') || '/'
  const targetUrl = `https://api.mangadex.org${pathname}${requestUrl.search}`

  try {
    const body = ['GET', 'HEAD'].includes(method)
      ? undefined
      : await request.text()

    const fetchResponse = await fetch(targetUrl, {
      method,
      headers: {
        ...headers,
        host: 'api.mangadex.org',
      },
      body,
    })

    const contentType = fetchResponse.headers.get('content-type') || 'application/json'
    const data = await fetchResponse.text()

    response.status(fetchResponse.status)
    response.setHeader('Content-Type', contentType)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (method === 'OPTIONS') {
      response.end()
      return
    }

    response.send(data)
  } catch (error) {
    response.status(500).json({
      result: 'error',
      message: 'Failed to proxy MangaDex request',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
