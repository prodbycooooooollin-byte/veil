// Everything that touches the Deadlock install: finding it, gameinfo.gi, autoexec.cfg and addon paks.
// Every write to gameinfo.gi is preceded by a one-time backup next to it, and restore() puts it back.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { inspect, type PakInfo } from './vpk'

const BEGIN = '// >>> VEIL managed block, edited by the VEIL app'
const END = '// <<< VEIL'
const BACKUP_SUFFIX = '.veil-backup'

export type GameStatus = {
  found: boolean
  gamePath: string | null
  addonsSearchPath: boolean
  managedConvars: Record<string, string>
  backup: boolean
  paks: { file: string; size: number; mtime: number }[]
}

function reg(key: string, value: string): Promise<string | null> {
  return new Promise((res) => {
    if (process.platform !== 'win32') return res(null)
    execFile('reg', ['query', key, '/v', value], (err, out) => {
      if (err) return res(null)
      const m = out.match(new RegExp(`${value}\\s+REG_\\w+\\s+(.+)`))
      res(m ? m[1].trim() : null)
    })
  })
}

async function steamRoots(): Promise<string[]> {
  const roots = new Set<string>()
  const fromReg = (await reg('HKCU\\Software\\Valve\\Steam', 'SteamPath')) ?? (await reg('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'))
  if (fromReg) roots.add(fromReg.replace(/\//g, '\\'))
  roots.add('C:\\Program Files (x86)\\Steam')
  roots.add('C:\\Program Files\\Steam')
  if (process.platform !== 'win32') {
    const home = process.env.HOME ?? ''
    roots.add(join(home, '.steam/steam'))
    roots.add(join(home, '.local/share/Steam'))
  }
  return [...roots]
}

/** Library folders listed in Steam's libraryfolders.vdf, plus the Steam root itself. */
async function steamLibraries(): Promise<string[]> {
  const libs = new Set<string>()
  for (const root of await steamRoots()) {
    const vdf = join(root, 'steamapps', 'libraryfolders.vdf')
    if (!existsSync(vdf)) continue
    libs.add(root)
    const text = await readFile(vdf, 'utf8')
    for (const m of text.matchAll(/"path"\s+"([^"]+)"/g)) libs.add(m[1].replace(/\\\\/g, '\\'))
  }
  return [...libs]
}

export async function detectGame(): Promise<string | null> {
  for (const lib of await steamLibraries()) {
    const p = join(lib, 'steamapps', 'common', 'Deadlock')
    if (existsSync(gameinfoPath(p))) return p
  }
  return null
}

export const isGameDir = (p: string) => existsSync(gameinfoPath(p))
const citadel = (game: string) => join(game, 'game', 'citadel')
const gameinfoPath = (game: string) => join(citadel(game), 'gameinfo.gi')
const addonsDir = (game: string) => join(citadel(game), 'addons')
const autoexecPath = (game: string) => join(citadel(game), 'cfg', 'autoexec.cfg')

/** Finds the `{ ... }` body that follows `name` at or after `from`. Returns indexes of the braces. */
function block(text: string, name: string, from = 0): { open: number; close: number } | null {
  const re = new RegExp(`(^|\\s)"?${name}"?\\s*\\{`, 'gi')
  re.lastIndex = from
  const m = re.exec(text)
  if (!m) return null
  const open = text.indexOf('{', m.index)
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === '/' && text[i + 1] === '/') { i = text.indexOf('\n', i); if (i < 0) break; continue }
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) return { open, close: i }
  }
  return null
}

