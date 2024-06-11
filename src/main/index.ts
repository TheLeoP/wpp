import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Client, LocalAuth } from 'whatsapp-web.js'
import type { ClientOptions } from 'whatsapp-web.js'
import { readFile, utils, set_cptable } from 'xlsx'
import * as cptable from './cpexcel.full.mjs'
import { render } from 'mustache'

set_cptable(cptable)
function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  init(mainWindow)
  return mainWindow
}

type Message = {
  telf: string
  message: string
}

async function sendMessage(win: BrowserWindow, telf: string, message: string) {
  const id = await client.getNumberId(telf)
  if (!id)
    return win.webContents.send(
      'error',

      `El número de teléfono ${telf} no se encuentra registrado en WhatsApp`
    )
  const chat = await client.getChatById(id._serialized)
  if (!chat)
    return win.webContents.send(
      'error',
      `No se pudo iniciar un chat con el número de teléfono ${telf}`
    )
  chat.sendMessage(message)
}

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min
}

//TODO: make configurable
const min_time = 0
const max_time = 1000
function scheduleMessages(win: BrowserWindow, messages: Message[]) {
  let i = 0
  const wait_in_ms = random(min_time, max_time)

  const scheduleNextMessage = () => {
    if (i === messages.length) return

    const currentMessage = messages[i]
    i++
    sendMessage(win, currentMessage.telf, currentMessage.message)
    const _wait_in_ms = random(min_time, max_time)
    setTimeout(scheduleNextMessage, _wait_in_ms)
  }

  setTimeout(scheduleNextMessage, wait_in_ms)
}

let client: Client
function init(win: BrowserWindow) {
  const opts: ClientOptions = {
    webVersionCache: {
      type: 'remote',
      remotePath:
        'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    authStrategy: new LocalAuth()
  }
  client = new Client(opts)
  client.on('loading_screen', (percent, message) => {
    win.webContents.send('loading', percent, message)
  })
  client.on('qr', (qr) => {
    console.log(qr)
    win.webContents.send('qr', qr)
  })
  client.on('auth_failure', (message) => {
    win.webContents.send('auth-failure', message)
  })
  client.on('authenticated', () => {
    win.webContents.send('authenticated')
  })
  client.on('ready', async () => {
    win.webContents.send('ready')
  })

  ipcMain.on('logout', () => {
    client.logout()
  })
  ipcMain.on('send-message', async (_event, num: string, message: string) => {
    sendMessage(win, num, message)
  })
  client.initialize()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  ipcMain.handle('sheet:read', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      properties: ['openFile']
    })
    if (!canceled) {
      return filePaths[0]
    }
    return null
  })
  ipcMain.handle('send-template', async (_event, template: string, path: string) => {
    const workbook = readFile(path)
    const first_sheet = Object.values(workbook.Sheets)[0]
    const json_sheet = utils.sheet_to_json<Record<string, string | number>>(first_sheet)
    const messages = json_sheet
      .filter((col, i) => {
        if (!col.telf) {
          mainWindow.webContents.send(
            'error',
            `La columna número ${i + 1} no contiene un número de teléfono`
          )
          return false
        }
        return true
      })
      .map((col) => {
        let telf = col.telf.toString()
        if (telf.length == 10) telf = `593${col.telf.toString()}`
        const message = render(template, col)
        return { message, telf }
      })
    scheduleMessages(mainWindow, messages)
    return true
  })
  ipcMain.handle('sheet:preview', async (_event, path: string) => {
    const workbook = readFile(path)
    const first_sheet = Object.values(workbook.Sheets)[0]
    const json_sheet = utils.sheet_to_json<Record<string, string | number>>(first_sheet)
    if (json_sheet.length == 0) return []
    return json_sheet[0]
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
