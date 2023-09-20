import fs from 'fs/promises'
import express from 'express'
import { injectScriptsToHtml } from 'vite-plugin-public-typescript'
import manifest from './public-typescript/manifest.json' assert { type: 'json' }

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 4002
const base = process.env.BASE || '/'

// Cached production assets
const templateHtml = isProduction ? await fs.readFile('./dist/client/index.html', 'utf-8') : ''
const ssrManifest = isProduction ? await fs.readFile('./dist/client/ssr-manifest.json', 'utf-8') : undefined

// Create http server
const app = express()

// Add Vite or respective production middlewares
let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true, port: 3003, hmr: { port: 24567 } },
    appType: 'custom',
    base,
  })

  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

// Serve HTML
app.use('*', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')

    let template
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    const rendered = await render(url, ssrManifest)

    let html = template.replace(`<!--app-head-->`, rendered.head ?? '').replace(`<!--app-html-->`, rendered.html ?? '')

    html = injectScriptsToHtml(html, [
      {
        attrs: {
          src: manifest.ssr,
        },
        injectTo: 'head-prepend',
      },
    ])
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})
