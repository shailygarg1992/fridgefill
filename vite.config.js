import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function walmartSearchPlugin() {
  return {
    name: 'walmart-search-proxy',
    configureServer(server) {
      server.middlewares.use('/api/walmart-search', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const query = url.searchParams.get('q')
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing q param' }))
          return
        }
        try {
          const apiKey = process.env.GOOGLE_CSE_API_KEY
          const cx = process.env.GOOGLE_CSE_ID
          if (!apiKey || !cx) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ products: [{ name: query, image: null, price: null, id: null }] }))
            return
          }
          const gUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent('walmart ' + query)}&searchType=image&num=1&imgSize=medium&key=${apiKey}&cx=${cx}`
          const resp = await fetch(gUrl)
          const data = await resp.json()
          const item = data.items?.[0]
          const products = [{
            name: item?.title || query,
            image: item?.link || null,
            price: null,
            id: null,
          }]
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ products }))
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Failed to search', products: [] }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), walmartSearchPlugin()],
  server: {
    host: true,
    port: 5173,
  },
})
