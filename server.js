import express from 'express'
import path from 'path'
import fs from 'fs'
import { writerApiPlugin } from './.vitepress/plugins/writer-api.mjs'

const app = express()
const port = process.env.PORT || 3000

// Mock Vite server object for the plugin
const mockServer = {
  config: {
    root: process.cwd()
  },
  ws: {
    send: (payload) => {
      console.log('WS event (ignored in production):', payload)
    }
  }
}

// Get the middleware from the plugin
const plugin = writerApiPlugin()
let middleware
plugin.configureServer({
  ...mockServer,
  middlewares: {
    use: (fn) => { middleware = fn }
  }
})

// 1. Use the private docs API middleware first
app.use((req, res, next) => {
  middleware(req, res, next)
})

// 2. Serve the built static files
const distPath = path.join(process.cwd(), '.vitepress/dist')
app.use(express.static(distPath))

// 3. Fallback to 404.html for missing routes
app.use((req, res) => {
  const notFoundPath = path.join(distPath, '404.html')
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath)
  } else {
    res.status(404).send('404 Not Found')
  }
})

app.listen(port, () => {
  console.log(`Darion Docs server running at http://localhost:${port}`)
  console.log(`Admin portal available at http://localhost:${port}/__admin`)
})
