import { type CacheValueEx } from '../manifest-cache'
import { GlobalConfigBuilder } from './global-config-builder'

const globalConfig = new GlobalConfigBuilder<CacheValueEx>()

export { globalConfig }
