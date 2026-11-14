import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { byId, MODS, type Gain } from '../data/mods'
import { CVARS } from '../data/cvars'
import { ALL as XH_ALL, toCvars, type XSpec } from './crosshair'
import type { GameStatus } from './api'

export type Page = 'lobby' | 'mods' | 'forge' | 'crosshair' | 'sound' | 'console' | 'install' | 'settings'
export type Prefs = { startPage: 'home' | 'last'; background: boolean; reduceMotion: boolean }

export type BarStyle = 'flat' | 'ticks' | 'slim' | 'bold' | 'block' | 'outline' | 'classic' | 'neon' | 'minimal'
export type Bar = {
  style: BarStyle
  width: number
  height: number
  enemy: string
  ally: string
  back: string
  showNumber: boolean
  numberSize: number
  numberPos: 'above' | 'inside' | 'left'
  stamina: boolean
  staminaCount: number
  debuffs: boolean
  glow: boolean
  ult: { show: boolean; pos: 'left' | 'right' | 'above' | 'below'; style: 'dot' | 'ring' | 'icon' | 'text'; color: string; size: number }
}
export type Crosshair = { r: number; g: number; b: number; gap: number; width: number; height: number; opacity: number; outline: number; dot: number; dotOpacity: number; heroReticles: boolean; hitMarker: number }

type State = {
  page: Page
  on: Record<string, boolean>
  opt: Record<string, string>
  bar: Bar
  cross: Crosshair
  xh: XSpec
  xhSaved: XSpec[]
  xhMode: 'game' | 'overlay'
  damageMode: 0 | 1 | 2
  showHealthValue: boolean
  verticalBars: boolean
  side: 'enemy' | 'ally'
  hero: string | null
  custom: Record<string, string>
  installed: string[]
  prefs: Prefs
  status: GameStatus | null
  toast: { text: string; tone: 'ok' | 'bad' } | null
  set: (p: Partial<State>) => void
  toggle: (id: string) => void
  pick: (id: string, opt: string) => void
  setBar: (p: Partial<Bar>) => void
  setCross: (p: Partial<Crosshair>) => void
  setXh: (p: Partial<XSpec>) => void
  setCustom: (name: string, value: string | null) => void
  say: (text: string, tone?: 'ok' | 'bad') => void
}

export const DEFAULT_BAR: Bar = {
  style: 'flat', width: 120, height: 10, enemy: '#f0524f', ally: '#5fe0c4', back: '#0d0d0f', showNumber: true, numberSize: 15,
  numberPos: 'above', stamina: true, staminaCount: 3, debuffs: true, glow: true,
  ult: { show: true, pos: 'right', style: 'icon', color: '#f2c14e', size: 12 },
}
export const DEFAULT_CROSS: Crosshair = { r: 255, g: 255, b: 255, gap: 4, width: 2, height: 16, opacity: 0.5, outline: 0.7, dot: 4, dotOpacity: 0.7, heroReticles: true, hitMarker: 0.1 }

const defaultsOn = Object.fromEntries(['veilhud', 'fps', 'reflex', 'fog', 'particledetail'].map((id) => [id, true]))
const defaultsOpt: Record<string, string> = { hudpp: 'hidden', gameinfo: 'fov-complock', particles: 'stock', reflex: 'on', renderscale: '100' }

let toastTimer: ReturnType<typeof setTimeout> | undefined

/** Turns a mod on and every mod it excludes off (e.g. VEIL HUD and HUD++ replace the same HUD files). */
function switchOn(prev: Record<string, boolean>, id: string): { on: Record<string, boolean>; off: string[] } {
  const on = { ...prev, [id]: true }
  const off = (byId[id]?.excludes ?? []).filter((x) => on[x])
  for (const x of off) on[x] = false
  return { on, off }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      page: 'lobby',
      on: defaultsOn,
      opt: defaultsOpt,
      bar: DEFAULT_BAR,
      cross: DEFAULT_CROSS,
      xh: structuredClone(XH_ALL[0]),
      xhSaved: [],
      xhMode: 'game',
      damageMode: 0,
      showHealthValue: true,
      verticalBars: false,
      side: 'enemy',
      hero: null,
      custom: {},
      installed: [],
      prefs: { startPage: 'home', background: true, reduceMotion: false },
      status: null,
      toast: null,
      set: (p) => set(p),
      toggle: (id) => {
        const m = byId[id]
        if (!m || m.locked) return
        if (get().on[id]) { set({ on: { ...get().on, [id]: false } }); return }
        const { on, off } = switchOn(get().on, id)
        set({ on })
        if (off.length) get().say(`${m.name} and ${off.map((x) => byId[x].name).join(', ')} replace the same part of the HUD, so ${off.map((x) => byId[x].name).join(', ')} is now off.`)
      },
      pick: (id, o) => set({ opt: { ...get().opt, [id]: o }, on: switchOn(get().on, id).on }),
      setBar: (p) => set({ bar: { ...DEFAULT_BAR, ...get().bar, ...p } }),
      setCross: (p) => set({ cross: { ...get().cross, ...p } }),
      setXh: (p) => set({ xh: { ...get().xh, ...p } }),
      setCustom: (name, value) => {
        const custom = { ...get().custom }
        if (value === null) delete custom[name]
        else custom[name] = value
        set({ custom })
      },
      say: (text, tone = 'ok') => {
        clearTimeout(toastTimer)
        set({ toast: { text, tone } })
        toastTimer = setTimeout(() => set({ toast: null }), 3600)
      },
    }),
    {
      name: 'veil',
      partialize: ({ page, on, opt, bar, cross, xh, xhSaved, xhMode, damageMode, showHealthValue, verticalBars, side, hero, custom, prefs }) => ({ page, on, opt, bar, cross, xh, xhSaved, xhMode, damageMode, showHealthValue, verticalBars, side, hero, custom, prefs }),
      onRehydrateStorage: () => (st) => { if (st && st.prefs?.startPage !== 'last') st.page = 'lobby' },
      version: 4,
      // a saved config from before VEIL HUD and HUD++ excluded each other may have both on: keep VEIL HUD
      merge: (saved: any, current) => {
        const on: Record<string, boolean> = { ...current.on, ...(saved?.on ?? {}) }
        // first in the catalogue wins (VEIL HUD before HUD++ and HP Bars)
        for (const m of MODS) if (on[m.id]) for (const x of m.excludes ?? []) on[x] = false
        return { ...current, ...saved, on }
      },
      migrate: (old: any) => ({ ...old, on: { ...(old?.on ?? {}), veilhud: true, hudpp: false, gameinfo: false }, page: 'lobby', bar: { ...DEFAULT_BAR, ...(old?.bar ?? {}) }, xh: old?.xh ? { ...old.xh, lines: { lengthV: null, ...old.xh.lines } } : old?.xh }),
    },
  ),
)

