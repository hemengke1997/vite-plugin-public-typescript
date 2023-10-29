import { type PluginOption } from 'vite'
import { resolvedVirtualModuleId, virtualModuleId } from '../helper/virtual'
import { manifestCache } from '../manifest-cache'

export function pluginVirtual() {
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
        return `export default ${JSON.stringify(manifestCache.getManifestJson())}`
      }
    },
  }

  return plugin
}
