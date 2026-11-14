// The mod catalogue.
// "complock" entries are the CompLock set by HoppCX and jcStani (deadlockconfig.com): their numbers come from
// their published benchmarks and their images are loaded from their site. Their paks are theirs: VEIL links to
// the download and installs the file you pick. "veil" entries are plain cvar tweaks VEIL writes itself; they
// have not been benchmarked, so they carry an impact estimate instead of a number.

const CL = 'https://deadlockconfig.com/docs/img/'

export type Gain = { avg: number; low: number }
export type Option = { id: string; label: string; note?: string; gain?: Gain; convars?: Record<string, string>; autoexec?: Record<string, string> }
export type Shot = { src: string; caption: string; video?: boolean }

export type Mod = {
  id: string
  name: string
  group: 'engine' | 'effects' | 'visibility' | 'hud' | 'tweaks'
  source: 'complock' | 'veil'
  author?: string
  blurb: string
  detail: string
  gain?: Gain
  impact?: 'small' | 'medium' | 'large'
  size?: string
  locked?: boolean
  pak?: boolean
  gameinfo?: boolean
  conflicts?: string
  before?: string
  after?: string
  shots?: Shot[]
  options?: Option[]
  convars?: Record<string, string>
  autoexec?: Record<string, string>
}

export const GROUPS: Record<Mod['group'], { name: string; line: string }> = {
  hud: { name: 'HUD', line: 'Always part of the pack.' },
  engine: { name: 'Engine', line: 'Less work per frame. Nothing looks or sounds different.' },
  effects: { name: 'Effects and map', line: 'Less to draw. These change how the game looks.' },
  visibility: { name: 'Visibility', line: 'Easier to read in a fight.' },
  tweaks: { name: 'VEIL tweaks', line: 'Single settings VEIL writes for you. Not benchmarked yet.' },
}

