import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Config } from '../schemas'
import { type ClientInfo } from 'whatsapp-web.js'

export const api = {
  onQr: (callback: (qr: null | string) => void) => {
    const f = (_: Electron.IpcRendererEvent, qr: null | string) => callback(qr)

    ipcRenderer.on('qr', f)
    return () => ipcRenderer.off('qr', f)
  },
  onAuthFailure: (callback: (message: string) => void) => {
    const f = (_: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on('auth_failure', f)
    return () => ipcRenderer.off('auth_failure', f)
  },
  onAuthenticated: (callback: (isAuthenticated: boolean) => void) => {
    const f = (_: Electron.IpcRendererEvent, isAuthenticated: boolean) => callback(isAuthenticated)
    ipcRenderer.on('authenticated', f)
    return () => ipcRenderer.off('authenticated', f)
  },
  onReady: (callback: (info: ClientInfo) => void) => {
    const f = (_: Electron.IpcRendererEvent, info: ClientInfo) => callback(info)
    ipcRenderer.on('ready', f)
    return () => ipcRenderer.off('ready', f)
  },
  onLoading: (callback: (percent: string, message: string) => void) => {
    const f = (_: Electron.IpcRendererEvent, percent: string, message: string) =>
      callback(percent, message)
    ipcRenderer.on('loading', f)
    return () => ipcRenderer.off('loading', f)
  },
  onError: (callback: (error: string) => void) => {
    const f = (_: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('error', f)
    return () => ipcRenderer.off('error', f)
  },
  logout: () => ipcRenderer.send('logout'),
  sheetRead: () => ipcRenderer.invoke('sheet:read') as Promise<null | string>,
  sheetPreview: (dataPath: string) =>
    ipcRenderer.invoke('sheet:preview', dataPath) as Promise<null | Record<
      string,
      string | number
    >>,
  sendTemplate: (template: string, path: string, media: string) =>
    ipcRenderer.invoke('template:send', template, path, media) as Promise<boolean>,
  onTemplateProgress: (callback: (id: number, current: number, total: number) => void) => {
    const f = (_: Electron.IpcRendererEvent, id: number, current: number, total: number) =>
      callback(id, current, total)
    ipcRenderer.on('template:progress', f)
    return () => ipcRenderer.off('template:progress', f)
  },
  imageRead: () => ipcRenderer.invoke('image:read') as Promise<string | null>,
  configGet: () => ipcRenderer.invoke('config:get') as Promise<Config>,
  configSet: (config: Config) =>
    ipcRenderer.invoke('config:set', config) as Promise<void | unknown>,
  errorTelfsGet: () => ipcRenderer.invoke('error:telfs:get') as Promise<string[]>
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
