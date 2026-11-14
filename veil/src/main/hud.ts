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
    rule('.player #unit_healthbar_lagging', { 'animation-name': 'none', 'border-radius': px(radius) })
  }
  rule(team('enemy', '#unit_healthbar_lagging'), { 'wash-color': b.enemy })
  rule(team('friend', '#unit_healthbar_lagging'), { 'wash-color': b.ally })
  if (b.style === 'neon' || (b.glow && b.style !== 'classic')) {
    rule(team('enemy', '#unit_healthbar_lagging'), { 'box-shadow': `${b.enemy}aa 0px 0px ${b.style === 'neon' ? 6 : 3}px 0px` })
    rule(team('friend', '#unit_healthbar_lagging'), { 'box-shadow': `${b.ally}aa 0px 0px ${b.style === 'neon' ? 6 : 3}px 0px` })
  }

  // health number
  if (!b.showNumber) rule('.player #UnitHealthbarValue', { visibility: 'collapse' })
  else {
    const pos = b.numberPos === 'inside' ? { margin: `${px(top + H / 2 - fs * 0.62)} 0px 0px ${px(left / 2)}`, 'text-align': 'center' }
      : b.numberPos === 'left' ? { margin: `${px(top + H / 2 - fs * 0.62)} 0px 0px ${px(left - W / 2 - fs * 1.4)}`, 'text-align': 'right' }
      : { margin: `${px(top - fs - 3.5)} 0px 0px ${px(left - W / 2 + fs * 1.3)}`, 'text-align': 'left' }
    rule('.player #UnitHealthbarValue', {
      visibility: 'visible', opacity: '1', 'transition-property': 'none', transform: 'none', padding: '0px',
      'horizontal-align': 'center', 'vertical-align': 'top', 'font-family': 'numericOracle', 'font-weight': 'bold',
      'font-size': px(fs), 'text-shadow': '0px 0px 1px 4.0 #000000', color: '#FFFFFF', 'wash-color': '#FFFFFF', ...pos,
    })
  }

  // stamina pips under the bar
  if (!b.stamina) rule('.player #StaminaContainer', { visibility: 'collapse' })
  else {
    rule('.player #StaminaContainer', { 'margin-top': px(top + H + 4), 'margin-left': px(left), width: px(W), 'horizontal-align': 'center', 'vertical-align': 'top', 'flow-children': 'right', transform: 'none' })
    rule('.player .StaminaPip', { margin: '0px 1.9px 0px 0px' })
    rule('.player .StaminaPip .StaminaPipIcon', { width: '5px', height: '5px', 'background-image': 'none', 'background-color': '#FFFFFF', 'border-radius': '50%' })
  }

  // debuffs sit right above the number line
  rule('.player #StatusEffects', b.debuffs ? { 'margin-top': px(top - fs - 18), 'horizontal-align': 'center', 'vertical-align': 'top' } : { visibility: 'collapse' })

  // ultimate ready: the game already marks heroes with .has_ultimate; VEIL decides where and how it shows
  const u = b.ult
  if (!u.show) rule('.player .unit_info_panel', { visibility: 'collapse' })
  else {
    const s = u.size * 1.4
    const m = u.pos === 'left' ? `${px(top + H / 2 - s / 2)} ${px(W / 2 + left + s * 0.7)} 0px 0px`
      : u.pos === 'right' ? `${px(top + H / 2 - s / 2)} 0px 0px ${px(W + left + s * 0.9)}`
      : u.pos === 'above' ? `${px(top - fs - s - 6)} 0px 0px ${px(W + left - s)}`
      : `${px(top + H + 9)} 0px 0px ${px(W + left - s)}`
    rule('.player .unit_info_panel', { visibility: 'visible', width: px(s), height: px(s), margin: m, 'horizontal-align': 'center', 'vertical-align': 'top', 'pre-transform-scale2d': '1', 'z-index': '21' })
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