function stripManaged(text: string): string {
  // drop our block and un-comment stock lines we parked
  const re = new RegExp(`[\\t ]*${escape(BEGIN)}[\\s\\S]*?${escape(END)}[^\\n]*\\n?`, 'g')
  return text.replace(re, '').replace(/^(\s*)\/\/ veil-parked: /gm, '$1')
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

function readManaged(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  const i = text.indexOf(BEGIN)
  if (i < 0) return out
  const j = text.indexOf(END, i)
  for (const m of text.slice(i, j).matchAll(/"([^"]+)"\s+"([^"]*)"/g)) out[m[1]] = m[2]
  return out
}

export async function status(game: string | null): Promise<GameStatus> {
  if (!game || !isGameDir(game)) return { found: false, gamePath: game, addonsSearchPath: false, managedConvars: {}, backup: false, paks: [] }
  await readManifest(game) // moves an old manifest out of addons
  const gi = await readFile(gameinfoPath(game), 'utf8')
  const paks: GameStatus['paks'] = []
  if (existsSync(addonsDir(game))) {
    for (const f of await readdir(addonsDir(game))) {
      if (!/\.vpk(\.off)?$/i.test(f)) continue
      const s = await stat(join(addonsDir(game), f))
      paks.push({ file: f, size: s.size, mtime: s.mtimeMs })
    }
  }
  return {
    found: true,
    gamePath: game,
    addonsSearchPath: /^\s*Game\s+citadel[\\/]addons\s*$/im.test(gi),
    managedConvars: readManaged(gi),
    backup: existsSync(gameinfoPath(game) + BACKUP_SUFFIX),
    paks: paks.sort((a, b) => a.file.localeCompare(b.file)),
  }
}

/**
 * Writes the given convars into gameinfo.gi's ConVars block (the only place developmentonly cvars can be set)
 * and makes sure the addons folder is on the search path so paks load.
 */
export async function applyGameinfo(game: string, convars: Record<string, string>): Promise<void> {
  const file = gameinfoPath(game)
  if (!existsSync(file + BACKUP_SUFFIX)) await copyFile(file, file + BACKUP_SUFFIX)
  let text = stripManaged(await readFile(file, 'utf8'))
  const nl = text.includes('\r\n') ? '\r\n' : '\n'

  if (!/^\s*Game\s+citadel[\\/]addons\s*$/im.test(text)) {
    const sp = block(text, 'SearchPaths')
    if (sp) {
      const body = text.slice(sp.open, sp.close)
      const m = body.match(/^([\t ]*)Game\s+citadel\s*$/m)
      if (m && m.index !== undefined) {
        const at = sp.open + m.index
        text = text.slice(0, at) + `${m[1]}Game\t\t\t\tcitadel/addons${nl}` + text.slice(at)
      }
    }
  }

  const keys = Object.keys(convars)
  if (keys.length) {
    let cv = block(text, 'ConVars')
    if (!cv) {
      const root = block(text, 'GameInfo')
      if (!root) throw new Error('gameinfo.gi has no GameInfo block. Restore the original file and try again.')
      text = text.slice(0, root.close) + `\tConVars${nl}\t{${nl}\t}${nl}` + text.slice(root.close)
      cv = block(text, 'ConVars')!
    }
    // park stock lines for the same names so ours are the only value
    let body = text.slice(cv.open + 1, cv.close)
    for (const k of keys) body = body.replace(new RegExp(`^(\\s*)("${escape(k)}"\\s+"[^"]*")`, 'gm'), '$1// veil-parked: $2')
    const lines = [`\t\t${BEGIN}`, ...keys.map((k) => `\t\t"${k}"\t"${convars[k]}"`), `\t\t${END}`].join(nl)
    text = text.slice(0, cv.open + 1) + nl + lines + body + text.slice(cv.close)
  }
  await writeFile(file, text, 'utf8')
}

export async function writeAutoexec(game: string, cvars: Record<string, string>): Promise<string> {
  const file = autoexecPath(game)
  await mkdir(join(citadel(game), 'cfg'), { recursive: true })
  const prior = existsSync(file) ? stripManaged(await readFile(file, 'utf8')) : ''
  const body = [BEGIN, ...Object.entries(cvars).map(([k, v]) => `${k} "${v}"`), END].join('\n')
  await writeFile(file, `${body}\n${prior}`, 'utf8')
  return file
}

/*
 * cfg/video.txt holds the video menu's values ("setting.<cvar>"). Deadlock loads it after gameinfo.gi, so for
 * these cvars a value in gameinfo.gi alone is overwritten at launch. The list is the cvars the game saves to
 * video.txt (CompLock's cvar index, build 6861).
 */
const VIDEO_CVARS = new Set(['cpu_level', 'gpu_level', 'gpu_mem_level', 'mat_viewportscale', 'mem_level', 'r_arealights', 'r_citadel_antialiasing', 'r_citadel_dlss_settings_mode',
  'r_citadel_fog_quality', 'r_citadel_fsr2_sharpness', 'r_citadel_fsr_rcas_sharpness', 'r_citadel_shadow_quality', 'r_citadel_ssao_quality', 'r_citadel_upscaling', 'r_depth_of_field',
  'r_dlss_preset', 'r_effects_bloom', 'r_fullscreen_gamma', 'r_light_sensitivity_mode', 'r_low_latency', 'r_post_bloom', 'r_texture_stream_mip_bias'])
const videoPath = (game: string) => join(citadel(game), 'cfg', 'video.txt')

/** Writes the video-menu cvars among `convars` into cfg/video.txt, backing the file up once. Returns how many. */
export async function writeVideo(game: string, convars: Record<string, string>): Promise<number> {
  const file = videoPath(game)
  if (!existsSync(file)) return 0 // the game writes it at first launch; until then gameinfo.gi's value is used
  let text = await readFile(file, 'utf8')
  const nl = text.includes('\r\n') ? '\r\n' : '\n'
  let n = 0
  for (const [k, v] of Object.entries(convars)) {
    // only the menu's own cvars: other "setting.x" lines may hold values tuned lower than VEIL's
    if (!VIDEO_CVARS.has(k)) continue
    const re = new RegExp(`^(\\s*)"setting\\.${escape(k)}"(\\s+)"[^"]*"`, 'm')
    if (re.test(text)) { text = text.replace(re, `$1"setting.${k}"$2"${v}"`); n++ }
    else {
      const end = text.lastIndexOf('}')
      if (end < 0) continue
      text = text.slice(0, end) + `\t"setting.${k}"\t\t"${v}"${nl}` + text.slice(end)
      n++
    }
  }
  if (n) {
    if (!existsSync(file + BACKUP_SUFFIX)) await copyFile(file, file + BACKUP_SUFFIX)
    await writeFile(file, text, 'utf8')
  }
  return n
}

export async function restoreVideo(game: string): Promise<boolean> {
  const file = videoPath(game)
  if (!existsSync(file + BACKUP_SUFFIX)) return false
  await copyFile(file + BACKUP_SUFFIX, file)
  await unlink(file + BACKUP_SUFFIX)
  return true
}

/** Replaces gameinfo.gi with another one (e.g. CompLock's), keeping the original as the backup. */
export async function installGameinfo(game: string, src: string): Promise<void> {
  const file = gameinfoPath(game)
  const text = await readFile(src, 'utf8')
  if (!block(text, 'GameInfo')) throw new Error('That file is not a gameinfo.gi: it has no GameInfo block.')
  if (!existsSync(file + BACKUP_SUFFIX)) await copyFile(file, file + BACKUP_SUFFIX)
  await writeFile(file, text, 'utf8')
}

export async function restore(game: string): Promise<boolean> {
  const file = gameinfoPath(game)
  if (!existsSync(file + BACKUP_SUFFIX)) return false
  await copyFile(file + BACKUP_SUFFIX, file)
  await unlink(file + BACKUP_SUFFIX)
  return true
}

/** Copies a .vpk into addons under the first free pakNN_dir.vpk name, or `target` if given. */
export async function installPak(game: string, src: string, target?: string): Promise<string> {
  const dir = addonsDir(game)
  await mkdir(dir, { recursive: true })
  let name = target
  if (!name) {
    const taken = new Set((await readdir(dir)).map((f) => f.toLowerCase()))
    for (let n = 1; n < 100 && !name; n++) {
      const c = `pak${String(n).padStart(2, '0')}_dir.vpk`
      if (!taken.has(c)) name = c
    }
  }
  if (!name) throw new Error('All 99 pak slots in the addons folder are used.')
  await copyFile(src, join(dir, name))
  return name
}

export async function writePak(game: string, data: Uint8Array, target?: string): Promise<string> {
  const dir = addonsDir(game)
  await mkdir(dir, { recursive: true })
  const tmp = join(dir, `.veil-${Date.now()}.vpk`)
  await writeFile(tmp, data)
  const name = await installPak(game, tmp, target)
  await unlink(tmp)
  return name
}

/** Disabling renames to .vpk.off so the game skips it but the file stays. */
export async function togglePak(game: string, file: string): Promise<string> {
  const from = join(addonsDir(game), basename(file))
  const to = from.endsWith('.off') ? from.slice(0, -4) : from + '.off'
  await rename(from, to)
  return basename(to)
}

export async function removePak(game: string, file: string): Promise<void> {
  await unlink(join(addonsDir(game), basename(file)))
}

/* ---------- scanning and cleaning up what other tools left behind ---------- */

export type ScannedPak = PakInfo & { file: string; size: number; enabled: boolean; name?: string; author?: string; veil?: boolean }
export type Leftover = { file: string; what: string }
export type RemovedSet = { id: string; when: number; files: string[] }

const removedRoot = (game: string) => join(citadel(game), '.veil-removed')

/** Every pak in addons with what it contains, plus loose files other mod tools leave next to the game. */
export async function scan(game: string): Promise<{ paks: ScannedPak[]; leftovers: Leftover[]; removed: RemovedSet[] }> {
  const dir = addonsDir(game)
  const paks: ScannedPak[] = []
  const leftovers: Leftover[] = []
  // everything VEIL installed (its HUD and the CompLock files it downloaded) is listed in its manifest
  const ours = new Set(Object.values(await readManifest(game)).flat().map((f) => f.toLowerCase()))
  if (existsSync(dir)) {
    for (const f of await readdir(dir)) {
      const full = join(dir, f)
      if (/\.vpk(\.off)?$/i.test(f)) {
        const s = await stat(full)
        const info = await inspect(full)
        paks.push({ ...info, file: f, size: s.size, enabled: !f.endsWith('.off'), veil: ours.has(f.toLowerCase().replace(/\.off$/, '')) || / - VEIL$/.test(info.name ?? '') })
      } else if (f === '.veil.json') {
        // an old VEIL manifest; readManifest moves it out of addons on the next install
      } else if (/^(mods\.txt|\.sigil\.json|\.sigil_disabled|modinfo\.json|.*\.json)$/i.test(f) || f.startsWith('.sigil')) {
        leftovers.push({ file: `addons/${f}`, what: f === 'mods.txt' ? 'Load order list from another mod pack' : 'Settings of another mod manager' })
      }
    }
  }
  for (const f of await readdir(citadel(game))) {
    if (/^gameinfo\.gi\.(?!veil-backup).+/i.test(f)) leftovers.push({ file: f, what: 'gameinfo.gi backup from another tool' })
  }
  if (existsSync(join(citadel(game), 'cfg'))) {
    for (const f of await readdir(join(citadel(game), 'cfg'))) {
      if (/^autoexec\.cfg\..+/i.test(f)) leftovers.push({ file: `cfg/${f}`, what: 'autoexec.cfg backup from another tool' })
    }
  }
  const removed: RemovedSet[] = []
  if (existsSync(removedRoot(game))) {
    for (const id of await readdir(removedRoot(game))) {
      try { removed.push(JSON.parse(await readFile(join(removedRoot(game), id, 'manifest.json'), 'utf8'))) } catch {}
    }
  }
  paks.sort((a, b) => a.file.localeCompare(b.file))
  removed.sort((a, b) => b.when - a.when)
  return { paks, leftovers, removed }
}

/**
 * Moves files (paths relative to game/citadel) into game/citadel/.veil-removed/<id>, where the game never looks.
 * Nothing is deleted; restoreRemoved() puts a set back.
 */
export async function quarantine(game: string, rel: string[]): Promise<RemovedSet> {
  const id = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = join(removedRoot(game), id)
  await mkdir(dest, { recursive: true })
  const moved: string[] = []
  for (const r of rel) {
    const from = join(citadel(game), r)
    if (!existsSync(from)) continue
    const to = join(dest, r)
    await mkdir(join(to, '..'), { recursive: true })
    await rename(from, to)
    moved.push(r)
  }
  const set = { id, when: Date.now(), files: moved }
  await writeFile(join(dest, 'manifest.json'), JSON.stringify(set, null, 2))
  return set
}

export async function restoreRemoved(game: string, id: string): Promise<number> {
  const src = join(removedRoot(game), basename(id))
  const set: RemovedSet = JSON.parse(await readFile(join(src, 'manifest.json'), 'utf8'))
  let n = 0
  for (const r of set.files) {
    const to = join(citadel(game), r)
    if (existsSync(to)) continue
    await mkdir(join(to, '..'), { recursive: true })
    await rename(join(src, r), to)
    n++
  }
  await unlink(join(src, 'manifest.json'))
  return n
}

/**
 * Prepares a clean start: parks autoexec.cfg and VEIL's own gameinfo backup (which may hold another tool's
 * changes) so that after Steam restores the stock gameinfo.gi, the next apply backs up the real original.
 */
export async function prepareFreshStart(game: string): Promise<RemovedSet> {
  const rel = ['cfg/autoexec.cfg', 'gameinfo.gi' + BACKUP_SUFFIX].filter((r) => existsSync(join(citadel(game), r)))
  return quarantine(game, rel)
}

/* ---------- VEIL's own paks ---------- */
// VEIL's list of the paks it installed. It lives next to addons, not in it: Deadlock lists every file
// in addons as an addon, so a manifest there shows up in the game.
const manifestPath = (game: string) => join(citadel(game), '.veil.json')
type Manifest = Record<string, string | string[]>
async function readManifest(game: string): Promise<Manifest> {
  const old = join(addonsDir(game), '.veil.json')
  if (existsSync(old)) {
    if (!existsSync(manifestPath(game))) await rename(old, manifestPath(game))
    else await unlink(old)
  }
  try { return JSON.parse(await readFile(manifestPath(game), 'utf8')) } catch { return {} }
}
async function freeSlot(game: string): Promise<string> {
  const taken = new Set((await readdir(addonsDir(game))).map((f) => f.toLowerCase().replace(/\.off$/, '')))
  for (let n = 1; n < 100; n++) {
    const c = `pak${String(n).padStart(2, '0')}_dir.vpk`
    if (!taken.has(c)) return c
  }
  throw new Error('All 99 pak slots in the addons folder are used.')
}

/**
 * Writes one of VEIL's paks (e.g. 'hud') into addons, replacing the previous build of the same pak.
 * VEIL takes the lowest free number so its paks win over others (a lower number loads first and wins).
 */
export async function installVeilPak(game: string, id: string, data: Buffer): Promise<string> {
  const dir = addonsDir(game)
  await mkdir(dir, { recursive: true })
  const m = await readManifest(game)
  const prev = m[id]
  // reuse the previous slot only if it is still ours and no other installed mod has taken it
  const claimed = Object.entries(m).filter(([k]) => k !== id).flatMap(([, v]) => ([] as string[]).concat(v))
  let name = typeof prev === 'string' && existsSync(join(dir, prev)) && !claimed.includes(prev) ? prev : undefined
  name ??= await freeSlot(game)
  await writeFile(join(dir, name), data)
  m[id] = name
  await writeFile(manifestPath(game), JSON.stringify(m, null, 2))
  return name
}

export async function removeVeilPak(game: string, id: string): Promise<void> {
  const m = await readManifest(game)
  const files = ([] as string[]).concat(m[id] ?? [])
  for (const f of files) if (existsSync(join(addonsDir(game), f))) await unlink(join(addonsDir(game), f))
  delete m[id]
  await writeFile(manifestPath(game), JSON.stringify(m, null, 2))
}

export async function veilManaged(game: string): Promise<Manifest> { return readManifest(game) }

/** Writes downloaded pak bytes into addons under \`key\`, reusing that key's previous slot. */
export async function installBufferAs(game: string, key: string, data: Buffer): Promise<string> {
  return installVeilPak(game, key, data)
}

/** Replaces gameinfo.gi with the given text (e.g. CompLock's), keeping the original as the backup. */
export async function installGameinfoText(game: string, text: string): Promise<void> {
  const file = gameinfoPath(game)
  if (!block(text, 'GameInfo')) throw new Error('The downloaded gameinfo.gi is not valid.')
  if (!existsSync(file + BACKUP_SUFFIX)) await copyFile(file, file + BACKUP_SUFFIX)
  await writeFile(file, text, 'utf8')
}

export async function setManaged(game: string, key: string, value: string | string[] | null): Promise<void> {
  const m = await readManifest(game)
  if (value === null) delete m[key]
  else m[key] = value
  await writeFile(manifestPath(game), JSON.stringify(m, null, 2))
}