const CFG_ONLY = new Set(CVARS.filter((v) => v.via === 'cfg').map((v) => v.name))
const fmtNum =(n: number) => String(Math.round(n * 1000) / 1000)

/** Everything the current choices add up to: what gets written, and the estimated gain of the measured parts. */
/** Whether an external (CompLock) mod's pak is actually in the game, from the last scan. */
export const isInstalled = (m: { match?: string }, installed: string[]) => !!m.match && installed.some((n) => n.toLowerCase().includes(m.match!.toLowerCase()))
/** A mod can be used unless it needs a CompLock file (pak or gameinfo.gi) that isn't in the game. */
export const available = (m: { source: string; pak?: boolean; gameinfo?: boolean; match?: string; cl?: unknown }, installed: string[]) =>
  !(m.source === 'complock' && m.pak && !m.cl) || isInstalled(m, installed)

/** The CompLock pack files the current choices need. */
export function clWanted(s: Pick<State, 'on' | 'opt'>): string[] {
  const out: string[] = []
  for (const m of MODS) {
    if (!s.on[m.id] || !m.cl) continue
    if (typeof m.cl === 'string') out.push(m.cl)
    else {
      const o = s.opt[m.id] ?? m.options?.[0]?.id ?? ''
      const f = m.cl[o] ?? Object.values(m.cl)[0]
      if (f) out.push(f)
    }
  }
  return out
}

export function computePack(s: Pick<State, 'on' | 'opt' | 'cross' | 'xh' | 'bar' | 'damageMode' | 'verticalBars' | 'custom'> & { installed?: string[] }) {
  const convars: Record<string, string> = {}
  const autoexec: Record<string, string> = {}
  let avg = 1, low = 1
  const items: { id: string; name: string; note?: string; gain?: Gain; pak?: boolean }[] = []
  for (const m of MODS) {
    if (!s.on[m.id]) continue
    const o = m.options?.find((x) => x.id === s.opt[m.id]) ?? m.options?.[0]
    // measured gains only count for external paks that are really installed
    const live = available(m, s.installed ?? [])
    if (!live) continue // its file isn't in the game, so neither its values nor its gain apply
    const g = live ? (o?.gain ?? m.gain) : undefined
    if (m.id === 'hudpp' && live) {
      // HUD++ itself, plus the measured effect of the chosen damage number mode
      avg *= 1 + (m.gain!.avg / 100); low *= 1 + (m.gain!.low / 100)
      if (o?.gain) { avg *= 1 + o.gain.avg / 100; low *= 1 + o.gain.low / 100 }
    } else if (g) { avg *= 1 + g.avg / 100; low *= 1 + g.low / 100 }
    Object.assign(convars, m.convars, o?.convars)
    Object.assign(autoexec, m.autoexec, o?.autoexec)
    items.push({ id: m.id, name: m.name, note: o?.label, gain: g, pak: m.pak })
  }
  const c = s.cross
  Object.assign(convars, {
    ...toCvars(s.xh),
    citadel_crosshair_disable_hero_specific_crosshairs: c.heroReticles ? 'false' : 'true',
    citadel_use_vertical_healthbars: s.verticalBars ? 'true' : 'false',
    r_citadel_glow_health_bars: s.bar.glow ? 'true' : 'false',
  })
  Object.assign(autoexec, {
    citadel_crosshair_hit_marker_duration: fmtNum(c.hitMarker),
    citadel_damage_text_cumulative_mode: String(s.damageMode),
    citadel_unit_status_show_health_value: s.bar.showNumber ? 'true' : 'false',
  })
  for (const [k, v] of Object.entries(s.custom)) (CFG_ONLY.has(k) ? autoexec : convars)[k] = v
  return { convars, autoexec, items, gain: { avg: (avg - 1) * 100, low: (low - 1) * 100 } }
}
