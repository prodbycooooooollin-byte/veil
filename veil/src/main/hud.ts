// VEIL HUD: turns the Forge design into Panorama CSS for hero health bars and builds it into an addon pak.
//
// The rules are appended to the game's own panorama/styles/unit_status_v2.vcss_c (see resource.ts), so the
// stock sheet keeps working for everything VEIL doesn't touch. Only hero bars (.player) change; troopers,
// bosses and buildings stay stock. Sizes are in Panorama pixels at the game's default UI scale.

import { appendToData } from './resource'
import { extractFile, writeVpk } from './vpk'

export type HudBar = {
  style: 'flat' | 'ticks' | 'slim' | 'bold' | 'block' | 'outline' | 'classic' | 'neon' | 'minimal'
  width: number; height: number
  enemy: string; ally: string; back: string
  showNumber: boolean; numberSize: number; numberPos: 'above' | 'inside' | 'left'
  stamina: boolean; staminaCount: number
  debuffs: boolean
  glow: boolean
  ult: { show: boolean; pos: 'left' | 'right' | 'above' | 'below'; style: 'dot' | 'ring' | 'icon' | 'text'; color: string; size: number }
}

export const SHEET = 'panorama/styles/unit_status_v2.vcss_c'

const px = (n: number) => `${Math.round(n * 100) / 100}px`
/** All the ways the game nests team classes around .player, so a rule wins wherever the class sits. */
const team = (t: 'enemy' | 'friend', sel: string) => [`.player.${t} ${sel}`, `.player .${t} ${sel}`, `.${t} .player ${sel}`].join(',')

