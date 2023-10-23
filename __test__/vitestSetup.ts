import path from 'node:path'
import { type InlineConfig, type ResolvedConfig, resolveConfig } from 'vite'
import { beforeEach } from 'vitest'
import { setupGlobalConfig } from '../src/helper/utils'
import { DEFAULT_OPTIONS } from '../src'
import { type GlobalConfig } from '../src/global-config/GlobalConfigBuilder'
import { type CacheValueEx } from '../src/manifest-cache'

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
  ctx._globalConfig = c
})
