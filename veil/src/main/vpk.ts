// Reads the file list of a Valve VPK (v1/v2 directory) and works out what kind of mod it is from the paths inside.
import { open } from 'node:fs/promises'

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
