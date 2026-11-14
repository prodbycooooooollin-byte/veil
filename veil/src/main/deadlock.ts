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

export type ScannedPak = PakInfo & { file: string; size: number; enabled: boolean; name?: string; author?: string }
export type Leftover = { file: string; what: string }
export type RemovedSet = { id: string; when: number; files: string[] }

const removedRoot = (game: string) => join(citadel(game), '.veil-removed')

/** Every pak in addons with what it contains, plus loose files other mod tools leave next to the game. */
export async function scan(game: string): Promise<{ paks: ScannedPak[]; leftovers: Leftover[]; removed: RemovedSet[] }> {
  const dir = addonsDir(game)
  const paks: ScannedPak[] = []
  const leftovers: Leftover[] = []
  if (existsSync(dir)) {
    for (const f of await readdir(dir)) {
      const full = join(dir, f)
      if (/\.vpk(\.off)?$/i.test(f)) {
        const s = await stat(full)
        paks.push({ ...(await inspect(full)), file: f, size: s.size, enabled: !f.endsWith('.off') })
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
