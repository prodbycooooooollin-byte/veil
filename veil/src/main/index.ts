import { app, BrowserWindow, dialog, globalShortcut, ipcMain, screen, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import * as dl from './deadlock'
import { buildHudPak, hudCss, type HudBar } from './hud'
import * as cl from './complock'

let win: BrowserWindow | null = null
let overlay: BrowserWindow | null = null
let overlaySpec: unknown = null
let gamePath: string | null = null

const icon = join(__dirname, '../../resources/icon.png')
const rendererUrl = (hash = '') =>
  process.env.ELECTRON_RENDERER_URL ? `${process.env.ELECTRON_RENDERER_URL}${hash ? '#' + hash : ''}` : null

function load(w: BrowserWindow, hash = '') {
  const url = rendererUrl(hash)
  if (url) w.loadURL(url)
  else w.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
}

function create() {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    frame: false,
    icon,
    title: 'VEIL',
    backgroundColor: '#050505',
    show: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true },
  })
  win.once('ready-to-show', () => win?.show())
  win.on('maximize', () => win?.webContents.send('win:state', true))
  win.on('unmaximize', () => win?.webContents.send('win:state', false))
  win.on('closed', () => { win = null; overlay?.close() })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  load(win)
}

/* ---------- crosshair overlay: a transparent, click-through window over the game ---------- */
function openOverlay() {
  if (overlay) return overlay
  const d = screen.getPrimaryDisplay()
  overlay = new BrowserWindow({
    x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height,
    transparent: true, frame: false, resizable: false, movable: false, focusable: false, skipTaskbar: true,
    hasShadow: false, alwaysOnTop: true, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true },
  })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setIgnoreMouseEvents(true)
  overlay.setVisibleOnAllWorkspaces(true)
  overlay.once('ready-to-show', () => { overlay?.showInactive(); if (overlaySpec) overlay?.webContents.send('overlay:spec', overlaySpec) })
  overlay.on('closed', () => { overlay = null; win?.webContents.send('overlay:state', false) })
  load(overlay, 'overlay')
  return overlay
}
function setOverlay(on: boolean) {
  if (on) openOverlay()
  else overlay?.close()
  win?.webContents.send('overlay:state', on)
}

/* ---------- updates from GitHub releases ---------- */
type UpdateState = { state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error'; version?: string; percent?: number; message?: string }
const sendUpdate = (u: UpdateState) => win?.webContents.send('update', u)

function setupUpdates() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }))
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'downloading', version: i.version, percent: 0 }))
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none' }))
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ state: 'ready', version: i.version }))
  autoUpdater.on('error', (e) => sendUpdate({ state: 'error', message: String(e?.message ?? e) }))
  const check = () => autoUpdater.checkForUpdates().catch(() => {})
  setTimeout(check, 4000)
  setInterval(check, 4 * 60 * 60 * 1000)
}

const need = () => {
  if (!gamePath) throw new Error('Deadlock was not found. Pick the Deadlock folder first.')
  return gamePath
}

ipcMain.handle('win', (_e, a: 'min' | 'max' | 'close') => {
  if (!win) return
  if (a === 'min') win.minimize()
  else if (a === 'max') (win.isMaximized() ? win.unmaximize() : win.maximize())
  else win.close()
})
ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { state: 'none', message: 'Updates are checked in the installed app.' }
  await autoUpdater.checkForUpdates().catch(() => {})
  return null
})
ipcMain.handle('update:install', () => autoUpdater.quitAndInstall(false, true))

ipcMain.handle('overlay:set', (_e, on: boolean, spec?: unknown) => { if (spec) overlaySpec = spec; setOverlay(on); return on })
ipcMain.handle('overlay:spec', (_e, spec: unknown) => { overlaySpec = spec; overlay?.webContents.send('overlay:spec', spec) })
ipcMain.handle('overlay:get', () => overlaySpec)

