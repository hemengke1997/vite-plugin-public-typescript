// test utils used in e2e tests for playgrounds.
// `import { getColor } from '~utils'`

import fs from 'node:fs'
import path from 'node:path'
import { type Manifest, normalizePath } from 'vite'
import { expect } from 'vitest'
import { type ConsoleMessage } from 'playwright-chromium'
import { type ExecaChildProcess } from 'execa'
import { isBuild, isCI, isWindows, page, testDir } from './vitestSetup'

export * from './vitestSetup'

// make sure these ports are unique
export const ports = {
  spa: 9524,
  ssr: 9525,
}
export const hmrPorts = {
  spa: 24680,
  ssr: 24681,
}

const timeout = (n: number) => new Promise((r) => setTimeout(r, n))

// async function toEl(el: string | ElementHandle): Promise<ElementHandle> {
//   if (typeof el === 'string') {
//     const r = await page.$(el)
//     return r
//   }
//   return el
// }

export function readFile(filename: string): string {
  return fs.readFileSync(path.resolve(testDir, filename), 'utf-8')
}

export function editFile(filename: string, replacer: (str: string) => string, runInBuild: boolean = false) {
  if (isBuild && !runInBuild) return
  filename = path.resolve(testDir, filename)
  const content = fs.readFileSync(filename, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filename, modified)
  return modified
}

export function addFile(filename: string, content: string): void {
  fs.writeFileSync(path.resolve(testDir, filename), content)
}

export function removeFile(filename: string): void {
  fs.unlinkSync(path.resolve(testDir, filename))
}

export function listFiles(dir = ''): string[] {
  const filesDir = path.join(testDir, dir)
  return fs.readdirSync(filesDir)
}

export function listAssets(base = '', assets = 'assets'): string[] {
  const assetsDir = path.join(testDir, 'dist', base, assets)
  return fs.readdirSync(assetsDir)
}

export function findAssetFile(match: string | RegExp, base = '', assets = 'assets'): string {
  const assetsDir = path.join(testDir, 'dist', base, assets)
  let files: string[]
  try {
    files = fs.readdirSync(assetsDir)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return ''
    }
    throw e
  }
  const file = files.find((file) => {
    return file.match(match)
  })
  return file ? fs.readFileSync(path.resolve(assetsDir, file), 'utf-8') : ''
}

export function readManifest(base = ''): Manifest {
  return JSON.parse(fs.readFileSync(path.join(testDir, 'dist', base, 'manifest.json'), 'utf-8'))
}

/**
 * Poll a getter until the value it returns includes the expected value.
 */
export async function untilUpdated(
  poll: () => string | Promise<string>,
  expected: string,
  runInBuild = false,
): Promise<void> {
  if (isBuild && !runInBuild) return
  const maxTries = process.env.CI ? 200 : 50
  for (let tries = 0; tries < maxTries; tries++) {
    const actual = (await poll()) ?? ''
    if (actual.includes(expected) || tries === maxTries - 1) {
      expect(actual).toMatch(expected)
      break
    } else {
      await timeout(50)
    }
  }
}

/**
 * Retry `func` until it does not throw error.
 */
export async function withRetry(func: () => Promise<void>, runInBuild = false): Promise<void> {
  if (isBuild && !runInBuild) return
  const maxTries = process.env.CI ? 200 : 50
  for (let tries = 0; tries < maxTries; tries++) {
    try {
      await func()
      return
    } catch {}
    await timeout(50)
  }
  await func()
}

type UntilBrowserLogAfterCallback = (logs: string[]) => PromiseLike<void> | void

export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | (string | RegExp)[],
  expectOrder?: boolean,
  callback?: UntilBrowserLogAfterCallback,
): Promise<string[]>
export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | (string | RegExp)[],
  callback?: UntilBrowserLogAfterCallback,
): Promise<string[]>
export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | (string | RegExp)[],
  arg3?: boolean | UntilBrowserLogAfterCallback,
  arg4?: UntilBrowserLogAfterCallback,
): Promise<string[]> {
  const expectOrder = typeof arg3 === 'boolean' ? arg3 : false
  const callback = typeof arg3 === 'boolean' ? arg4 : arg3

  const promise = untilBrowserLog(target, expectOrder)
  await operation()
  const logs = await promise
  if (callback) {
    await callback(logs)
  }
  return logs
}

