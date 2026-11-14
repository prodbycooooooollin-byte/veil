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
export type PakKind = 'skin' | 'hud' | 'effects' | 'sound' | 'map' | 'model' | 'mixed' | 'unknown'
export type ScannedPak = { veil?: boolean; file: string; size: number; enabled: boolean; files: number; kind: PakKind; label: string; name?: string; author?: string; heroes: string[]; sample: string[] }
export type Scan = { paks: ScannedPak[]; leftovers: { file: string; what: string }[]; removed: { id: string; when: number; files: string[] }[] }

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
  installHud(bar: unknown, extras?: unknown): Promise<string>
  removeHud(): Promise<GameStatus>
  hudCss(bar: unknown, extras?: unknown): Promise<Record<string, string>>
  clSync(wanted: string[], gameinfo: boolean): Promise<{ installed: string[]; game: string }>
  onClProgress(fn: (p: { title: string; done: number; total: number } | null) => void): Off
  managed(): Promise<Record<string, string | string[]>>
  scan(): Promise<Scan>
  quarantine(rel: string[]): Promise<Scan>
  unremove(id: string): Promise<Scan>
  freshStart(): Promise<GameStatus>
  validate(): Promise<void>
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
// what the real scan found on the developer's install, used for the browser preview
const pk = (file: string, kind: PakKind, name: string, size: number, files: number): ScannedPak => ({ file, kind, name, size, files, enabled: true, label: kind, heroes: [], sample: [] })
const MOCK_PAKS: ScannedPak[] = [
  pk('pak01_dir.vpk', 'hud', 'HUD++ - HoppCX, jcStani', 5441219, 207),
  pk('pak02_dir.vpk', 'effects', 'Particle Pruning (stock tracers and hits) - HoppCX, jcStani', 9535437, 4501),
  pk('pak03_dir.vpk', 'unknown', 'Sound stack update cap - HoppCX', 24887, 3),
  pk('pak04_dir.vpk', 'mixed', 'Brighter lighting - BreadRollius', 107862, 9),
  pk('pak05_dir.vpk', 'hud', 'Flat health bars - jcStani', 60098, 3),
  pk('pak06_dir.vpk', 'unknown', 'Thicker outlines (DX11)', 5029, 4),
  pk('pak08_dir.vpk', 'map', 'Low detail map - jcStani', 35165632, 1092),
  pk('pak09_dir.vpk', 'map', 'Low-poly troopers - aglow', 1756295, 119),
  pk('pak10_dir.vpk', 'sound', "KovaaK's hit sounds - jcStani", 70855, 15),
  pk('pak11_dir.vpk', 'sound', 'No music, low gun volume - jcStani', 106068, 8),
  pk('pak13_dir.vpk', 'skin', 'Noir Haze skin', 8124000, 64),
]
let mockScan: Scan = { paks: MOCK_PAKS, leftovers: [{ file: 'addons/mods.txt', what: 'Load order list from another mod pack' }, { file: 'addons/.sigil.json', what: 'Settings of another mod manager' }, { file: 'gameinfo.gi.sigil.bak', what: 'gameinfo.gi backup from another tool' }], removed: [] }
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
  installHud: async () => 'pak01_dir.vpk',
  removeHud: () => wait(mock),
  hudCss: async () => ({ preview: '/* browser preview: the CSS is built in the app */' }),
  clSync: async (wanted) => { await new Promise((r) => setTimeout(r, 700)); return { installed: wanted, game: '6860' } },
  onClProgress: () => noop,
  managed: async () => ({}),
  scan: () => wait(mockScan),
  quarantine: (rel) => {
    const files = rel.filter((r) => mockScan.paks.some((p) => 'addons/' + p.file === r) || mockScan.leftovers.some((l) => l.file === r))
    mockScan = { paks: mockScan.paks.filter((p) => !rel.includes('addons/' + p.file)), leftovers: mockScan.leftovers.filter((l) => !rel.includes(l.file)), removed: [{ id: String(Date.now()), when: Date.now(), files }, ...mockScan.removed] }
    return wait(mockScan)
  },
  unremove: (id) => { mockScan = { ...mockScan, paks: [...mockScan.paks, ...MOCK_PAKS.filter((p) => mockScan.removed.find((r) => r.id === id)?.files.includes('addons/' + p.file))], removed: mockScan.removed.filter((r) => r.id !== id) }; return wait(mockScan) },
  freshStart: () => wait(mock),
  validate: async () => {},
  open: async (url) => { window.open(url, '_blank', 'noopener') },
  reveal: async () => {},
}

export const api: Bridge = (typeof window !== 'undefined' && window.veil) || mockBridge
