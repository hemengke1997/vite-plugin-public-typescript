import { type TransformOptions } from '@babel/core'
import { type Options, type TargetsOptions } from '@babel/preset-env'
import createDebug from 'debug'
import { type Loader, type OnLoadArgs, type OnLoadResult, type Plugin } from 'esbuild'
import fs from 'fs-extra'
import { isPackageExists } from 'local-pkg'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import colors from 'picocolors'
import { esbuildTypescript } from '.'
import { globalConfig } from '../global-config'
import { isInTest, pkgName } from '../helper/utils'

export interface ESBuildPluginBabelOptions {
  config?: TransformOptions
  filter?: RegExp
  namespace?: string
  loader?: Loader | ((path: string) => Loader)
  polyfill?: boolean
}

const debug = createDebug('vite-plugin-public-typescript:babel ===> ')

let babel: typeof import('@babel/core') | undefined
async function loadBabel() {
  if (!babel) {
    babel = await import('@babel/core')
  }
  return babel
}

const loadedPlugin = new Map<string, any>()
function loadPlugin(path: string): Promise<any> {
  const cached = loadedPlugin.get(path)
  if (cached) return cached

  const promise = import(/* @vite-ignore */ path).then((module) => {
    const value = module.default || module
    loadedPlugin.set(path, value)
    return value
  })
  loadedPlugin.set(path, promise)
  return promise
}

const _require = createRequire(import.meta.url)

export const esbuildPluginBabel = (
  options: ESBuildPluginBabelOptions & { targets: string[]; filename: string },
): Plugin => ({
  name: 'babel',
  setup(build) {
    const {
      filter = /.*/,
      namespace = '',
      config = {},
      loader,
      polyfill = false,
      targets,
      filename = '',
    } = options || {}

    const resolveLoader = (args: OnLoadArgs): Loader | undefined => {
      if (typeof loader === 'function') {
        return loader(args.path)
      }
      return loader
    }

    const transformContents = async (args: OnLoadArgs, contents: string): Promise<OnLoadResult> => {
      const babel = await loadBabel()

      const presetEnv = await loadPlugin('@babel/preset-env')
      const ts = await loadPlugin('@babel/preset-typescript')

      return new Promise((resolve, reject) => {
        babel.transform(
          contents,
          {
            ast: false,
            babelrc: false,
            filename,
            configFile: false,
            comments: false,
            compact: false,
            sourceMaps: false,
            minified: false,
            ...config,
            presets: [
              [
                presetEnv,
                createBabelPresetEnvOptions(targets, {
                  ignoreBrowserslistConfig: true,
                  needPolyfills: polyfill,
                }),
              ],
              [
                ts,
                {
                  isTSX: false,
                  rewriteImportExtensions: false,
                  allowDeclareFields: false,
                  allowNamespaces: false,
                  strictMode: false,
                },
              ],
              ...(config.presets ?? []),
            ],
            caller: {
              name: 'esbuild-plugin-babel',
            },
          },
          (error, result) => {
            error
              ? reject(error)
              : resolve({
                  contents: result?.code ?? '',
                  loader: resolveLoader(args),
                })
          },
        )
      })
    }

    build.onLoad({ filter, namespace }, async (args) => {
      const contents = fs.readFileSync(args.path, 'utf8')

      return transformContents(args, contents)
    })
  },
})

function createBabelPresetEnvOptions(
  targets: TargetsOptions | undefined,
  {
    needPolyfills = false,
    ignoreBrowserslistConfig = true,
  }: { needPolyfills?: boolean; ignoreBrowserslistConfig?: boolean },
): Options {
  return {
    targets,
    bugfixes: true,
    loose: false,
    modules: false,
    useBuiltIns: needPolyfills ? 'usage' : false,
    corejs: needPolyfills
      ? {
          version: _require('core-js/package.json').version,
          proposals: false,
        }
      : undefined,
    shippedProposals: true,
    ignoreBrowserslistConfig,
  }
}

const getTime = () => Date.now()
const cacheDirectory = path.join(os.tmpdir(), pkgName)

function createTmpFile() {
  if (!fs.existsSync(cacheDirectory)) {
    fs.mkdirSync(cacheDirectory)
  }
  const tmpFile = path.join(cacheDirectory, `tmp-${getTime()}.ts`)
  fs.writeFileSync(tmpFile, '')
  return tmpFile
}

function cleanupCache(file: string) {
  if (fs.existsSync(file)) {
    fs.removeSync(file)
    debug('no cache:', !fs.existsSync(file))
  }
  if (!isInTest()) {
    fs.rmSync(cacheDirectory, { force: true, recursive: true })
  }
}

export async function detectBabelPluginMissing() {
  const { all } = globalConfig

  const tmp = createTmpFile()
  try {
    if (fs.existsSync(tmp)) {
      await esbuildTypescript({ ...all, filePath: tmp })
    }
  } catch {
  } finally {
    cleanupCache(tmp)
  }
}

const EXIT_CODE_RESTART = 43
async function _ensurePackageInstalled(dependency: string, root: string) {
  if (isPackageExists(dependency, { paths: [root, __dirname] })) return true

  const promptInstall = process.stdout.isTTY && !isInTest()

  process.stderr.write(
    colors.red(`${colors.inverse(colors.red(' MISSING DEP '))} Can not find dependency '${dependency}'\n\n`),
  )

  if (!promptInstall) return false

  const prompts = (await import('prompts')).default
  const { install } = await prompts.prompt({
    type: 'confirm',
    name: 'install',
    message: colors.reset(`Do you want to install ${colors.green(dependency)}?`),
  })

  if (install) {
    await (await import('@antfu/install-pkg')).installPackage(dependency, { dev: true })
    process.stderr.write(colors.yellow(`\nPackage ${dependency} installed, please restart\n\n`))
    process.exit(EXIT_CODE_RESTART)
  }

  return false
}

export const ensureBabelPluginInstalled = lockFn(_ensurePackageInstalled)

function lockFn<P extends any[] = any[], V = any>(fn: (...args: P) => Promise<V>) {
  let isInstalling = false
  return async function (...args: P) {
    if (isInstalling) return false
    isInstalling = true
    const r = await fn(...args)
    isInstalling = false
    return r
  }
}