export function hudCss(b: HudBar): string {
  // Forge works in preview pixels; the game bar is a bit under half that size
  const slim = b.style === 'slim' || b.style === 'minimal'
  const W = b.width * 0.45
  const H = Math.max(2, b.height * 0.63 * (slim ? 0.55 : b.style === 'bold' ? 1.3 : 1))
  const top = 27.77, left = 13
  const radius = b.style === 'outline' ? H / 2 : b.style === 'classic' ? 1.5 : 0
  const fs = b.numberSize * 1.09
  const r: string[] = []
  const rule = (sel: string, body: Record<string, string>) => r.push(`${sel}{${Object.entries(body).map(([k, v]) => `${k}: ${v};`).join('')}}`)

  r.push('/* ---- VEIL HUD: hero health bars from the VEIL Forge ---- */')
  rule('.player #UnitStatus', { 'animation-name': 'none', overflow: 'noclip' })
  rule('.player #InfoHealthContainer', { overflow: 'noclip' })
  rule('.player #UnitHealthbarsContainer', { 'animation-name': 'none', 'pre-transform-scale2d': '1', overflow: 'noclip' })

  if (b.style !== 'classic') {
    rule('.player .UnitHealthbarContainer', {
      width: px(W), height: px(H), 'margin-top': px(top), 'margin-left': px(left), 'horizontal-align': 'center', 'vertical-align': 'top',
      'opacity-mask': 'url("s2r://panorama/images/masks/no_mask_png.vtex")', 'background-color': 'transparent', 'pre-transform-scale2d': '1',
    })
    // the stock critical-health state shifts the bar; keep it where the design puts it
    rule('.player.health_critical .ShowCriticalState .UnitHealthbarContainer,.player .health_critical .ShowCriticalState .UnitHealthbarContainer,.health_critical .player .ShowCriticalState .UnitHealthbarContainer', { 'margin-left': px(left) })
    rule('.player #UnitHealthbarInner', {
      width: px(W), height: px(H), margin: '0px', 'opacity-mask': 'url("s2r://panorama/images/masks/no_mask_png.vtex")',
      'background-color': b.style === 'outline' || b.style === 'minimal' ? 'transparent' : b.back,
      'border-radius': px(radius),
      ...(b.style === 'bold' ? { border: '1px solid #000000' } : {}),
      ...(b.style === 'outline' ? { border: '1.5px solid #ffffff80' } : {}),
    })
    rule('.player .healthbar_border', { visibility: 'collapse' })
    rule('.player #UnitHealthbarLines', b.style === 'ticks' || b.style === 'bold' || b.style === 'block'
      ? { width: px(W), height: px(H), margin: '0px', 'opacity-mask': 'url("s2r://panorama/images/masks/no_mask_png.vtex")', opacity: b.style === 'block' ? '1' : '0.7' }
      : { visibility: 'collapse' })
    if (b.style === 'block') rule('.player #UnitHealthbarLines .line_large,.player #UnitHealthbarLines .line_small', { 'background-color': b.back, height: px(H), width: '2px' })
    rule('.player #unit_healthbar_missing', { 'background-image': 'none', 'background-color': 'transparent' })
    rule('.player #unit_healthbar_lagging,.player #unit_healthbar_delta,.player #unit_healthbar_healing,.player #unit_healthbar_deferred', { 'background-image': 'none', 'background-color': '#FFFFFF' })
    rule('.player #unit_healthbar_lagging', { 'animation-name': 'none' })
    // The bar is a row of segments: current health (lagging), health just lost (delta), healing and
    // deferred damage. Each needs its own colour, and delta must stay hidden except while you are
    // dealing damage, or it covers the lost part and the bar looks like it never drops.
    rule('.player #unit_healthbar_healing', { 'wash-color': '#5FFF80' })
    rule('.player #unit_healthbar_deferred', { 'wash-color': '#E87F3D' })
    rule('.player #unit_healthbar_delta', { 'wash-color': '#F3EAD9', opacity: '0' })
    rule([team('enemy', '#unit_healthbar_delta'), team('friend', '#unit_healthbar_delta')].join(','), { 'wash-color': '#F3EAD9' })
    rule('.player .active_damage_by_local_player #unit_healthbar_delta,.active_damage_by_local_player .player #unit_healthbar_delta,.player.active_damage_by_local_player #unit_healthbar_delta', { opacity: '1' })
    rule('.player #unit_healthbar_bullet_shield', { 'background-color': '#38D9EC', 'box-shadow': 'none' })
    rule('.player #unit_healthbar_ratking_armor', { 'background-color': '#C7A674' })
    // glow goes on the bar's frame, never on the moving segments
    if (b.style === 'neon' || b.glow) {
      rule(team('enemy', '#UnitHealthbarInner'), { 'box-shadow': `${b.enemy}88 0px 0px ${b.style === 'neon' ? 6 : 3}px 0px` })
      rule(team('friend', '#UnitHealthbarInner'), { 'box-shadow': `${b.ally}88 0px 0px ${b.style === 'neon' ? 6 : 3}px 0px` })
    }
  }
  rule(team('enemy', '#unit_healthbar_lagging'), { 'wash-color': b.enemy })
  rule(team('friend', '#unit_healthbar_lagging'), { 'wash-color': b.ally })

  /*
   * Placement. Every part is horizontal-align: center, and Panorama centres a box in the space its margins
   * leave, so a margin moves it by HALF its size: to put a box's centre dx from the middle, give it a
   * margin of 2·dx on that side (hx). Vertically, margin-top is the plain distance from the part's origin.
   * The number and the ult icon share the bar's origin; the stamina row and the debuff row sit in a
   * container that starts STAMINA_ORIGIN px higher (measured against jcStani's HP Bars, which places stamina
   * at 101.59px to show it 2.5px under a bar at 27.77px). The layout mirrors the Forge preview (lib/hpbar.ts).
   */
  const STAMINA_ORIGIN = 65.2
  const hx = (dx: number) => (dx >= 0 ? { 'margin-left': px(2 * dx), 'margin-right': '0px' } : { 'margin-left': '0px', 'margin-right': px(-2 * dx) })
  const cx = left / 2 // the bar's centre after its own margin-left
  const barL = cx - W / 2, barR = cx + W / 2
  const fsUse = b.numberPos === 'inside' ? Math.min(fs, H + 3) : fs
  const numW = fsUse * 3 // wide enough for four digits; the text is aligned inside this box
  const numH = fsUse * 1.25
  const numTop = b.numberPos === 'above' ? top - numH + 1 : top + H / 2 - numH / 2
  const numCx = b.numberPos === 'inside' ? cx : b.numberPos === 'left' ? barL - 4 - numW / 2 : barL + numW / 2

  // health number
  if (!b.showNumber) rule('.player #UnitHealthbarValue', { visibility: 'collapse' })
  else {
    rule('.player #UnitHealthbarValue', {
      visibility: 'visible', opacity: '1', 'transition-property': 'none', transform: 'none', padding: '0px',
      width: px(numW), height: px(numH), 'margin-top': px(numTop), 'margin-bottom': '0px', ...hx(numCx),
      'text-align': b.numberPos === 'inside' ? 'center' : b.numberPos === 'left' ? 'right' : 'left',
      'horizontal-align': 'center', 'vertical-align': 'top', 'font-family': 'numericOracle', 'font-weight': 'bold',
      'font-size': px(fsUse), 'text-shadow': '0px 0px 1px 4.0 #000000', color: '#FFFFFF', 'wash-color': '#FFFFFF',
      'ui-scale': '100%',
    })
    // the stock sheet pushes ally numbers 20px aside; keep both sides where the design puts them
    rule(team('friend', '#UnitHealthbarValue'), { ...hx(numCx) })
  }
  const aboveTop = b.showNumber && b.numberPos === 'above' ? numTop : top // top of whatever sits above the bar

  // stamina pips under the bar, starting at its left edge
  if (!b.stamina) rule('.player #StaminaContainer', { visibility: 'collapse' })
  else {
    rule('.player #StaminaContainer', {
      'margin-top': px(STAMINA_ORIGIN + top + H + 2.5), 'margin-bottom': '0px', width: px(W), height: '5px', ...hx(cx),
      'horizontal-align': 'center', 'vertical-align': 'top', 'flow-children': 'right', transform: 'none', 'pre-transform-scale2d': '1',
    })
    rule('.player .StaminaPip', { margin: '0px 1.9px 0px 0px' })
    rule('.player .StaminaPip .StaminaPipIcon', { width: '5px', height: '5px', 'background-image': 'none', 'background-color': '#FFFFFF', 'border-radius': '50%' })
  }

  // debuffs right above the number (or the bar), the same 31.7px step HP Bars uses above its number
  rule('.player #StatusEffects', b.debuffs
    ? { 'margin-top': px(aboveTop + 31.74), 'margin-bottom': '0px', ...hx(cx), 'horizontal-align': 'center', 'vertical-align': 'top' }
    : { visibility: 'collapse' })

  // ultimate ready: the game already marks heroes with .has_ultimate; VEIL decides where and how it shows
  const u = b.ult
  if (!u.show) rule('.player .unit_info_panel', { visibility: 'collapse' })
  else {
    const s = u.size * 1.4
    const leftOfBar = barL - 3 - s / 2 - (b.showNumber && b.numberPos === 'left' ? numW + 4 : 0)
    const [ux, uy] = u.pos === 'left' ? [leftOfBar, top + H / 2 - s / 2]
      : u.pos === 'right' ? [barR + 3 + s / 2, top + H / 2 - s / 2]
      : u.pos === 'above' ? [barR - s / 2, aboveTop - s - 3]
      : [barR - s / 2, top + H + (b.stamina ? 10 : 3)]
    rule('.player .unit_info_panel', { visibility: 'visible', width: px(s), height: px(s), 'margin-top': px(uy), 'margin-bottom': '0px', ...hx(ux), 'horizontal-align': 'center', 'vertical-align': 'top', 'pre-transform-scale2d': '1', 'z-index': '21' })
    const shape: Record<string, string> = u.style === 'dot' ? { 'background-image': 'none', 'background-color': '#FFFFFF', 'border-radius': '50%' }
      : u.style === 'ring' ? { 'background-image': 'none', 'background-color': 'transparent', border: `2px solid #FFFFFF`, 'border-radius': '50%' }
      : {}
    rule('.player #unit_ult_ready_icon', { 'brightness': '1.6', ...shape })
    rule(team('enemy', '#unit_ult_ready_icon'), { 'wash-color': u.color })
    rule(team('friend', '#unit_ult_ready_icon'), { 'wash-color': u.color })
  }
  rule('.player #name,.player #AssassinateIndicator,.player #UnkillableIndicator', { visibility: 'collapse' })
  return r.join('')
}

/** Builds the VEIL HUD pak from the stock stylesheet in this game install. */
export async function buildHudPak(gameCitadel: string, bar: HudBar, version: string): Promise<Buffer> {
  const stock = await extractFile(`${gameCitadel}/pak01_dir.vpk`, SHEET)
  if (!stock) throw new Error('Could not find the game’s health bar stylesheet. Verify Deadlock in Steam and try again.')
  const sheet = appendToData(stock, Buffer.from(hudCss(bar), 'utf8'))
  const modinfo = Buffer.from(JSON.stringify({ name: 'VEIL HUD - VEIL', author: 'VEIL', version, description: 'Hero health bars designed in the VEIL Forge.' }, null, 2))
  return writeVpk([{ path: 'modinfo.json', data: modinfo }, { path: SHEET, data: sheet }])
}
