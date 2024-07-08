import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Client, ClientOptions, LocalAuth, MessageMedia } from 'whatsapp-web.js'
import * as xlsx from 'xlsx'
import { render } from 'mustache'
import { promises as a } from 'fs'
import type { Config } from '../schemas'
import { configSchema } from '../schemas'

const config_path = `${app.getPath('userData')}/config.json`

let config: Promise<Config> = new Promise(async (resolve) => {
  try {
    const content = (await a.readFile(config_path, 'utf-8')).toString()
    const parsed = configSchema.parse(JSON.parse(content))
    resolve(parsed)
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      const default_config = {
        send_time: {
          min: 0,
          max: 1000
        },
        telf_col: 'telf',
        append_593: true
      }
      resolve(default_config)
      await a.writeFile(config_path, JSON.stringify(default_config))
    } else if (is.dev) {
      console.error(err)
    }
  }
})

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

const errorTelfs: string[] = []

async function sendMessage(win: BrowserWindow, telf: string, message: string, media: string) {
  const id = await client.getNumberId(telf)
  if (!id) {
    errorTelfs.push(telf)
    win.webContents.send(
      'error',

      `El número de teléfono ${telf} no se encuentra registrado en WhatsApp`
    )
    return
  }
  const chat = await client.getChatById(id._serialized)
  if (!chat)
    return win.webContents.send(
      'error',
      `No se pudo iniciar un chat con el número de teléfono ${telf}`
    )
  if (media !== '') {
    chat.sendMessage(message, { media: MessageMedia.fromFilePath(media) })
  } else {
    chat.sendMessage(message)
  }
}

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min
}

let nextId = 0
async function scheduleMessages(win: BrowserWindow, messages: Message[], media: string) {
  const c = await config
  let i = 0
  const id = nextId++
  const wait_in_ms = random(c.send_time.min, c.send_time.max)

  const scheduleNextMessage = async () => {
    if (i === messages.length) return

    const currentMessage = messages[i]
    i++
    await sendMessage(win, currentMessage.telf, currentMessage.message, media)
    win.webContents.send('template:progress', id, i, messages.length)
    const _wait_in_ms = random(c.send_time.min, c.send_time.max)
    setTimeout(scheduleNextMessage, _wait_in_ms)
  }

  setTimeout(scheduleNextMessage, wait_in_ms)
}

let client: Client
function init(win: BrowserWindow) {
  const opts: ClientOptions = {
    webVersionCache: {
      type: 'local',
      path: `${app.getPath('userData')}/.wwebjs_cache/`
    },
    authStrategy: new LocalAuth({
      dataPath: `${app.getPath('userData')}/.wwebjs_auth/`
    })
  }
  if (!is.dev)
    // HACK: may need to be changed on different computers
    opts.puppeteer = {
      executablePath:
        './resources/app.asar.unpacked/node_modules/puppeteer-core/.local-chromium/win64-1045629/chrome-win/chrome.exe'
    }
  client = new Client(opts)
  client.on('loading_screen', (percent, message) => {
    win.webContents.send('loading', percent, message)
  })
  client.on('qr', (qr) => {
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
  client.initialize()
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      stream: true
    }
  }
])

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
  protocol.handle('media', (req) => {
    let filePath = req.url.slice('media://'.length)
    filePath = decodeURIComponent(filePath)
    const _path = fileURLToPath(`file://${filePath}`)
    return net.fetch(_path)
  })

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
  ipcMain.handle('image:read', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [
        {
          name: 'Media',
          extensions: ['jpeg', 'jpg', 'png', 'mp4', 'avi', '3gp', 'wmv', 'mov', 'mkv', 'webm']
        }
      ],
      properties: ['openFile']
    })
    if (!canceled) {
      return filePaths[0]
    }
    return null
  })
  ipcMain.handle('template:send', async (_event, template: string, path: string, media: string) => {
    const c = await config
    const workbook = xlsx.readFile(path)
    const first_sheet = Object.values(workbook.Sheets)[0]
    const json_sheet = xlsx.utils.sheet_to_json<Record<string, string | number>>(first_sheet)
    const messages = json_sheet
      .filter((col, i) => {
        if (!col[c.telf_col]) {
          mainWindow.webContents.send(
            'error',
            `La columna número ${i + 1} no contiene un número de teléfono`
          )
          return false
        }
        return true
      })
      .map((col) => {
        let telf = col[c.telf_col].toString()
        if (c.append_593 && telf.length == 9) telf = `593${col.telf.toString()}`
        const message = render(template, col)
        return { message, telf }
      })
    await scheduleMessages(mainWindow, messages, media)
    return true
  })
  ipcMain.handle('sheet:preview', async (_event, path: string) => {
    const workbook = xlsx.readFile(path)
    const first_sheet = Object.values(workbook.Sheets)[0]
    const json_sheet = xlsx.utils.sheet_to_json<Record<string, string | number>>(first_sheet)
    if (json_sheet.length == 0) return []
    return json_sheet[0]
  })
  ipcMain.handle('config:get', async () => {
    return await config
  })
  ipcMain.handle('config:set', async (_event, _config: Config) => {
    config = Promise.resolve(_config)
    try {
      a.writeFile(config_path, JSON.stringify(await config), 'utf-8')
      return
    } catch (err) {
      return err
    }
  })
  ipcMain.handle('error:telfs:get', () => {
    return errorTelfs
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
