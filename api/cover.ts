import { proxyMangaDexImage } from './_lib/imageProxy'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return Response.json(
        { error: 'Only GET and HEAD are supported.' },
        { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } },
      )
    }

    const params = new URL(request.url).searchParams
    const mangaId = params.get('mangaId') || ''
    const fileName = params.get('fileName') || ''
    const size = params.get('size') === '512' ? '512' : '256'

    if (
      !/^[0-9a-f-]{36}$/i.test(mangaId) ||
      !/^[a-z0-9._-]+$/i.test(fileName) ||
      fileName.includes('..')
    ) {
      return Response.json(
        { error: 'Invalid cover parameters.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const target = new URL(
      `https://uploads.mangadex.org/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}.${size}.jpg`,
    )
    const response = await proxyMangaDexImage(target)

    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers })
    }
    return response
  },
}
