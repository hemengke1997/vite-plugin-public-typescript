import colors from 'picocolors'
import { type ResolvedConfig, type WebSocketServer } from 'vite'
import { globalConfig } from '../global-config'
import { fileRelativeRootPath, isInTest } from './utils'

export function addCodeHeader(code: string) {
  return `// Generated via vite-plugin-public-typescript (This line print in serve mode only)\n${code}`
}

export type HmrFile = {
  path: string
  event: string
}
export function reloadPage(ws: WebSocketServer, file: HmrFile) {
  const logger = globalConfig.get('logger')

  if (!isInTest()) {
    logger.info(
      colors.green(`page reload `) + colors.gray(`file ${file.event} `) + colors.dim(fileRelativeRootPath(file.path)),
      {
        clear: false,
        timestamp: true,
      },
    )
  }

  ws.send({
    path: '*',
    type: 'full-reload',
  })
}

export function disableManifestHmr(config: ResolvedConfig, manifestPath: string) {
  if (config.command === 'serve') {
    const index = config.configFileDependencies.indexOf(manifestPath)
    if (index !== -1) {
      config.configFileDependencies.splice(index, 1)
    }
  }
}
