import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { byId, MODS, type Gain } from '../data/mods'
import { CVARS } from '../data/cvars'
import { ALL as XH_ALL, toCvars, type XSpec } from './crosshair'
import type { GameStatus } from './api'

export type Page = 'lobby' | 'mods' | 'forge' | 'crosshair' | 'sound' | 'console' | 'install'

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
}
export const DEFAULT_CROSS: Crosshair = { r: 255, g: 255, b: 255, gap: 4, width: 2, height: 16, opacity: 0.5, outline: 0.7, dot: 4, dotOpacity: 0.7, heroReticles: true, hitMarker: 0.1 }

const defaultsOn = Object.fromEntries(MODS.filter((m) => m.locked || ['particles', 'soundcap', 'fps', 'reflex'].includes(m.id)).map((m) => [m.id, true]))
const defaultsOpt: Record<string, string> = { hudpp: 'hidden', gameinfo: 'fov-complock', particles: 'stock', reflex: 'on', renderscale: '100' }

let toastTimer: ReturnType<typeof setTimeout> | undefined

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
      status: null,
      toast: null,
      set: (p) => set(p),
      toggle: (id) => { if (!byId[id]?.locked) set({ on: { ...get().on, [id]: !get().on[id] } }) },
      pick: (id, o) => set({ opt: { ...get().opt, [id]: o }, on: { ...get().on, [id]: true } }),
      setBar: (p) => set({ bar: { ...get().bar, ...p } }),
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
      partialize: ({ page, on, opt, bar, cross, xh, xhSaved, xhMode, damageMode, showHealthValue, verticalBars, side, hero, custom }) => ({ page, on, opt, bar, cross, xh, xhSaved, xhMode, damageMode, showHealthValue, verticalBars, side, hero, custom }),
      version: 2,
      migrate: (old: any) => ({ ...old, page: old?.page === 'forge' ? 'forge' : 'lobby' }),
    },
  ),
)

const CFG_ONLY = new Set(CVARS.filter((v) => v.via === 'cfg').map((v) => v.name))
const fmtNum =(n: number) => String(Math.round(n * 1000) / 1000)

/** Everything the current choices add up to: what gets written, and the estimated gain of the measured parts. */
export function computePack(s: Pick<State, 'on' | 'opt' | 'cross' | 'xh' | 'bar' | 'damageMode' | 'verticalBars' | 'custom'>) {
  const convars: Record<string, string> = {}
  const autoexec: Record<string, string> = {}
  let avg = 1, low = 1
  const items: { id: string; name: string; note?: string; gain?: Gain; pak?: boolean }[] = []
  for (const m of MODS) {
    if (!s.on[m.id]) continue
    const o = m.options?.find((x) => x.id === s.opt[m.id]) ?? m.options?.[0]
    const g = o?.gain ?? m.gain
    if (m.id === 'hudpp') {
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
