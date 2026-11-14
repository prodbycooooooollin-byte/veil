// Crosshair model. One spec draws both the in-app preview and the overlay window, as SVG.
// The parts the game itself can draw (four lines and a dot) also convert to citadel_crosshair_* cvars.

export type XSpec = {
  name: string
  color: string
  color2: string | null // gradient end, overlay only
  opacity: number
  scale: number
  outline: { on: boolean; width: number; color: string; opacity: number }
  glow: { on: boolean; size: number }
  lines: { on: boolean; length: number; thickness: number; gap: number; rotate: 0 | 45; tShape: boolean; taper: boolean; round: boolean }
  dot: { on: boolean; size: number; shape: 'circle' | 'square' | 'diamond' }
  ring: { on: boolean; radius: number; thickness: number; segments: number }
  brackets: { on: boolean; size: number; gap: number; thickness: number }
  chevron: { on: boolean; size: number; thickness: number; offset: number }
  motion: 'none' | 'pulse' | 'spin' | 'breathe'
}

export const BASE: XSpec = {
  name: 'Custom', color: '#ffffff', color2: null, opacity: 1, scale: 1,
  outline: { on: true, width: 1, color: '#000000', opacity: 0.7 },
  glow: { on: false, size: 6 },
  lines: { on: true, length: 8, thickness: 2, gap: 4, rotate: 0, tShape: false, taper: false, round: false },
  dot: { on: false, size: 3, shape: 'circle' },
  ring: { on: false, radius: 12, thickness: 1.5, segments: 0 },
  brackets: { on: false, size: 6, gap: 10, thickness: 2 },
  chevron: { on: false, size: 8, thickness: 2, offset: 10 },
  motion: 'none',
}

type Patch = { [K in keyof XSpec]?: XSpec[K] extends object ? Partial<XSpec[K]> : XSpec[K] }
export const make = (name: string, p: Patch): XSpec => {
  const out = structuredClone(BASE) as XSpec & Record<string, unknown>
  out.name = name
  for (const [k, v] of Object.entries(p)) {
    const cur = out[k]
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? { ...(cur as object), ...(v as object) } : v
  }
  return out
}

const off = { on: false }

export const LIBRARY: { group: string; items: XSpec[] }[] = [
  {
    group: 'Classic',
    items: [
      make('Stock', { opacity: 0.6, lines: { length: 16, thickness: 2, gap: 4 }, dot: { on: true, size: 4 } }),
      make('Tight', { lines: { length: 6, thickness: 2, gap: 2 } }),
      make('Plus', { lines: { length: 7, thickness: 2, gap: 0 } }),
      make('Plus dot', { lines: { length: 6, thickness: 2, gap: 4 }, dot: { on: true, size: 2, shape: 'square' } }),
      make('T-shape', { lines: { length: 8, thickness: 2, gap: 3, tShape: true }, dot: { on: true, size: 2, shape: 'square' } }),
      make('Pixel', { outline: off, lines: { length: 3, thickness: 1, gap: 2 }, dot: { on: true, size: 1, shape: 'square' } }),
      make('Long', { lines: { length: 14, thickness: 1, gap: 6 }, outline: { width: 1, opacity: 0.9 } }),
      make('Gap cross', { lines: { length: 10, thickness: 3, gap: 9 } }),
    ],
  },
  {
    group: 'Dots and rings',
    items: [
      make('Dot', { lines: off, dot: { on: true, size: 4 } }),
      make('Big dot', { lines: off, dot: { on: true, size: 7 }, outline: { width: 1.5 } }),
      make('Diamond', { lines: off, dot: { on: true, size: 6, shape: 'diamond' }, color: '#5fe0c4' }),
      make('Circle dot', { lines: off, dot: { on: true, size: 2 }, ring: { on: true, radius: 10, thickness: 1.5 } }),
      make('Ring', { lines: off, ring: { on: true, radius: 7, thickness: 2 } }),
      make('Segmented', { lines: off, dot: { on: true, size: 2 }, ring: { on: true, radius: 13, thickness: 2, segments: 4 } }),
      make('Shotgun', { lines: off, dot: { on: true, size: 2 }, ring: { on: true, radius: 34, thickness: 1.5, segments: 8 }, opacity: 0.85 }),
      make('Halo', { lines: { length: 5, thickness: 2, gap: 14 }, ring: { on: true, radius: 22, thickness: 1, segments: 0 }, opacity: 0.9 }),
    ],
  },
  {
    group: 'Shapes the game can’t draw',
    items: [
      make('X', { lines: { length: 7, thickness: 2, gap: 3, rotate: 45 } }),
      make('Tapered', { lines: { length: 11, thickness: 4, gap: 4, taper: true }, dot: { on: true, size: 2 } }),
      make('Brackets', { lines: off, dot: { on: true, size: 2 }, brackets: { on: true, size: 6, gap: 9, thickness: 2 } }),
      make('Chevron', { lines: off, chevron: { on: true, size: 9, thickness: 2.5, offset: 4 }, dot: { on: true, size: 2 } }),
      make('Sniper', { outline: { width: 1, opacity: 0.9 }, lines: { length: 40, thickness: 1, gap: 12 }, ring: { on: true, radius: 28, thickness: 1 }, dot: { on: true, size: 2 } }),
      make('Box', { lines: off, brackets: { on: true, size: 12, gap: 6, thickness: 1.5 }, dot: { on: true, size: 2, shape: 'square' } }),
      make('Rounded', { lines: { length: 8, thickness: 3, gap: 5, round: true }, dot: { on: true, size: 3 } }),
      make('Arrow', { lines: { length: 7, thickness: 2, gap: 4, tShape: true }, chevron: { on: true, size: 7, thickness: 2, offset: 12 } }),
    ],
  },
  {
    group: 'Signature',
    items: [
      make('Brass', { color: '#f0cf86', color2: '#b8862f', lines: { length: 8, thickness: 2, gap: 5 }, dot: { on: true, size: 4, shape: 'diamond' }, outline: { opacity: 0.85 } }),
      make('Spirit', { color: '#5fe0c4', glow: { on: true, size: 8 }, lines: off, dot: { on: true, size: 3 }, ring: { on: true, radius: 11, thickness: 1.5, segments: 3 }, motion: 'spin' }),
      make('Ember', { color: '#ff5a4f', color2: '#ffb36b', glow: { on: true, size: 7 }, lines: { length: 7, thickness: 2, gap: 4, rotate: 45 }, dot: { on: true, size: 3 }, motion: 'pulse' }),
      make('Neon', { color: '#2bd9ff', glow: { on: true, size: 10 }, outline: off, lines: { length: 9, thickness: 2, gap: 5, round: true }, dot: { on: true, size: 2 } }),
      make('Veil', { color: '#ede4d3', color2: '#d4a855', lines: off, chevron: { on: true, size: 10, thickness: 2.5, offset: 2 }, dot: { on: true, size: 4, shape: 'diamond' }, ring: { on: true, radius: 18, thickness: 1, segments: 2 }, motion: 'breathe' }),
      make('Toxic', { color: '#9cff7a', glow: { on: true, size: 6 }, lines: { length: 6, thickness: 2, gap: 3, taper: true }, ring: { on: true, radius: 9, thickness: 1 } }),
      make('Violet', { color: '#b48cff', color2: '#f59ac1', lines: { length: 9, thickness: 2, gap: 6 }, brackets: { on: true, size: 5, gap: 14, thickness: 1.5 } }),
      make('Ghost', { opacity: 0.45, outline: off, lines: { length: 10, thickness: 1, gap: 6 }, dot: { on: true, size: 2 } }),
    ],
  },
]

