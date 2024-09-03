import { type PluginOption } from 'vite'
import { resolvedVirtualModuleId, virtualModuleId } from '../helper/virtual'
import { getManifestInNode } from '../manifest-cache'

export function pluginVirtual(): PluginOption {
  const plugin: PluginOption = {
    name: 'vite:public-typescript:virtual',
    enforce: 'post',
    config: () => ({
      optimizeDeps: {
        exclude: [virtualModuleId],
      },
    }),
    async resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const manifest = ${JSON.stringify(getManifestInNode())}`
      }
    },
  }

  return plugin
}
