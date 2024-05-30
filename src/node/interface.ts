import { type BuildOptions } from 'esbuild'
import { type ESBuildPluginBabelOptions } from './build/babel'

export interface VitePublicTypescriptOptions {
  /**
   * @description dir of input typescript files
   * @default 'public-typescript'
   *
   * @note relative to vite root
   */
  inputDir?: string
  /**
   * @description dir of public files
   * @see https://vitejs.dev/config/shared-options.html#publicdir
   *
   * @note usually for non-vite projects
   */
  publicDir?: string
  /**
   * @description dir of output javascript files after building, relative to publicDir
   */
  outputDir?: string
  /**
   * @description esbuild BuildOptions
   * @see https://esbuild.github.io/api/#general-options
   */
  esbuildOptions?: BuildOptions | undefined
  /**
   * @description use babel to transform
   * @default false
   */
  babel?: boolean | ESBuildPluginBabelOptions
  /**
   * @description manifest filename
   * @default 'manifest'
   */
  manifestName?: string
  /**
   * @description
   * whether generate js with hash,
   * if number, set hash length
   *
   * @default true
   */
  hash?: boolean | number
  /**
   * @description build-out destination
   * @default 'memory'
   *
   * @note usually set to 'file' in non-vite projects
   */
  destination?: 'memory' | 'file'
  /**
   * @description manifest cache dir
   * @default 'node_modules/.vite-plugin-public-typescript'
   *
   * @note relative to vite root
   */
  cacheDir?: string
  /**
   * @description base path for all files
   * @see https://vitejs.dev/config/shared-options.html#base
   *
   * @note relative to vite root
   * @note usually for non-vite projects
   */
  base?: string
}
