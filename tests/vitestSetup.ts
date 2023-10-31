import path from 'node:path'
import { type InlineConfig, type ResolvedConfig, resolveConfig } from 'vite'
import { beforeEach } from 'vitest'
import { type GlobalConfig } from '../src/node/global-config/GlobalConfigBuilder'
import { DEFAULT_OPTIONS } from '../src/node/helper/default-options'
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
  const c = await setupGlobalConfig(viteConfig, DEFAULT_OPTIONS)
  ctx._globalConfig = c.all
})
