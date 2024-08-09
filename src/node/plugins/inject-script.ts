import { type HtmlTagDescriptor, type PluginOption } from 'vite'
import { injectTagsToHtml, VPPT_DATA_ATTR } from '../helper/html'
import { getManifestInNode } from '../manifest-cache'

export type ScriptDescriptor = Omit<HtmlTagDescriptor, 'tag'>[]
export type ManifestScriptsFn = (manifest: Record<string, string>) => ScriptDescriptor

function generateScriptTags(scripts: ManifestScriptsFn) {
  const _scripts = scripts(getManifestInNode()) || []
  const tags: HtmlTagDescriptor[] = _scripts.map((s) => ({
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

export function injectScriptsToHtml(html: string, scripts: ManifestScriptsFn) {
  return injectTagsToHtml(html, generateScriptTags(scripts))
}

export function injectScripts(scripts: ManifestScriptsFn) {
  const plugin: PluginOption = {
    name: 'vite:public-typescript:inject-script',
    enforce: 'post',
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
