import { type TransformOptions } from '@babel/core'
import { type Options, type TargetsOptions } from '@babel/preset-env'
import createDebug from 'debug'
import {
  type BuildResult,
  type Loader,
  type OnLoadArgs,
  type OnLoadResult,
  type Plugin,
  build as esbuild,
} from 'esbuild'
import { resolveToEsbuildTarget } from 'esbuild-plugin-browserslist'
import fs from 'fs-extra'
import { isPackageExists } from 'local-pkg'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import colors from 'picocolors'
import { type ResolvedConfig } from 'vite'
import { globalConfig } from '../global-config'
import { type GlobalConfig } from '../global-config/GlobalConfigBuilder'
import { getContentHash, isBoolean, isInTest, pkgName } from '../helper/utils'
import { type BaseCacheProcessor } from '../processor/BaseCacheProcessor'

const _require = createRequire(import.meta.url)

const debug = createDebug('vite-plugin-public-typescript:build ===> ')

const _noSideEffectsPlugin: Plugin = {
  name: 'no-side-effects',
  setup(build) {
    // https://github.com/evanw/esbuild/issues/1895#issuecomment-1003404929
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData) {
        return
      }

      const { path, ...rest } = args
      rest.pluginData = true
      const result = await build.resolve(path, rest)

      result.sideEffects = false
      return result
    })
  },
}

export interface ESBuildPluginBabelOptions {
  config?: TransformOptions
  filter?: RegExp
  namespace?: string
  loader?: Loader | ((path: string) => Loader)
  polyfill?: boolean
}

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

  const promise = import(path).then((module) => {
    const value = module.default || module
    loadedPlugin.set(path, value)
    return value
  })
  loadedPlugin.set(path, promise)
  return promise
}

const esbuildPluginBabel = (options: ESBuildPluginBabelOptions & { targets: string[]; filename: string }): Plugin => ({
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

      const presetEnv = loadPlugin('@babel/preset-env')
      const ts = loadPlugin('@babel/preset-typescript')

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

type IBuildOptions = {
  filePath: string
} & GlobalConfig

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

/**
 * Target   Chrome  Safari  Firefox   Edge
 * es2015   49+     10.1+   45+       14+
 * es2016   52+     10.1+   52+       14+
 * es2017   55+     10.1+   52+       15+
 * es2018   60+     11.1+   55+       79+
 * es2019   66+     11.1+   58+       79+
 * es2020   80+     13.1+   72+       80+
 */

const DEFAULT_ESBUILD_TARGET = 'es2015'

export async function esbuildTypescript(buildOptions: IBuildOptions) {
  const { filePath, esbuildOptions, viteConfig, babel, logger } = buildOptions
  const { plugins = [], target = DEFAULT_ESBUILD_TARGET, ...rest } = esbuildOptions

  const enableBabel = !!babel

  const define = transformEnvToDefine(viteConfig)

  debug('tsFile:', filePath, 'esbuild define:', define)
  const filename = path.basename(filePath)

  let babelTarget: string[] = []
  let esbuildTarget: string[] = []
  if (enableBabel) {
    const { default: browserslist } = await import('browserslist')
    babelTarget = browserslist.loadConfig({ path: viteConfig.root }) || []
    esbuildTarget = resolveToEsbuildTarget(browserslist(babelTarget), { printUnknownTargets: false })
  }

  const esbuildPlugins = enableBabel
    ? [
        esbuildPluginBabel(
          isBoolean(babel)
            ? { targets: babelTarget, filename }
            : {
                ...babel,
                targets: babelTarget,
                filename,
              },
        ),
        ...plugins,
      ]
    : plugins

  let res: BuildResult

  try {
    res = await esbuild({
      bundle: true,
      define,
      entryPoints: [filePath],
      platform: 'browser',
      format: 'iife',
      logLevel: 'silent',
      minify: !!viteConfig.build.minify,
      sourcemap: false,
      splitting: false,
      treeShaking: true,
      write: false,
      plugins: esbuildPlugins,
      target: enableBabel ? esbuildTarget : target,
      ...rest,
    })

    debug('esbuild success:', filename)
  } catch (error) {
    if (error instanceof Error) {
      const babelPluginNotFound = /ERROR: \[plugin: babel\] Cannot find package '(.*)'/
      if (error?.message.match(babelPluginNotFound)) {
        const pluginName = error.message.match(babelPluginNotFound)?.[1]
        const install = await ensurePackageInstalled(pluginName!, viteConfig.root)
        if (!install) {
          logger.error(
            `\n${colors.red(`[${pkgName}]`)} babel plugin '${colors.bold(pluginName)}' not found, please install it\n`,
          )
        }
        !isInTest() && process.exit(1)
      }
    }

    logger.error(colors.red(`[${pkgName}] `) + error)
    !isInTest() && process.exit(1)
  }

  const code = res!.outputFiles?.[0].text

  return code
}

function transformEnvToDefine(viteConfig: ResolvedConfig) {
  const importMetaKeys: Record<string, string> = {}
  const defineKeys: Record<string, string> = {}
  const env: Record<string, any> = {
    ...viteConfig.env,
    SSR: !!viteConfig.build.ssr,
  }

  Object.keys(env).forEach((key) => {
    importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
  })

  Object.keys(viteConfig.define || {}).forEach((key) => {
    const c = viteConfig.define?.[key]
    defineKeys[key] = typeof c === 'string' ? c : JSON.stringify(viteConfig.define?.[key])
  })

  return {
    'import.meta.env': JSON.stringify(viteConfig.env),
    'import.meta.hot': 'false',
    ...importMetaKeys,
    ...defineKeys,
  }
}

export async function build(options: { filePath: string }, onBuildEnd?: BaseCacheProcessor['onTsBuildEnd']) {
  const { filePath } = options
  const _globalConfig = globalConfig.all

  const originFile = path.basename(filePath, path.extname(filePath))

  let contentHash = ''
  let compiledFileName = originFile

  const code = (await esbuildTypescript({ filePath, ..._globalConfig })) || ''

  if (_globalConfig.hash) {
    contentHash = getContentHash(code, _globalConfig.hash)
    compiledFileName = `${originFile}.${contentHash}`
  }

  debug('before onBuildEnd manifest-cache:', _globalConfig.manifestCache.all)

  await onBuildEnd?.(
    {
      compiledFileName,
      originFile,
      silent: true,
    },
    { code, contentHash, originFile, silent: false },
  )

  debug('after onBuildEnd manifest-cache:', _globalConfig.manifestCache.all)
}

export async function buildAllOnce(tsFilesGlob: string[]) {
  const cacheProcessor = globalConfig.get('cacheProcessor')

  const toBuildList: (() => Promise<void>)[] = []

  for (const file of tsFilesGlob) {
    toBuildList.push(() =>
      build({ filePath: file }, (deleteArgs, addArgs) =>
        cacheProcessor.onTsBuildEnd({ ...deleteArgs, silent: true }, { ...addArgs, silent: true }),
      ),
    )
  }

  await detectBabelPluginMissing()

  await Promise.all(toBuildList.map((fn) => fn()) || [])

  cacheProcessor.manifestCache.writeManifestJSON()
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

const ensurePackageInstalled = lockFn(_ensurePackageInstalled)

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

async function detectBabelPluginMissing() {
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
