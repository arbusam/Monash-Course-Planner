import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { isValidUnitCode, parseHandbookRequisites } from './src/utils/requisites.js'

const HANDBOOK_YEAR = process.env.HANDBOOK_YEAR || '2026'

function requisitesDevApiPlugin() {
  return {
    name: 'requisites-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/requisites', async (req, res, next) => {
        if (req.method !== 'GET') {
          next()
          return
        }

        try {
          const url = new URL(req.url, 'http://localhost')
          const code = (url.searchParams.get('code') || '').trim().toUpperCase()

          if (!isValidUnitCode(code)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid unit code' }))
            return
          }

          const handbookUrl = `https://handbook.monash.edu/${HANDBOOK_YEAR}/units/${code.toLowerCase()}`
          const response = await fetch(handbookUrl, {
            headers: {
              'User-Agent': 'MonashCoursePlanner/2.1 (dev)',
              Accept: 'text/html'
            }
          })

          if (!response.ok) {
            res.statusCode = response.status === 429 ? 503 : 502
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            if (response.status === 429) {
              res.setHeader('Retry-After', '60')
            }
            res.end(JSON.stringify({
              error: `Failed to load handbook page (${response.status})`,
              code
            }))
            return
          }

          const html = await response.text()
          const rules = parseHandbookRequisites(html)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
          res.end(JSON.stringify({ code, handbookYear: HANDBOOK_YEAR, rules }))
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify({ error: error.message || 'Failed to fetch requisites' }))
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), requisitesDevApiPlugin()],
  base: '/',
  server: {
    proxy: {
      '/handbook-proxy': {
        target: 'https://handbook.monash.edu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/handbook-proxy/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
  },
})
