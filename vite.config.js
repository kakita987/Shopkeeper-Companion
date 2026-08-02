import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        bulkEdit: resolve(__dirname, 'bulk-edit.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
  plugins: [
    {
      name: 'spreadsheet-proxy',
      configureServer(server) {
        server.middlewares.use('/api/resolve', async (req, res, next) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          const requestUrl = new URL(req.url || '/', 'http://localhost')
          const targetUrl = requestUrl.searchParams.get('url')

          if (!targetUrl) {
            res.statusCode = 400
            res.end('Missing url query parameter.')
            return
          }

          try {
            const response = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0',
              },
              redirect: 'manual',
            })

            const finalUrl = response.headers.get('location') || response.url
            res.statusCode = 200
            res.setHeader('content-type', 'text/plain; charset=utf-8')
            res.end(finalUrl || targetUrl)
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : 'Unable to resolve spreadsheet URL.')
          }
        })

        server.middlewares.use('/api/spreadsheet', async (req, res, next) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          const requestUrl = new URL(req.url || '/', 'http://localhost')
          const sheetUrl = requestUrl.searchParams.get('url')

          if (!sheetUrl) {
            res.statusCode = 400
            res.end('Missing url query parameter.')
            return
          }

          try {
            const response = await fetch(sheetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0',
              },
            })

            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              // fetch() already decompresses the body, so drop headers describing the original transfer encoding.
              if (key === 'content-length' || key === 'content-encoding' || key === 'transfer-encoding') {
                return
              }
              res.setHeader(key, value)
            })

            const body = await response.text()
            res.end(body)
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : 'Unable to proxy spreadsheet request.')
          }
        })
      },
    },
  ],
})