export const MODS: Mod[] = [
  {
    id: 'hudpp', name: 'HUD++', group: 'hud', source: 'complock', author: 'jcStani', locked: true, pak: true, size: '800 KB',
    blurb: 'A cleaner HUD that costs less to draw.',
    detail: 'Cooldowns in seconds, team souls with the gap between teams, boss and powerup timers, and a choice of how damage numbers show.',
    gain: { avg: 3.8, low: 5.2 },
    shots: [
      { src: CL + 'hudpp/top-bar-6844.webp', caption: 'Ult cooldowns and respawn timers in seconds, team souls and the gap' },
      { src: CL + 'hudpp/abilities.webp', caption: 'Ability cooldowns in seconds' },
      { src: CL + 'hudpp/items.webp', caption: 'Item cooldowns in seconds' },
      { src: CL + 'hudpp/minimap.webp', caption: 'Clean minimap with powerup timers' },
      { src: CL + 'hudpp/midboss-6844.webp', caption: 'Mid boss buff timer under the souls' },
      { src: CL + 'hudpp/damage-total.webp', caption: 'Running damage total next to the enemy bar' },
    ],
    options: [
      { id: 'vanilla', label: 'Vanilla damage', note: 'Each hit shows its own number.' },
      { id: 'cumulative', label: 'Cumulative damage', note: 'One running total per target.', gain: { avg: 1.8, low: 3.0 } },
      { id: 'hidden', label: 'Hidden damage', note: 'No numbers at all.', gain: { avg: 2.8, low: 5.4 } },
    ],
  },
  {
    id: 'gameinfo', name: 'Engine settings', group: 'engine', source: 'complock', author: 'HoppCX', locked: true, gameinfo: true,
    blurb: 'CompLock’s gameinfo.gi: the biggest single gain.',
    detail: 'Engine values tuned for frame time, fog off, and a wider field of view. Install CompLock’s gameinfo.gi from their pack; VEIL keeps a backup of yours and writes your field of view and tweaks on top.',
    gain: { avg: 24.1, low: 18.0 },
    before: CL + 'pack/fov-fight.webp',
    options: [
      { id: 'fov-stock', label: 'Stock FOV', note: 'Your screen’s aspect ratio.', convars: { r_aspectratio: '0' } },
      { id: 'fov-complock', label: '116°', note: '+10° over stock. r_aspectratio 2.15', convars: { r_aspectratio: '2.15' } },
      { id: 'fov-wide', label: 'Widest', note: 'r_aspectratio 2.4', convars: { r_aspectratio: '2.4' } },
    ],
  },
  {
    id: 'cloth', name: 'Cloth simulation off', group: 'engine', source: 'complock', author: 'HoppCX', pak: true,
    blurb: 'Coats, capes and skirts removed from the 17 heroes that have them.',
    detail: 'The pak swaps the cloth meshes out and VEIL turns cloth_update off, so nothing is simulated.',
    conflicts: 'Not compatible with other mods that replace hero models.',
    gain: { avg: 4.0, low: 3.7 },
    before: CL + 'pack/cloth-before.webp', after: CL + 'pack/cloth-after.webp',
    convars: { cloth_update: 'false' },
  },
  {
    id: 'physics', name: 'Client physics off', group: 'engine', source: 'complock', author: 'HoppCX',
    blurb: 'No ragdolls or loose props on your side.',
    detail: 'Sets cl_phys_enabled false and cl_disable_ragdolls true. Can break how Doorman’s ultimate looks.',
    gain: { avg: 2.6, low: 0.8 },
    convars: { cl_phys_enabled: 'false', cl_disable_ragdolls: 'true' },
  },
  {
    id: 'soundcap', name: 'Sound stack update cap', group: 'engine', source: 'complock', author: 'HoppCX', pak: true, size: '7.4 KB',
    blurb: 'Playing sounds update about 60 times a second instead of every frame.',
    detail: 'At high frame rates the sound system was updating every frame. Capping it frees the main thread with no audible change.',
    gain: { avg: 6.7, low: 6.3 },
  },
  {
    id: 'particles', name: 'Particle Pruning', group: 'effects', source: 'complock', author: 'HoppCX', pak: true, size: '2.3 MB',
    blurb: 'Effects keep their shapes and warnings, without the glow, smoke and sparks.',
    detail: 'Every ability stays readable. What goes is the decoration around it.',
    gain: { avg: 8.4, low: 4.6 },
    before: CL + 'particles-before.webp', after: CL + 'particles-after.webp',
    options: [
      { id: 'stock', label: 'Stock tracers and hit effects', note: 'As in the game, without the blood and debris.', gain: { avg: 8.4, low: 4.6 } },
      { id: 'reduced', label: 'Reduced tracers and hit effects', note: 'Fainter tracers. No impacts, blood or headshot effects.', gain: { avg: 10.1, low: 5.5 } },
    ],
  },
  {
    id: 'lowmap', name: 'Low detail map', group: 'effects', source: 'complock', author: 'HoppCX', pak: true,
    blurb: '414 textures and 676 materials swapped for low-detail versions.',
    detail: 'Mostly helps when your graphics card is the limit.',
    gain: { avg: 3.8, low: 0 },
    before: CL + 'pack/street-stock.webp', after: CL + 'pack/lowdetailmap-after.webp',
  },
  {
    id: 'lighting', name: 'Brighter lighting', group: 'effects', source: 'complock', author: 'HoppCX', pak: true,
    blurb: 'A brighter, flatter image.',
    detail: 'No vignette or base bloom, and no lamp, storm or street light glow.',
    gain: { avg: 2.9, low: 0 },
    before: CL + 'pack/street-stock.webp', after: CL + 'pack/lighting-after.webp',
  },
  {
    id: 'hpbars', name: 'jcStani’s HP Bars', group: 'visibility', source: 'complock', author: 'jcStani', pak: true,
    blurb: 'Flat hero health bars, stamina as dots, debuffs above the number.',
    detail: 'Design your own version in the Forge and preview it on a hero before you install.',
    after: CL + 'hp-bars.webp',
  },

  // VEIL tweaks
  { id: 'fps', name: 'Uncapped frame rate', group: 'tweaks', source: 'veil', impact: 'large', blurb: 'Removes the 400 FPS cap in game, caps menus at 60.', detail: 'fps_max 0 lifts the in-game cap; fps_max_ui 60 stops the menu from heating your PC for nothing.', autoexec: { fps_max: '0', fps_max_ui: '60' } },
  { id: 'reflex', name: 'Low latency mode', group: 'tweaks', source: 'veil', impact: 'small', blurb: 'NVIDIA Reflex or AMD Anti-Lag 2.', detail: 'Lower input delay. Boost (2) keeps NVIDIA clocks up and only exists on NVIDIA.', convars: { r_low_latency: '1' }, options: [ { id: 'on', label: 'On', convars: { r_low_latency: '1' } }, { id: 'boost', label: 'On with boost', note: 'NVIDIA only', convars: { r_low_latency: '2' } } ] },
  { id: 'fog', name: 'Low volumetric fog', group: 'tweaks', source: 'veil', impact: 'medium', blurb: 'Fog drawn at low resolution with fewer slices.', detail: 'r_citadel_fog_quality 0 and volume_fog_depth 48. The fog stays, it just costs less.', convars: { r_citadel_fog_quality: '0', volume_fog_depth: '48' } },
  { id: 'dof', name: 'Depth of field off', group: 'tweaks', source: 'veil', impact: 'small', blurb: 'Everything stays sharp.', detail: 'r_depth_of_field false. No camera-lens blur away from the focus.', convars: { r_depth_of_field: 'false' } },
  { id: 'ssao', name: 'Ambient occlusion off', group: 'tweaks', source: 'veil', impact: 'medium', blurb: 'No soft contact shadows in creases.', detail: 'r_citadel_ssao_quality 0. A real GPU saving with a flatter look.', convars: { r_citadel_ssao_quality: '0' } },
  { id: 'shadows', name: 'Low shadows', group: 'tweaks', source: 'veil', impact: 'medium', blurb: 'Shadow quality on low.', detail: 'r_citadel_shadow_quality 0. Shadows stay, at a lower resolution.', convars: { r_citadel_shadow_quality: '0' } },
  { id: 'particledetail', name: 'Particle detail cap', group: 'tweaks', source: 'veil', impact: 'medium', blurb: 'Skips the most detailed parts of effects.', detail: 'r_particle_max_detail_level 1. Stacks with Particle Pruning.', convars: { r_particle_max_detail_level: '1' } },
  { id: 'bloom', name: 'Effects out of bloom', group: 'tweaks', source: 'veil', impact: 'small', blurb: 'Effects stop drawing into the glow buffer.', detail: 'r_effects_bloom false. Abilities glow less in busy fights.', convars: { r_effects_bloom: 'false' } },
  { id: 'ragdolls', name: 'Fewer ragdolls', group: 'tweaks', source: 'veil', impact: 'small', blurb: 'At most 4 bodies on screen.', detail: 'cl_ragdoll_limit 4. The lighter choice if you keep client physics on.', autoexec: { cl_ragdoll_limit: '4' } },
  { id: 'textures', name: 'Lower texture detail', group: 'tweaks', source: 'veil', impact: 'small', blurb: 'One mip level down: half the texture resolution.', detail: 'r_texture_stream_mip_bias 1. Helps on cards with little video memory.', convars: { r_texture_stream_mip_bias: '1' } },
  { id: 'renderscale', name: 'Render scale', group: 'tweaks', source: 'veil', impact: 'large', blurb: 'Draw fewer pixels, upscale to your screen.', detail: 'mat_viewportscale. The biggest lever when your graphics card is the limit.', options: [ { id: '100', label: '100%', convars: { mat_viewportscale: '1' } }, { id: '85', label: '85%', convars: { mat_viewportscale: '0.85' } }, { id: '70', label: '70%', convars: { mat_viewportscale: '0.7' } }, { id: '50', label: '50%', convars: { mat_viewportscale: '0.5' } } ] },
]

export const byId = Object.fromEntries(MODS.map((m) => [m.id, m])) as Record<string, Mod>
export const COMPLOCK_URL = 'https://deadlockconfig.com/#build'
