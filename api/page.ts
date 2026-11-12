import { proxyMangaDexImage } from './_lib/imageProxy'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return Response.json(
        { error: 'Only GET and HEAD are supported.' },
        { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } },
      )
    }

    const rawUrl = new URL(request.url).searchParams.get('url') || ''
    if (!rawUrl) {
      return Response.json(
        { error: 'Missing page URL.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    let target: URL
    try {
      target = new URL(rawUrl)
    } catch {
      return Response.json(
        { error: 'Invalid page URL.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const response = await proxyMangaDexImage(target)
    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers })
    }
    return response
  },
}