ipcMain.handle('game:detect', async () => {
  gamePath ??= await dl.detectGame()
  return dl.status(gamePath)
})
ipcMain.handle('game:pick', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Pick the Deadlock folder', properties: ['openDirectory'] })
  if (r.canceled || !r.filePaths[0]) return dl.status(gamePath)
  const p = r.filePaths[0]
  if (!dl.isGameDir(p)) throw new Error('That folder has no game\\citadel\\gameinfo.gi. Pick the folder named Deadlock.')
  gamePath = p
  return dl.status(gamePath)
})
ipcMain.handle('game:apply', async (_e, convars: Record<string, string>, autoexec: Record<string, string>) => {
  const g = need()
  await dl.applyGameinfo(g, convars)
  // video-menu cvars also go into cfg/video.txt, which the game loads after gameinfo.gi
  await dl.writeVideo(g, convars)
  if (Object.keys(autoexec).length) await dl.writeAutoexec(g, autoexec)
  return dl.status(g)
})
ipcMain.handle('game:restore', async () => {
  const g = need()
  await dl.restore(g)
  await dl.restoreVideo(g)
  return dl.status(g)
})
ipcMain.handle('pak:install', async (_e, target?: string) => {
  const g = need()
  const r = await dialog.showOpenDialog(win!, { title: 'Pick a .vpk pak', filters: [{ name: 'Valve pak', extensions: ['vpk'] }], properties: ['openFile', 'multiSelections'] })
  const names: string[] = []
  for (const f of r.filePaths) names.push(await dl.installPak(g, f, r.filePaths.length === 1 ? target : undefined))
  return { names, status: await dl.status(g) }
})
ipcMain.handle('gameinfo:install', async () => {
  const g = need()
  const r = await dialog.showOpenDialog(win!, { title: 'Pick CompLock’s gameinfo.gi', filters: [{ name: 'gameinfo', extensions: ['gi'] }], properties: ['openFile'] })
  if (r.canceled || !r.filePaths[0]) return dl.status(g)
  await dl.installGameinfo(g, r.filePaths[0])
  return dl.status(g)
})
ipcMain.handle('pak:toggle', async (_e, file: string) => { const g = need(); await dl.togglePak(g, file); return dl.status(g) })
ipcMain.handle('pak:remove', async (_e, file: string) => { const g = need(); await dl.removePak(g, file); return dl.status(g) })
ipcMain.handle('file:save', async (_e, name: string, data: Uint8Array) => {
  const r = await dialog.showSaveDialog(win!, { defaultPath: name })
  if (r.canceled || !r.filePath) return null
  await writeFile(r.filePath, data)
  return r.filePath
})
ipcMain.handle('hud:install', async (_e, bar: HudBar) => {
  const g = need()
  const pak = await buildHudPak(join(g, 'game', 'citadel'), bar, app.getVersion())
  return dl.installVeilPak(g, 'hud', pak)
})
ipcMain.handle('hud:remove', async () => { const g = need(); await dl.removeVeilPak(g, 'hud'); return dl.status(g) })
ipcMain.handle('hud:css', (_e, bar: HudBar) => hudCss(bar))
/**
 * Makes the installed CompLock paks match the wanted list: downloads what is missing, removes what VEIL
 * installed earlier and is no longer wanted, and puts CompLock's gameinfo.gi in place or takes it out.
 */
ipcMain.handle('cl:sync', async (_e, wanted: string[], wantGameinfo: boolean) => {
  const g = need()
  const have = await dl.veilManaged(g)
  const send = (p: unknown) => win?.webContents.send('cl:progress', p)
  const m = await cl.manifest()
  for (const key of Object.keys(have).filter((k) => k.startsWith('cl:') && k !== 'cl:gameinfo')) {
    if (!wanted.includes(key.slice(3))) await dl.removeVeilPak(g, key)
  }
  const installed: string[] = []
  for (const key of wanted) {
    // skip only if VEIL's copy is really still there (Steam's file check or a clean-up can remove it)
    const prev = have['cl:' + key]
    if (typeof prev === 'string' && existsSync(join(g, 'game', 'citadel', 'addons', prev))) { installed.push(key); continue }
    const title = m.files[key]?.title ?? key
    send({ title, done: 0, total: m.files[key]?.parts[0]?.csize ?? 0 })
    const data = await cl.downloadPak(key, (done, total) => send({ title, done, total }))
    await dl.installBufferAs(g, 'cl:' + key, data)
    installed.push(key)
  }
  // written on every apply: a game update replaces gameinfo.gi with the stock one
  if (wantGameinfo) {
    await dl.installGameinfoText(g, m.gameinfo)
    await dl.setManaged(g, 'cl:gameinfo', 'gameinfo.gi')
  } else if (!wantGameinfo && have['cl:gameinfo']) {
    await dl.restore(g)
    await dl.setManaged(g, 'cl:gameinfo', null)
  }
  send(null)
  return { installed, game: m.game }
})
ipcMain.handle('veil:managed', async () => (gamePath ? dl.veilManaged(gamePath) : {}))
ipcMain.handle('game:scan', async () => dl.scan(need()))
ipcMain.handle('game:quarantine', async (_e, rel: string[]) => { const g = need(); await dl.quarantine(g, rel); return dl.scan(g) })
ipcMain.handle('game:unremove', async (_e, id: string) => { const g = need(); await dl.restoreRemoved(g, id); return dl.scan(g) })
ipcMain.handle('game:fresh', async () => { const g = need(); await dl.prepareFreshStart(g); return dl.status(g) })
// Steam re-downloads every stock file that was changed (gameinfo.gi among them). Addons are left alone.
ipcMain.handle('steam:validate', () => shell.openExternal('steam://validate/1422450'))
ipcMain.handle('open', (_e, url: string) => { if (/^https:\/\//.test(url)) shell.openExternal(url) })
ipcMain.handle('reveal', () => { if (gamePath) shell.openPath(join(gamePath, 'game', 'citadel')) })

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
  app.setAppUserModelId('com.veil.deadlock')
  app.whenReady().then(() => {
    create()
    setupUpdates()
    // toggles the crosshair overlay from inside the game
    globalShortcut.register('Alt+Shift+X', () => setOverlay(!overlay))
  })
  app.on('will-quit', () => globalShortcut.unregisterAll())
  app.on('window-all-closed', () => app.quit())
}
