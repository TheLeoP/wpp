import type { ElectronAPI } from '@electron-toolkit/preload'
import type { WAState } from 'whatsapp-web.js'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onQr: (callback: (qr: string) => void) => void
      onAuthFailure: (callback: (message: string) => void) => void
      onAuthenticated: (callback: () => void) => void
      onReady: (callback: () => void) => void
      onLoading: (callback: (percent: string, loadingMessage: string) => void) => void
      logout: () => void
      sendMessage: (num: string, message: string) => void
      readFile: () => Promise<string | null>
      sendTemplate: (template: string, path: string) => Promise<boolean>
    }
  }
}
