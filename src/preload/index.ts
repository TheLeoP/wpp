import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onQr: (callback: (qr: string) => void) =>
    ipcRenderer.on('qr', (_event, qr: string) => callback(qr)),
  onAuthFailure: (callback: (message: string) => void) =>
    ipcRenderer.on('auth_failure', (_event, message: string) => callback(message)),
  onAuthenticated: (callback: () => void) =>
    ipcRenderer.on('authenticated', (_event) => callback()),
  onReady: (callback: () => void) => ipcRenderer.on('ready', (_event) => callback()),
  onLoading: (callback: (percent: string, message: string) => void) =>
    ipcRenderer.on('loading', (_event, percent, message) => callback(percent, message)),
  logout: () => ipcRenderer.send('logout'),
  sendMessage: (num: string, message: string) => ipcRenderer.send('send-message', num, message),
  readFile: () => ipcRenderer.invoke('read-file'),
  sendTemplate: (template: string, path: string) =>
    ipcRenderer.invoke('send-template', template, path)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
