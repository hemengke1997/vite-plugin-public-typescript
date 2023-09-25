import { type HtmlTagDescriptor, type PluginOption } from 'vite'
import { VPPT_DATA_ATTR, injectTagsToHtml } from '../helper/html'

export type Scripts = Omit<HtmlTagDescriptor, 'tag'>[]

export function generateScriptTags(scripts: Scripts) {
  const tags: HtmlTagDescriptor[] = scripts.map((s) => ({
    ...s,
    attrs: {
      crossorigin: true,
      ...s.attrs,
      [VPPT_DATA_ATTR]: true,
    },
    tag: 'script',
  }))
  return tags
}

export function injectScriptsToHtml(html: string, scripts: Scripts) {
  return injectTagsToHtml(html, generateScriptTags(scripts))
}

export function injectScripts(scripts: Scripts) {
  const plugin: PluginOption = {
    name: 'vite:public-typescript:inject-script',
    transformIndexHtml: {
      async handler(html) {
        return {
          html,
          tags: generateScriptTags(scripts),
        }
      },
      order: 'post',
    },
  }

  // Return as `any` to avoid Plugin type mismatches when there are multiple Vite versions installed
  return plugin as any
}
