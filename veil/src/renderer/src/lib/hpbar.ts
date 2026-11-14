// Draws a hero health bar in one of the styles. Used for the 3D preview and the style thumbnails.
import type { Bar, BarStyle } from './store'

export const STYLES: { id: BarStyle; name: string }[] = [
  { id: 'flat', name: 'Flat' }, { id: 'ticks', name: 'Ticks' }, { id: 'slim', name: 'Slim' },
  { id: 'bold', name: 'Bold' }, { id: 'block', name: 'Block' }, { id: 'outline', name: 'Outline' },
  { id: 'classic', name: 'Classic' }, { id: 'neon', name: 'Neon' }, { id: 'minimal', name: 'Minimal' },
]

export type BarState = { hp: number; max: number; lag: number; stamina: number; debuffs: number; ult?: number }

function shade(hex: string, k: number) {
  const v = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((v >> s) & 255) * k)))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

/** Draws centred in a canvas of css size w×h at device ratio `dpr`. Returns nothing; pure drawing. */
export function drawBar(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, bar: Bar, side: 'enemy' | 'ally', st: BarState, opts: { vertical?: boolean; showNumber?: boolean } = {}) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const col = side === 'enemy' ? bar.enemy : bar.ally
  const style = bar.style
  const showNumber = (opts.showNumber ?? true) && bar.showNumber
  const bh = style === 'slim' || style === 'minimal' ? Math.max(3, bar.height * 0.5) : style === 'bold' ? bar.height * 1.35 : bar.height
  const bw = bar.width
  const cx = w / 2
  const numberH = showNumber && bar.numberPos === 'above' ? bar.numberSize + 4 : 0
  const debuffH = bar.debuffs && st.debuffs ? 14 : 0
  const staminaH = bar.stamina ? 9 : 0
  const total = debuffH + numberH + bh + staminaH
  let y = (h - total) / 2 + debuffH + numberH
  let x = cx - bw / 2
  if (showNumber && bar.numberPos === 'left') x += (bar.numberSize * 1.6) / 2

  ctx.save()
  if (opts.vertical) { ctx.translate(cx, h / 2); ctx.rotate(-Math.PI / 2); ctx.translate(-cx, -h / 2) }

  const f = Math.max(0, Math.min(1, st.hp / st.max))
  const lag = Math.max(f, Math.min(1, st.lag / st.max))
  const r = style === 'block' || style === 'bold' ? 1 : style === 'classic' ? 2 : style === 'outline' ? bh / 2 : 1.5

  const rect = (rx: number, ry: number, rw: number, rh: number, rr = r) => { ctx.beginPath(); ctx.roundRect(rx, ry, Math.max(0, rw), rh, Math.min(rr, rh / 2, rw / 2)) }

  // background
  if (style !== 'minimal' && style !== 'outline') {
    rect(x - (style === 'bold' ? 2 : 0), y - (style === 'bold' ? 2 : 0), bw + (style === 'bold' ? 4 : 0), bh + (style === 'bold' ? 4 : 0))
    ctx.fillStyle = style === 'bold' ? '#000' : bar.back
    ctx.globalAlpha = style === 'neon' ? 0.55 : 0.92
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (style === 'outline') { rect(x - 2, y - 2, bw + 4, bh + 4, (bh + 4) / 2); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke() }

  // damage lag (the part just lost)
  if (lag > f) { rect(x + bw * f, y, bw * (lag - f), bh, 0); ctx.fillStyle = '#f3ead9'; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1 }

  // fill
  if (style === 'block') {
    const seg = 10, gap = 2, sw = (bw - gap * (seg - 1)) / seg
    for (let i = 0; i < seg; i++) {
      const part = Math.max(0, Math.min(1, f * seg - i))
      if (part <= 0) break
      rect(x + i * (sw + gap), y, sw * part, bh, 0.5); ctx.fillStyle = col; ctx.fill()
    }
  } else {
    if (style === 'neon' || bar.glow) { ctx.shadowColor = col; ctx.shadowBlur = style === 'neon' ? 14 : 8 }
    rect(x, y, bw * f, bh)
    if (style === 'classic') {
      const g = ctx.createLinearGradient(0, y, 0, y + bh)
      g.addColorStop(0, shade(col, 1.35)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, 0.6))
      ctx.fillStyle = g
    } else ctx.fillStyle = col
    ctx.fill()
    ctx.shadowBlur = 0
    if (style === 'classic') { rect(x + 1, y + 1, bw * f - 2, Math.max(1, bh * 0.28), 1); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill() }
  }

  // ticks every 250 hp (thicker every 1000)
  if (style === 'ticks' || style === 'bold') {
    for (let v = 250; v < st.max; v += 250) {
      const tx = x + (v / st.max) * bw
      ctx.fillStyle = v % 1000 === 0 ? 'rgba(0,0,0,.75)' : 'rgba(0,0,0,.45)'
      ctx.fillRect(Math.round(tx), y + (v % 1000 === 0 ? 0 : bh * 0.45), 1, v % 1000 === 0 ? bh : bh * 0.55)
    }
  }
  if (style === 'bold') { rect(x, y, bw, bh); ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.lineWidth = 1; ctx.stroke() }

  // number
  if (showNumber) {
    const txt = String(Math.max(0, Math.round(st.hp)))
    ctx.font = `800 ${style === 'slim' || style === 'minimal' ? bar.numberSize * 0.85 : bar.numberSize}px "Archivo Variable", system-ui`
    ctx.fontStretch = 'expanded'
    ctx.textBaseline = 'alphabetic'
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.fillStyle = '#fff'
    let tx = x, ty = y - 4
    if (bar.numberPos === 'above') { ctx.textAlign = 'left'; tx = x + (bar.debuffs ? 0 : 0) }
    if (bar.numberPos === 'inside') { ctx.textAlign = 'center'; tx = x + bw / 2; ty = y + bh / 2 + bar.numberSize * 0.36; ctx.font = `800 ${Math.min(bar.numberSize, bh + 2)}px "Archivo Variable", system-ui` }
    if (bar.numberPos === 'left') { ctx.textAlign = 'right'; tx = x - 6; ty = y + bh / 2 + bar.numberSize * 0.36 }
    ctx.strokeText(txt, tx, ty); ctx.fillText(txt, tx, ty)
  }

  // debuffs: little diamonds right above the number line
  if (bar.debuffs && st.debuffs) {
    const dy = y - numberH - 8
    const colors = ['#b48cff', '#5fe0c4', '#f2c14e']
    for (let i = 0; i < st.debuffs; i++) {
      const dx = x + bw - 6 - i * 13
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.PI / 4)
      ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(-5, -5, 10, 10)
      ctx.fillStyle = colors[i % 3]; ctx.fillRect(-3.5, -3.5, 7, 7)
      ctx.restore()
    }
  }

  // ultimate: charge 0..1, lit when ready
  const u = bar.ult
  if (u?.show) {
    const charge = Math.max(0, Math.min(1, st.ult ?? 1)), ready = charge >= 1, r = u.size / 2
    let ux = x + bw + 6 + r, uy = y + bh / 2
    if (u.pos === 'left') ux = x - 6 - r - (showNumber && bar.numberPos === 'left' ? bar.numberSize * 1.9 : 0)
    if (u.pos === 'above') { ux = x + bw - r; uy = y - numberH - (bar.debuffs && st.debuffs ? 16 : 0) - r - 3 }
    if (u.pos === 'below') { ux = x + bw - r; uy = y + bh + r + 4 }
    const t = performance.now() / 1000
    ctx.save()
    if (ready) { ctx.shadowColor = u.color; ctx.shadowBlur = 8 + Math.sin(t * 5) * 4 }
    if (u.style === 'dot') {
      ctx.beginPath(); ctx.arc(ux, uy, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(ux, uy); ctx.arc(ux, uy, r - 1.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); ctx.closePath()
      ctx.fillStyle = ready ? u.color : 'rgba(243,234,217,.45)'; ctx.fill()
    } else if (u.style === 'ring') {
      ctx.lineWidth = Math.max(2, r * 0.35)
      ctx.beginPath(); ctx.arc(ux, uy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke()
      ctx.beginPath(); ctx.arc(ux, uy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); ctx.strokeStyle = ready ? u.color : 'rgba(243,234,217,.55)'; ctx.stroke()
    } else if (u.style === 'icon') {
      const d = r * 1.25
      const diamond = () => { ctx.beginPath(); ctx.moveTo(ux, uy - d); ctx.lineTo(ux + d * 0.8, uy); ctx.lineTo(ux, uy + d); ctx.lineTo(ux - d * 0.8, uy); ctx.closePath() }
      diamond(); ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fill()
      ctx.save(); diamond(); ctx.clip()
      ctx.fillStyle = ready ? u.color : 'rgba(243,234,217,.5)'
      ctx.fillRect(ux - d, uy + d - 2 * d * charge, d * 2, 2 * d * charge)
      ctx.restore()
      diamond(); ctx.lineWidth = 1.2; ctx.strokeStyle = ready ? '#fff' : 'rgba(243,234,217,.35)'; ctx.stroke()
    } else {
      ctx.font = `800 ${u.size}px "Archivo Variable", system-ui`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const label = ready ? 'ULT' : `${Math.round(charge * 100)}%`
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(label, ux + r * 0.4, uy)
      ctx.fillStyle = ready ? u.color : 'rgba(243,234,217,.6)'; ctx.fillText(label, ux + r * 0.4, uy)
    }
    ctx.restore()
  }

  // stamina dots under the bar
  if (bar.stamina) {
    const n = bar.staminaCount, sy = y + bh + 5.5
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(x + 3 + i * 9, sy, 2.6, 0, Math.PI * 2)
      ctx.fillStyle = i < st.stamina ? '#f3ead9' : 'rgba(243,234,217,.22)'
      ctx.fill()
    }
  }
  ctx.restore()
}
