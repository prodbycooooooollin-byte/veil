// Reads the file list of a Valve VPK (v1/v2 directory) and works out what kind of mod it is from the paths inside.
import { open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { crc32 } from 'node:zlib'

export type PakKind = 'skin' | 'hud' | 'effects' | 'sound' | 'map' | 'model' | 'mixed' | 'unknown'
export type PakInfo = {
  files: number
  kind: PakKind
  label: string
  heroes: string[]
  sample: string[]
  areas: Record<string, number>
}

type Entry = { path: string; preload: Buffer; archive: number; offset: number; length: number }

/** Paths stored in a VPK's directory tree. Only the directory part of the file is read. */
export async function listVpk(file: string): Promise<string[]> {
  return (await readTree(file)).entries.map((e) => e.path)
}

async function readTree(file: string): Promise<{ entries: Entry[]; dataStart: number }> {
  const fh = await open(file, 'r')
  try {
    const head = Buffer.alloc(28)
    await fh.read(head, 0, 28, 0)
    if (head.readUInt32LE(0) !== 0x55aa1234) throw new Error('not a VPK')
    const version = head.readUInt32LE(4)
    const treeSize = head.readUInt32LE(8)
    const headerSize = version === 2 ? 28 : version === 1 ? 12 : -1
    if (headerSize < 0) throw new Error(`VPK version ${version}`)
    const tree = Buffer.alloc(treeSize)
    await fh.read(tree, 0, treeSize, headerSize)
    const out: Entry[] = []
    let p = 0
    const str = () => { const e = tree.indexOf(0, p); const s = tree.toString('utf8', p, e); p = e + 1; return s }
    for (;;) {
      const ext = str(); if (!ext) break
      for (;;) {
        const dir = str(); if (!dir) break
        for (;;) {
          const name = str(); if (!name) break
          const preload = tree.readUInt16LE(p + 4)
          const archive = tree.readUInt16LE(p + 6), offset = tree.readUInt32LE(p + 8), length = tree.readUInt32LE(p + 12)
          const pre = tree.subarray(p + 18, p + 18 + preload)
          p += 18 + preload // crc4 preload2 archive2 offset4 length4 terminator2
          out.push({ path: `${dir === ' ' ? '' : dir + '/'}${name}.${ext}`, preload: Buffer.from(pre), archive, offset, length })
        }
      }
    }
    return { entries: out, dataStart: headerSize + treeSize }
  } finally {
    await fh.close()
  }
}

const AREAS: [string, RegExp][] = [
  ['hud', /^panorama\//],
  ['heroModel', /^models\/heroes(_wip|_staging)?\//],
  ['heroMaterial', /^materials\/models\/heroes(_wip|_staging)?\//],
  ['particles', /^particles\//],
  ['sound', /^(sounds|soundevents|soundstacks)\//],
  ['shaders', /^shaders\//],
  ['map', /^(maps|materials\/(?!models\/heroes)|models\/(?!heroes))/],
  ['scripts', /^scripts\//],
]

const META = /^(modinfo\.json|addoninfo\.txt|readme(\.\w+)?|license(\.\w+)?)$/i

export function classify(all: string[]): PakInfo {
  const paths = all.filter((f) => !META.test(f))
  const areas: Record<string, number> = {}
  const heroes = new Set<string>()
  for (const f of paths) {
    const a = AREAS.find(([, re]) => re.test(f))?.[0] ?? 'other'
    areas[a] = (areas[a] ?? 0) + 1
    const m = f.match(/^(?:models|materials\/models)\/heroes(?:_wip|_staging)?\/([^/]+)\//)
    if (m) heroes.add(m[1])
  }
  const total = paths.length || 1
  const share = (k: string) => (areas[k] ?? 0) / total
  const heroShare = share('heroModel') + share('heroMaterial')
  let kind: PakKind = 'unknown'
  if (heroShare > 0.7) kind = 'skin'
  else if (share('hud') > 0.6) kind = 'hud'
  else if (share('particles') > 0.6) kind = 'effects'
  else if (share('sound') > 0.6) kind = 'sound'
  else if (share('map') > 0.6) kind = 'map'
  else if (share('shaders') > 0.6) kind = 'effects'
  else if (Object.keys(areas).length > 1 && paths.length) kind = 'mixed'
  const label = {
    skin: heroes.size ? `Skin for ${[...heroes].slice(0, 3).join(', ')}` : 'Hero skin',
    hud: hudLabel(paths),
    effects: 'Effects mod',
    sound: soundLabel(paths),
    map: 'Map and lighting mod',
    model: 'Model mod',
    mixed: 'Mixed mod',
    unknown: 'Unknown content',
  }[kind]
  return { files: paths.length, kind, label, heroes: [...heroes], sample: paths.slice(0, 8), areas }
}

function hudLabel(paths: string[]) {
  const s = paths.join('\n')
  if (/unit_status|healthbar|health_bar|hpbar/i.test(s) && paths.length < 40) return 'Health bar mod'
  if (/hud/i.test(s)) return 'HUD mod'
  return 'Interface mod'
}
function soundLabel(paths: string[]) {
  return /hit_?indicator|hitsound|hit_marker/i.test(paths.join('\n')) ? 'Hit sound mod' : 'Sound mod'
}

/** Reads one small text file stored inside the pak itself (archive index 0x7fff). */
async function readText(file: string, e: Entry, dataStart: number): Promise<string> {
  if (e.archive !== 0x7fff || e.length > 65536) return e.preload.toString('utf8')
  const fh = await open(file, 'r')
  try {
    const b = Buffer.alloc(e.length)
    await fh.read(b, 0, e.length, dataStart + e.offset)
    return Buffer.concat([e.preload, b]).toString('utf8')
  } finally { await fh.close() }
}

/** Name and author the mod declares about itself, from modinfo.json or addoninfo.txt. */
async function declared(file: string, entries: Entry[], dataStart: number): Promise<{ name?: string; author?: string }> {
  const mi = entries.find((e) => e.path.toLowerCase() === 'modinfo.json')
  if (mi) {
    try {
      const j = JSON.parse(await readText(file, mi, dataStart))
      const name = j.name ?? j.title ?? j.Name ?? j.addontitle
      const author = j.author ?? j.authors ?? j.Author
      if (name) return { name: String(name), author: author ? String(Array.isArray(author) ? author.join(', ') : author) : undefined }
    } catch {}
  }
  const ai = entries.find((e) => e.path.toLowerCase() === 'addoninfo.txt')
  if (ai) {
    const t = await readText(file, ai, dataStart)
    const name = t.match(/"?addontitle"?\s+"([^"]+)"/i)?.[1]
    const author = t.match(/"?addonauthor"?\s+"([^"]+)"/i)?.[1]
    if (name) return { name, author }
  }
  return {}
}

export async function inspect(file: string): Promise<PakInfo & { name?: string; author?: string }> {
  try {
    const { entries, dataStart } = await readTree(file)
    return { ...classify(entries.map((e) => e.path)), ...(await declared(file, entries, dataStart)) }
  }
  catch { return { files: 0, kind: 'unknown', label: 'Could not be read', heroes: [], sample: [], areas: {} } }
}

/* ---------- writing ---------- */

export type PakFile = { path: string; data: Buffer }

/**
 * Builds a single-file VPK v2 (pakNN_dir.vpk) with every file stored inside it, the layout Deadlock addons use.
 * Files keep the order given; the tree groups them by extension, then folder, in order of first appearance.
 */
export function writeVpk(files: PakFile[]): Buffer {
  const groups = new Map<string, Map<string, { name: string; file: PakFile }[]>>()
  for (const f of files) {
    const slash = f.path.lastIndexOf('/')
    const dir = slash < 0 ? ' ' : f.path.slice(0, slash)
    const base = f.path.slice(slash + 1)
    const dot = base.lastIndexOf('.')
    const ext = dot < 0 ? ' ' : base.slice(dot + 1)
    const name = dot < 0 ? base : base.slice(0, dot)
    if (!groups.has(ext)) groups.set(ext, new Map())
    const dirs = groups.get(ext)!
    if (!dirs.has(dir)) dirs.set(dir, [])
    dirs.get(dir)!.push({ name, file: f })
  }
  const z = Buffer.from([0])
  const s = (t: string) => Buffer.concat([Buffer.from(t, 'utf8'), z])
  const tree: Buffer[] = [], data: Buffer[] = []
  let offset = 0
  for (const [ext, dirs] of groups) {
    tree.push(s(ext))
    for (const [dir, list] of dirs) {
      tree.push(s(dir))
      for (const { name, file } of list) {
        tree.push(s(name))
        const e = Buffer.alloc(18)
        e.writeUInt32LE(crc32(file.data) >>> 0, 0)
        e.writeUInt16LE(0, 4)          // no preload bytes
        e.writeUInt16LE(0x7fff, 6)     // stored in this file
        e.writeUInt32LE(offset, 8)
        e.writeUInt32LE(file.data.length, 12)
        e.writeUInt16LE(0xffff, 16)
        tree.push(e)
        data.push(file.data)
        offset += file.data.length
      }
      tree.push(z)
    }
    tree.push(z)
  }
  tree.push(z)
  const treeBuf = Buffer.concat(tree), dataBuf = Buffer.concat(data)
  const header = Buffer.alloc(28)
  header.writeUInt32LE(0x55aa1234, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(treeBuf.length, 8)
  header.writeUInt32LE(dataBuf.length, 12); header.writeUInt32LE(0, 16); header.writeUInt32LE(48, 20); header.writeUInt32LE(0, 24)
  const md5 = (b: Buffer) => createHash('md5').update(b).digest()
  const treeMd5 = md5(treeBuf), archMd5 = md5(Buffer.alloc(0))
  const whole = md5(Buffer.concat([header, treeBuf, dataBuf, treeMd5, archMd5]))
  return Buffer.concat([header, treeBuf, dataBuf, treeMd5, archMd5, whole])
}

/** Every file in a single-file VPK with its contents. */
export async function readVpkFiles(file: string): Promise<PakFile[]> {
  const { entries, dataStart } = await readTree(file)
  const fh = await open(file, 'r')
  try {
    const out: PakFile[] = []
    for (const e of entries) {
      const b = Buffer.alloc(e.length)
      if (e.archive === 0x7fff) await fh.read(b, 0, e.length, dataStart + e.offset)
      out.push({ path: e.path, data: Buffer.concat([e.preload, b]) })
    }
    return out
  } finally { await fh.close() }
}

/** One file from a game VPK, following multi-archive paks (pak01_dir.vpk + pak01_NNN.vpk). */
export async function extractFile(dirVpk: string, wanted: string): Promise<Buffer | null> {
  const { entries, dataStart } = await readTree(dirVpk)
  const e = entries.find((x) => x.path === wanted)
  if (!e) return null
  const src = e.archive === 0x7fff ? dirVpk : dirVpk.replace(/_dir\.vpk$/i, `_${String(e.archive).padStart(3, '0')}.vpk`)
  const fh = await open(src, 'r')
  try {
    const b = Buffer.alloc(e.length)
    await fh.read(b, 0, e.length, e.archive === 0x7fff ? dataStart + e.offset : e.offset)
    return Buffer.concat([e.preload, b])
  } finally { await fh.close() }
}
