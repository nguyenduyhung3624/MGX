import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const IMAGE_HOSTS = new Set(['uploads.mangadex.org', 'mangadex.network'])

function isAllowedImageHost(hostname: string) {
  return IMAGE_HOSTS.has(hostname) || hostname.endsWith('.mangadex.network')
}

async function sendImage(res: ServerResponse, target: URL) {
  if (target.protocol !== 'https:' || !isAllowedImageHost(target.hostname.toLowerCase())) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unsupported image host' }))
    return
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://mangadex.org/',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Image request failed' }))
      return
    }

    const body = Buffer.from(await upstream.arrayBuffer())
    res.statusCode = 200
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(body)
  } catch {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unable to fetch image' }))
  }
}

function localImageProxy(): Plugin {
  return {
    name: 'mgx-local-image-proxy',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next()

        const requestUrl = new URL(req.url, 'http://localhost')

        if (requestUrl.pathname === '/api/cover') {
          const mangaId = requestUrl.searchParams.get('mangaId') || ''
          const fileName = requestUrl.searchParams.get('fileName') || ''
          const size = requestUrl.searchParams.get('size') === '512' ? '512' : '256'

          if (!mangaId || !fileName || mangaId.includes('/') || fileName.includes('/')) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid cover parameters' }))
            return
          }

          const target = new URL(
            `https://uploads.mangadex.org/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}.${size}.jpg`,
          )
          await sendImage(res, target)
          return
        }

        if (requestUrl.pathname === '/api/page') {
          const rawUrl = requestUrl.searchParams.get('url') || ''
          if (!rawUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing page URL' }))
            return
          }

          let target: URL
          try {
            target = new URL(rawUrl)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid page URL' }))
            return
          }

          await sendImage(res, target)
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localImageProxy()],
  server: {
    proxy: {
      '/api/mangadex': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangadex/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api/mangadex': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangadex/, ''),
      },
    },
  },
})
