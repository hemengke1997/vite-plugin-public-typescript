import path from 'node:path'
import { type InlineConfig, resolveConfig, type ResolvedConfig } from 'vite'
import { beforeEach } from 'vitest'
import { type GlobalConfig } from '../src/node/global-config/global-config-builder'
import { resolveOptions } from '../src/node/helper/default-options'
import { setupGlobalConfig } from '../src/node/helper/utils'
import { type CacheValueEx } from '../src/node/manifest-cache'

const config: InlineConfig = {
  configFile: path.resolve(__dirname, './fixtures/demo/vite.config.ts'),
}
const viteConfig: ResolvedConfig = await resolveConfig(config, 'serve')

declare module 'vitest' {
  export interface TestContext {
    _globalConfig: GlobalConfig<CacheValueEx>
    foo?: string
  }
}

beforeEach(async (ctx) => {
  const c = await setupGlobalConfig(viteConfig, resolveOptions(viteConfig))
  ctx._globalConfig = c.all
})
