import { type CacheValueEx } from '../manifest-cache'
import { GlobalConfigBuilder } from './GlobalConfigBuilder'

const globalConfig = new GlobalConfigBuilder<CacheValueEx>()

export { globalConfig }
