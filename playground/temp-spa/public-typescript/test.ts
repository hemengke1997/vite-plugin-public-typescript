declare global {
  interface Window {
    resize: () => void
  }
}

import { flexible } from 'modern-flexible'

flexible()
