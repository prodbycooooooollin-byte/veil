// CompLock (deadlockconfig.com, by HoppCX and jcStani): download their paks and gameinfo.gi the way their own
// pack builder does. The site lists every file in a JSON block on its home page; each pak is served as raw
// deflate (split into pieces for big ones) and carries a CRC32, which VEIL checks before installing.
import { inflateRawSync, crc32 } from 'node:zlib'

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
