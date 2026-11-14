// Hero names, colours, art and 3D models from the community Deadlock API (api.deadlock-api.com), which serves
// the game's own assets. Cached for a day; without a connection the app falls back to a drawn silhouette.
import { useEffect, useState } from 'react'

export type Hero = { id: string; name: string; color: string; card?: string; icon?: string; background?: string; nameSvg?: string; model?: string }

const URL_ = 'https://api.deadlock-api.com/v1/assets/heroes?only_active=true'
const KEY = 'veil.heroes.v2'

const pick = (imgs: Record<string, unknown> | undefined, keys: string[]) => {
  if (!imgs) return undefined
  for (const k of keys) if (typeof imgs[k] === 'string') return imgs[k] as string
  return undefined
}
const rgb = (c: unknown) => (Array.isArray(c) && c.length >= 3 ? `#${c.slice(0, 3).map((v: number) => v.toString(16).padStart(2, '0')).join('')}` : undefined)

function normalise(raw: any[]): Hero[] {
  return raw
    .filter((h) => h && h.name && h.player_selectable && !h.disabled && !h.in_development)
    .map((h) => ({
      id: String(h.class_name ?? h.id),
      name: String(h.name),
      color: rgb(h.colors?.ui) ?? h.colors?.style_hex ?? '#d4a855',
      card: pick(h.images, ['icon_hero_card_webp', 'icon_hero_card']),
      icon: pick(h.images, ['icon_image_small_webp', 'icon_image_small']),
      background: pick(h.images, ['background_image_webp', 'background_image']),
      nameSvg: pick(h.images, ['name_image']),
      model: typeof h.models?.hero_select === 'string' ? h.models.hero_select : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

let memo: Hero[] | null = null
let inflight: Promise<Hero[]> | null = null

export function loadHeroes(): Promise<Hero[]> {
  if (memo) return Promise.resolve(memo)
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (cached && Date.now() - cached.t < 86_400_000 && cached.h.length) return Promise.resolve((memo = cached.h as Hero[]))
  } catch {}
  return (inflight ??= fetch(URL_)
    .then((r) => { if (!r.ok) throw new Error(`Hero list: HTTP ${r.status}`); return r.json() })
    .then((j) => {
      memo = normalise(j)
      try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), h: memo })) } catch {}
      return memo
    })
    .finally(() => { inflight = null }))
}

export function useHeroes() {
  const [heroes, setHeroes] = useState<Hero[]>(memo ?? [])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    loadHeroes().then((h) => live && setHeroes(h)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])
  return { heroes, failed }
}
