import path from 'node:path'
import { type ResolvedConfig, normalizePath } from 'vite'
import { type VPPTPluginOptions } from '../interface'
import { type OptionsTypeWithDefault } from './utils'

function resolve(root?: string, ...args: string[]) {
  return normalizePath(path.resolve(root || process.cwd(), ...args))
}

export function resolveOptions(
  resolvedViteConfig?: ResolvedConfig,
  options?: VPPTPluginOptions,
): OptionsTypeWithDefault {
  const publicDir = resolve(resolvedViteConfig?.root, resolvedViteConfig?.publicDir || 'public')

  return {
    inputDir: resolve(resolvedViteConfig?.root, options?.inputDir || 'public-typescript'),
    // 相对于 publicDir
    // 用户也可以自定义输出目录, e.g. outputDir: 'out/js'
    outputDir: resolve(publicDir, options?.outputDir || ''),
    esbuildOptions: options?.esbuildOptions ?? {},
    babel: options?.babel ?? false,
    manifestName: options?.manifestName || 'manifest',
    hash: options?.hash ?? true,
    destination: options?.destination || 'memory',
    cacheDir: resolve(resolvedViteConfig?.root, options?.cacheDir || 'node_modules/.vite-plugin-public-typescript'),
    base: options?.base || resolvedViteConfig?.base || '/',
    publicDir,
  }
}

export const DEFAULT_OPTIONS = resolveOptions()