async function untilBrowserLog(target?: string | RegExp | (string | RegExp)[], expectOrder = true): Promise<string[]> {
  let resolve: () => void
  let reject: (reason: any) => void
  const promise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })

  const logs = []

  try {
    const isMatch = (matcher: string | RegExp) => (text: string) =>
      typeof matcher === 'string' ? text === matcher : matcher.test(text)

    let processMsg: (text: string) => boolean

    if (!target) {
      processMsg = () => true
    } else if (Array.isArray(target)) {
      if (expectOrder) {
        const remainingTargets = [...target]
        processMsg = (text: string) => {
          const nextTarget = remainingTargets.shift()
          expect(text).toMatch(nextTarget)
          return remainingTargets.length === 0
        }
      } else {
        const remainingMatchers = target.map((t) => isMatch(t))
        processMsg = (text: string) => {
          const nextIndex = remainingMatchers.findIndex((matcher) => matcher(text))
          if (nextIndex >= 0) {
            remainingMatchers.splice(nextIndex, 1)
          }
          return remainingMatchers.length === 0
        }
      }
    } else {
      processMsg = isMatch(target)
    }

    const handleMsg = (msg: ConsoleMessage) => {
      try {
        const text = msg.text()
        logs.push(text)
        const done = processMsg(text)
        if (done) {
          resolve()
        }
      } catch (err) {
        reject(err)
      }
    }

    page.on('console', handleMsg)
  } catch (err) {
    reject(err)
  }

  await promise

  return logs
}

export const formatSourcemapForSnapshot = (map: any): any => {
  const root = normalizePath(testDir)
  const m = { ...map }
  delete m.file
  delete m.names
  m.sources = m.sources.map((source) => source.replace(root, '/root'))
  return m
}

// helper function to kill process, uses taskkill on windows to ensure child process is killed too
export async function killProcess(serverProcess: ExecaChildProcess): Promise<void> {
  if (isWindows) {
    try {
      const { execaCommandSync } = await import('execa')
      execaCommandSync(`taskkill /pid ${serverProcess.pid} /T /F`)
    } catch (e) {
      console.error('failed to taskkill:', e)
    }
  } else {
    serverProcess.kill('SIGTERM', { forceKillAfterTimeout: 2000 })
  }
}

export async function hmrUpdateComplete(file: string, timeout: number, onConsole: (text: string) => boolean) {
  let id
  let pageConsoleListener
  const timerPromise = new Promise(
    (_, reject) =>
      (id = setTimeout(() => {
        reject(`timeout for ${file} after ${timeout}`)
      }, timeout)),
  )
  const pagePromise = new Promise((resolve) => {
    pageConsoleListener = (data) => {
      const text = data.text()

      if (onConsole(text)) {
        resolve(text)
      }
    }
    page.on('console', pageConsoleListener)
  })

  return Promise.race([timerPromise, pagePromise]).finally(() => {
    page.off('console', pageConsoleListener)
    clearTimeout(id)
  })
}

export const hmrUpdateTimeout = 10000

export async function editFileAndWaitForHmrComplete(
  file: string,
  replacer: (str: string) => string,
  flagFn: (text: string) => boolean,
) {
  const newContent = editFile(file, replacer)
  const fileUpdateToWaitFor = file
  try {
    await hmrUpdateComplete(fileUpdateToWaitFor, hmrUpdateTimeout, flagFn)
  } catch {
    const maxTries = isCI && isWindows ? 3 : 1
    let lastErr
    for (let i = 1; i <= maxTries; i++) {
      try {
        console.log(`retry #${i} of hmr update for ${file}`)
        editFile(file, () => newContent + '\n'.repeat(i))
        await hmrUpdateComplete(fileUpdateToWaitFor, hmrUpdateTimeout, flagFn)
        return
      } catch (e) {
        lastErr = e
      }
    }
    await saveScreenshot(`failed_update_${file}`)
    throw lastErr
  }
}

export async function saveScreenshot(name: string) {
  if (!page) {
    return
  }
  const filename = `${new Date().toISOString().replace(/\D/g, '')}_${name.toLowerCase().replace(/[^a-z]/g, '_')}.jpeg`
  const fullpath = path.resolve(testDir, 'screenshots', filename)
  try {
    await page.screenshot({
      fullPage: true,
      type: 'jpeg',
      quality: 70,
      timeout: 2000,
      path: fullpath,
    })
  } catch (e) {
    console.log('failed to take screenshot', e)
  }
}
