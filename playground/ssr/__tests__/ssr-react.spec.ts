import { beforeAll, describe, expect, test } from 'vitest'
import { port } from './serve'
import { browserLogs, page } from '~utils'

const url = `http://localhost:${port}`

describe('ssr - console', () => {
  beforeAll(async () => {})

  function expectBrowserLogsToContain(str: string) {
    expect(browserLogs).toEqual(expect.arrayContaining([expect.stringContaining(str)]))
  }

  test('should console `this is ssr`', async () => {
    await page.goto(url)
    expectBrowserLogsToContain('this is ssr')
  })
})
