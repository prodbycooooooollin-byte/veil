// CompLock (deadlockconfig.com, by HoppCX and jcStani): download their paks and gameinfo.gi the way their own
// pack builder does. The site lists every file in a JSON block on its home page; each pak is served as raw
// deflate (split into pieces for big ones) and carries a CRC32, which VEIL checks before installing.
import { inflateRawSync, crc32 } from 'node:zlib'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const SITE = 'https://deadlockconfig.com'
const UA = { 'User-Agent': 'VEIL-Deadlock-App (deadlockconfig.com pack installer)' }

export type ClPart = { name: string; size: number; crc: number; csize: number; url: string | string[] }
export type ClManifest = { game: string; files: Record<string, { num: number; title: string; parts: ClPart[] }>; gameinfo: string }

let cached: { at: number; m: ClManifest } | null = null

export async function manifest(): Promise<ClManifest> {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.m
  const html = await (await fetch(SITE + '/', { headers: UA })).text()
  const json = html.match(/<script[^>]*>\s*(\{"game".*?)<\/script>/s)?.[1]
  if (!json) throw new Error('deadlockconfig.com changed its page; VEIL could not find the pack list.')
  const d = JSON.parse(json)
  const m: ClManifest = { game: d.game, files: d.files, gameinfo: d.gameinfo }
  cached = { at: Date.now(), m }
  return m
}

/** Downloads one CompLock pak and returns its bytes after checking size and CRC. */
export async function downloadPak(key: string, onProgress?: (done: number, total: number) => void): Promise<Buffer> {
  const m = await manifest()
  const f = m.files[key]
  if (!f) throw new Error(`CompLock no longer offers ${key}.`)
  const part = f.parts[0]
  const urls = ([] as string[]).concat(part.url)
  const chunks: Buffer[] = []
  let done = 0
  for (const u of urls) {
    const r = await fetch(SITE + u, { headers: UA })
    if (!r.ok || !r.body) throw new Error(`Download of ${f.title} failed (${r.status}).`)
    const reader = r.body.getReader()
    for (;;) {
      const { value, done: end } = await reader.read()
      if (end) break
      chunks.push(Buffer.from(value))
      done += value.length
      onProgress?.(done, part.csize)
    }
  }
  const data = inflateRawSync(Buffer.concat(chunks))
  if (data.length !== part.size || (crc32(data) >>> 0) !== part.crc) throw new Error(`${f.title} arrived damaged (checksum mismatch). Try again.`)
  return data
}

export async function gameinfo(): Promise<string> {
  return (await manifest()).gameinfo
}

/*
 * Paks from older CompLock packs that deadlockconfig.com no longer serves (low-poly troopers, thicker
 * outlines, KovaaK's hit sounds, no music). VEIL can't download them, but it can take them from a
 * CompLock.zip the user already has: the zip's mods.txt names every pak ("pak09_dir.vpk  Low-poly troopers
 * (lowpolytroopers.vpk)"), so each file is stored under its CompLock key in VEIL's own folder.
 */
let localDir = ''
export function setLocalDir(dir: string) { localDir = dir }
const localPath = (key: string) => join(localDir, 'complock', key)

/** CompLock keys VEIL has a local copy of. */
export async function localKeys(): Promise<string[]> {
  if (!localDir || !existsSync(join(localDir, 'complock'))) return []
  return (await readdir(join(localDir, 'complock'))).filter((f) => f.endsWith('.vpk'))
}
export async function readLocal(key: string): Promise<Buffer | null> {
  return existsSync(localPath(key)) ? readFile(localPath(key)) : null
}

/** A CompLock zip in the user's Downloads, newest first, if there is one. */
export async function findZip(): Promise<string | null> {
  const dl = join(homedir(), 'Downloads')
  if (!existsSync(dl)) return null
  const hits = (await readdir(dl)).filter((f) => /complock.*\.zip$/i.test(f))
  return hits.length ? join(dl, hits.sort().reverse()[0]) : null
}

const unzip = (zip: string, dest: string) => new Promise<void>((res, rej) =>
  execFile(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zip, '-C', dest], { windowsHide: true }, (e) => (e ? rej(new Error('Could not open that zip.')) : res())))

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

/** Copies every pak a CompLock zip names in its mods.txt files into VEIL's folder. Returns the keys found. */
export async function importZip(zip: string): Promise<string[]> {
  const tmp = await mkdtemp(join(tmpdir(), 'veil-cl-'))
  try {
    await unzip(zip, tmp)
    const files = await walk(tmp)
    await mkdir(join(localDir, 'complock'), { recursive: true })
    const keys = new Set<string>()
    for (const list of files.filter((f) => /mods\.txt$/i.test(f))) {
      const dir = list.slice(0, -'mods.txt'.length)
      for (const line of (await readFile(list, 'utf8')).split(/\r?\n/)) {
        const m = line.match(/^(pak\d+_dir\.vpk)\s+.+\((\w+\.vpk)\)\s*$/i)
        if (!m || keys.has(m[2])) continue
        const src = join(dir, m[1])
        if (!existsSync(src)) continue
        await copyFile(src, localPath(m[2]))
        keys.add(m[2])
      }
    }
    if (!keys.size) throw new Error('That zip has no CompLock mods.txt, so VEIL can’t tell which pak is which.')
    return [...keys]
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
