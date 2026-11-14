import { contextBridge, ipcRenderer } from 'electron'

const call = (ch: string, ...a: unknown[]) => ipcRenderer.invoke(ch, ...a)
const on = (ch: string) => (fn: (v: any) => void) => {
  const h = (_e: unknown, v: unknown) => fn(v)
  ipcRenderer.on(ch, h)
  return () => { ipcRenderer.removeListener(ch, h) }
}

contextBridge.exposeInMainWorld('veil', {
  win: (a: 'min' | 'max' | 'close') => call('win', a),
  onWinState: on('win:state'),
  version: () => call('app:version'),
  checkUpdate: () => call('update:check'),
  installUpdate: () => call('update:install'),
  onUpdate: on('update'),
  setOverlay: (enabled: boolean, spec?: unknown) => call('overlay:set', enabled, spec),
  sendOverlaySpec: (spec: unknown) => call('overlay:spec', spec),
  getOverlaySpec: () => call('overlay:get'),
  onOverlaySpec: on('overlay:spec'),
  onOverlayState: on('overlay:state'),
  detect: () => call('game:detect'),
  pick: () => call('game:pick'),
  apply: (convars: Record<string, string>, autoexec: Record<string, string>) => call('game:apply', convars, autoexec),
  restore: () => call('game:restore'),
  installGameinfo: () => call('gameinfo:install'),
  installPak: (target?: string) => call('pak:install', target),
  togglePak: (file: string) => call('pak:toggle', file),
  removePak: (file: string) => call('pak:remove', file),
  save: (name: string, data: Uint8Array) => call('file:save', name, data),
  scan: () => call('game:scan'),
  quarantine: (rel: string[]) => call('game:quarantine', rel),
  unremove: (id: string) => call('game:unremove', id),
  freshStart: () => call('game:fresh'),
  validate: () => call('steam:validate'),
  open: (url: string) => call('open', url),
  reveal: () => call('reveal'),
})
