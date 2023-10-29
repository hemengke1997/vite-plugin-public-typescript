import MagicString from 'magic-string'
import path from 'node:path'
import { type PluginOption, send } from 'vite'
import { getScriptInfo, nodeIsElement, traverseHtml } from '../helper/html'
import { addCodeHeader } from '../helper/server'
import { manifestCache } from '../manifest-cache'

export function pluginServer() {
  const plugin: PluginOption = {
    name: 'vite:public-typescript:server',
    apply: 'serve',
    enforce: 'post',
    load(id) {
      const cacheItem = manifestCache.findCacheItemByPath(id)
      if (cacheItem) {
        return {
          code: '',
          map: null,
        }
      }
    },
    async configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          if (req?.url?.startsWith('/') && req?.url?.endsWith('.js')) {
            const cacheItem = manifestCache.findCacheItemByPath(req.url)
            if (cacheItem) {
              return send(req, res, addCodeHeader(cacheItem._code || ''), 'js', {
                cacheControl: 'max-age=31536000,immutable',
                headers: server.config.server.headers,
                map: null,
              })
            }
          }
        } catch (error) {
          return next(error)
        }
        next()
      })
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html, { filename }) {
        const s = new MagicString(html)

        await traverseHtml(html, filename, (node) => {
          if (!nodeIsElement(node)) {
            return
          }
          // script tags
          if (node.nodeName === 'script') {
            const { src, vppt } = getScriptInfo(node)

            if (vppt?.name && src?.value) {
              const c = manifestCache.get()
              let cacheItem = manifestCache.findCacheItemByPath(src.value)

              if (!cacheItem) {
                const fileName = path.basename(src.value).split('.')[0]
                cacheItem = c[fileName]
              }

              if (cacheItem) {
                const attrs = node.attrs
                  .reduce((acc, attr) => {
                    if (attr.name === src.name) {
                      acc += ` ${attr.name}="${cacheItem!.path}"`
                      return acc
                    }
                    acc += attr.value ? ` ${attr.name}="${attr.value}"` : ` ${attr.name}`
                    return acc
                  }, '')
                  .trim()

                s.update(
                  node.sourceCodeLocation!.startOffset,
                  node.sourceCodeLocation!.endOffset,
                  `<script ${attrs}></script>`,
                )
              } else {
                s.remove(node.sourceCodeLocation!.startOffset, node.sourceCodeLocation!.endOffset)
              }
            }
          }
        })
        return s.toString()
      },
    },
  }

  return plugin
}
