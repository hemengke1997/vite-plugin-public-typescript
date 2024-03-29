import { page, untilBrowserLogAfter } from '~utils'
import { describe, test } from 'vitest'
import { port } from './serve'

const url = `http://localhost:${port}`

describe('ssr - console', () => {
  test('should console `this is ssr`', async () => {
    await untilBrowserLogAfter(() => page.goto(url), 'this is ssr')
  })
})
