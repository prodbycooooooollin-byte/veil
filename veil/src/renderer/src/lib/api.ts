// The bridge to the Electron main process. In a plain browser (the web preview) a mock stands in so the UI
// can be developed without a game install; it never touches a disk.

export type GameStatus = {
  found: boolean
  gamePath: string | null
  addonsSearchPath: boolean
  managedConvars: Record<string, string>
  backup: boolean
  paks: { file: string; size: number; mtime: number }[]
}

export type UpdateState = { state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error'; version?: string; percent?: number; message?: string }
type Off = () => void

type Bridge = {
  win(a: 'min' | 'max' | 'close'): Promise<void>
  onWinState(fn: (max: boolean) => void): Off
  version(): Promise<string>
  checkUpdate(): Promise<UpdateState | null>
  installUpdate(): Promise<void>
  onUpdate(fn: (u: UpdateState) => void): Off
  setOverlay(enabled: boolean, spec?: unknown): Promise<boolean>
  sendOverlaySpec(spec: unknown): Promise<void>
  getOverlaySpec(): Promise<unknown>
  onOverlaySpec(fn: (spec: any) => void): Off
  onOverlayState(fn: (on: boolean) => void): Off
  detect(): Promise<GameStatus>
  pick(): Promise<GameStatus>
  apply(convars: Record<string, string>, autoexec: Record<string, string>): Promise<GameStatus>
  restore(): Promise<GameStatus>
  installGameinfo(): Promise<GameStatus>
  installPak(target?: string): Promise<{ names: string[]; status: GameStatus }>
  togglePak(file: string): Promise<GameStatus>
  removePak(file: string): Promise<GameStatus>
  save(name: string, data: Uint8Array): Promise<string | null>
  open(url: string): Promise<void>
  reveal(): Promise<void>
}

declare global { interface Window { veil?: Bridge } }

export const isApp = typeof window !== 'undefined' && !!window.veil

let mock: GameStatus = {
  found: true,
  gamePath: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Deadlock',
  addonsSearchPath: false,
  managedConvars: {},
  backup: false,
  paks: [
    { file: 'pak01_dir.vpk', size: 819_200, mtime: Date.now() - 86_400_000 * 3 },
    { file: 'pak02_dir.vpk', size: 2_411_724, mtime: Date.now() - 86_400_000 },
  ],
}
const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 260))

const noop: Off = () => {}
let overlayOn = false
const overlayListeners = new Set<(on: boolean) => void>()
const mockBridge: Bridge = {
  win: async () => {},
  onWinState: () => noop,
  version: async () => '0.2.0',
  checkUpdate: async () => ({ state: 'none', message: 'Updates are checked in the installed app.' }),
  installUpdate: async () => {},
  onUpdate: () => noop,
  setOverlay: async (on) => { overlayOn = on; overlayListeners.forEach((f) => f(on)); return overlayOn },
  sendOverlaySpec: async () => {},
  getOverlaySpec: async () => null,
  onOverlaySpec: () => noop,
  onOverlayState: (fn) => { overlayListeners.add(fn); return () => { overlayListeners.delete(fn) } },
  detect: () => wait(mock),
  pick: () => wait(mock),
  apply: (convars) => { mock = { ...mock, addonsSearchPath: true, backup: true, managedConvars: convars }; return wait(mock) },
  restore: () => { mock = { ...mock, addonsSearchPath: false, backup: false, managedConvars: {} }; return wait(mock) },
  installGameinfo: () => { mock = { ...mock, backup: true }; return wait(mock) },
  installPak: (target) => {
    const n = target ?? `pak${String(mock.paks.length + 1).padStart(2, '0')}_dir.vpk`
    mock = { ...mock, paks: [...mock.paks.filter((p) => p.file !== n), { file: n, size: 1_200_000, mtime: Date.now() }] }
    return wait({ names: [n], status: mock })
  },
  togglePak: (file) => { mock = { ...mock, paks: mock.paks.map((p) => p.file === file ? { ...p, file: file.endsWith('.off') ? file.slice(0, -4) : file + '.off' } : p) }; return wait(mock) },
  removePak: (file) => { mock = { ...mock, paks: mock.paks.filter((p) => p.file !== file) }; return wait(mock) },
  save: async (name, data) => {
    const url = URL.createObjectURL(new Blob([data as BlobPart]))
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    return name
  },
  open: async (url) => { window.open(url, '_blank', 'noopener') },
  reveal: async () => {},
}

export const api: Bridge = (typeof window !== 'undefined' && window.veil) || mockBridge