export const ALL = LIBRARY.flatMap((g) => g.items)

/** What the in-game crosshair can show of this spec, and what it can't. */
export function gameFit(s: XSpec): { ok: boolean; lost: string[] } {
  const lost: string[] = []
  if (s.ring.on) lost.push('ring')
  if (s.brackets.on) lost.push('brackets')
  if (s.chevron.on) lost.push('chevron')
  if (s.lines.on && s.lines.rotate) lost.push('45° lines')
  if (s.lines.on && s.lines.tShape) lost.push('T-shape')
  if (s.lines.on && s.lines.taper) lost.push('tapered lines')
  if (s.lines.on && s.lines.round) lost.push('rounded ends')
  if (s.dot.on && s.dot.shape !== 'circle') lost.push(`${s.dot.shape} dot`)
  if (s.color2) lost.push('gradient')
  if (s.glow.on) lost.push('glow')
  if (s.motion !== 'none') lost.push('motion')
  return { ok: lost.length === 0, lost }
}

const hexRgb = (h: string) => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255] }

/** The citadel_crosshair_* values for the parts the game can draw. */
export function toCvars(s: XSpec): Record<string, string> {
  const [r, g, b] = hexRgb(s.color)
  const n = (v: number) => String(Math.round(v * 100) / 100)
  return {
    citadel_crosshair_color_r: String(r), citadel_crosshair_color_g: String(g), citadel_crosshair_color_b: String(b),
    citadel_crosshair_pip_gap: n(s.lines.gap), citadel_crosshair_pip_width: n(s.lines.on ? s.lines.thickness : 0),
    citadel_crosshair_pip_height: n(s.lines.on ? s.lines.length : 0), citadel_crosshair_pip_opacity: n(s.lines.on ? s.opacity : 0),
    citadel_crosshair_pip_outline_opacity: n(s.outline.on ? s.outline.opacity : 0),
    citadel_crosshair_dot_size: n(s.dot.on ? s.dot.size : 0), citadel_crosshair_dot_opacity: n(s.dot.on ? s.opacity : 0),
    citadel_crosshair_dot_outline_opacity: n(s.outline.on ? s.outline.opacity : 0),
  }
}

/** Furthest point the spec draws from the centre, in units. */
export function extent(s: XSpec): number {
  return Math.max(
    s.lines.on ? s.lines.gap + s.lines.length : 0, s.dot.on ? s.dot.size : 0, s.ring.on ? s.ring.radius + s.ring.thickness : 0,
    s.brackets.on ? s.brackets.gap + s.brackets.size : 0, s.chevron.on ? s.chevron.offset + s.chevron.size : 0, 4,
  )
}
