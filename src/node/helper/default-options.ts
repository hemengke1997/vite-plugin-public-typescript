import path from 'node:path'
import { type ResolvedConfig, normalizePath } from 'vite'
import { type VitePublicTypescriptOptions } from '../interface'
import { type OptionsTypeWithDefault } from './utils'

function resolve(root?: string, ...args: string[]) {
  return normalizePath(path.resolve(root || process.cwd(), ...args))
}

export function resolveOptions(
  resolvedViteConfig?: ResolvedConfig,
  options?: VitePublicTypescriptOptions,
): OptionsTypeWithDefault {
  const publicDir = options?.publicDir
    ? resolve(resolvedViteConfig?.root, options?.publicDir)
    : resolvedViteConfig?.publicDir || resolve(resolvedViteConfig?.root, 'public')

  return {
    inputDir: resolve(resolvedViteConfig?.root, options?.inputDir || 'public-typescript'),
    // 相对于 publicDir
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
