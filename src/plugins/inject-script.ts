import type { HtmlTagDescriptor, PluginOption } from 'vite'
import { VPPT_DATA_ATTR } from '../helper/html'

type Scripts = Omit<HtmlTagDescriptor, 'tag'>[]

export function injectScripts(scripts: Scripts) {
  const plugin: PluginOption = {
    name: 'vite:public-typescript:inject-script',
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        const tags: HtmlTagDescriptor[] = scripts.map((s) => ({
          ...s,
          tag: 'script',
          attrs: {
            crossorigin: true,
            ...s.attrs,
            [VPPT_DATA_ATTR]: 'true',
          },
        }))
        return {
          tags,
          html,
        }
      },
    },
  }

  // Return as `any` to avoid Plugin type mismatches when there are multiple Vite versions installed
  return plugin as any
}
