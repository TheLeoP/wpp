import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onQr: (callback: (qr: string) => void) => void
      onAuthFailure: (callback: (message: string) => void) => void
      onAuthenticated: (callback: () => void) => void
      onReady: (callback: () => void) => void
      onLoading: (callback: (percent: string, loadingMessage: string) => void) => void
      onError: (callback: (error: string) => void) => void
      logout: () => void
      sendMessage: (num: string, message: string) => void
      sheetRead: () => Promise<string | null>
      sheetPreview: (dataPath: string) => Promise<null | Record<string, string | number>>
      sendTemplate: (template: string, path: string, media: string) => Promise<boolean>
      imageRead: () => Promise<string | null>
    }
  }
}
