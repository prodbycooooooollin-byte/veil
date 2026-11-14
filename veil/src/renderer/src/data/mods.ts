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
  group: 'engine' | 'effects' | 'visibility' | 'hud' | 'potato' | 'tweaks'
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
  match?: string
  /** CompLock pack file(s) VEIL downloads for this mod; per option id when it has variants */
  cl?: string | Record<string, string>
  /** mods that change the same game file; only one of them can be on */
  excludes?: string[]
  conflicts?: string
  before?: string
  after?: string
  shots?: Shot[]
  options?: Option[]
  convars?: Record<string, string>
  autoexec?: Record<string, string>
  /** how to reach it inside Deadlock, if it has anything to open there */
  ingame?: string
}

export const GROUPS: Record<Mod['group'], { name: string; line: string }> = {
  hud: { name: 'HUD', line: 'What you see over heroes.' },
  engine: { name: 'Engine', line: 'Less work per frame. Nothing looks or sounds different.' },
  effects: { name: 'Effects and map', line: 'Less to draw. These change how the game looks.' },
  visibility: { name: 'Visibility', line: 'Easier to read in a fight.' },
  potato: { name: 'Potato', line: 'Looks worse, plays the same.' },
  tweaks: { name: 'VEIL tweaks', line: 'Single settings VEIL writes for you. Not benchmarked yet.' },
}

export const MODS: Mod[] = [
  {
    id: 'veilhud', name: 'VEIL HUD', group: 'hud', source: 'veil', excludes: ['hpbars'],
    ingame: 'Nothing to open in the game: you design it in the Forge, and Apply rebuilds the pak. The change shows the next time Deadlock starts.',
    blurb: 'Your Forge health bars, ult indicator and stamina, built into a real game pak.',
    detail: 'VEIL takes the game’s own health bar stylesheet from your install, adds the design from the Forge, and installs it as a pak in addons. Heroes only; troopers, bosses and buildings stay stock. Rebuilt every time you apply.',
    impact: 'small',
  },
  {
    id: 'hudpp', name: 'HUD++', group: 'hud', source: 'complock', author: 'jcStani', pak: true, size: '800 KB', match: 'HUD++',
    ingame: 'Press Esc in a match and click COMPLOCK, the button above Settings. That opens HUD++’s own panel: crosshair, minimap, top bar and item cooldowns.',
    cl: { vanilla: 'hud_vanilla.vpk', cumulative: 'hud.vpk', hidden: 'hud_nodamage.vpk' },
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
      { id: 'cumulative', label: 'Cumulative damage', note: 'One running total per target.', gain: { avg: 1.8, low: 3.0 }, convars: { citadel_damage_text_batching_window_individual: '2' } },
      { id: 'hidden', label: 'Hidden damage', note: 'No numbers at all.', gain: { avg: 2.8, low: 5.4 } },
    ],
  },
  {
    id: 'gameinfo', name: 'Engine settings', group: 'engine', source: 'complock', author: 'HoppCX', gameinfo: true,
    blurb: 'CompLock’s gameinfo.gi: the biggest single gain.',
    detail: 'Engine values tuned for frame time, fog off, and a wider field of view. VEIL downloads CompLock’s gameinfo.gi when you apply, keeps a backup of yours, and writes your field of view and tweaks on top. Switching it off puts your own back.',
    gain: { avg: 24.1, low: 18.0 },
    before: CL + 'pack/fov-fight.webp',
    options: [
      { id: 'fov-stock', label: 'Stock FOV', note: 'Your screen’s aspect ratio.', convars: { r_aspectratio: '0' } },
      { id: 'fov-complock', label: '116°', note: '+10° over stock. r_aspectratio 2.15', convars: { r_aspectratio: '2.15' } },
      { id: 'fov-wide', label: 'Widest', note: 'r_aspectratio 2.4', convars: { r_aspectratio: '2.4' } },
    ],
  },
  {
    id: 'cloth', match: 'cloth', cl: 'nocloth_dir.vpk', name: 'Cloth simulation off', group: 'engine', source: 'complock', author: 'HoppCX', pak: true,
    blurb: 'Coats, capes and skirts removed from the 17 heroes that have them.',
    detail: 'The pak swaps the cloth meshes out and VEIL turns cloth_update off, so nothing is simulated. It is a large download (about 104 MB).',
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
    id: 'soundcap', match: 'Sound stack', cl: 'soundcap.vpk', name: 'Sound stack update cap', group: 'engine', source: 'complock', author: 'HoppCX', pak: true, size: '7.4 KB',
    blurb: 'Playing sounds update about 60 times a second instead of every frame.',
    detail: 'At high frame rates the sound system was updating every frame. Capping it frees the main thread with no audible change.',
    gain: { avg: 6.7, low: 6.3 },
  },
  {
    id: 'particles', match: 'Particle Pruning', cl: { stock: 'particlepruning_stocktracers.vpk', reduced: 'particlepruning.vpk' }, name: 'Particle Pruning', group: 'effects', source: 'complock', author: 'HoppCX', pak: true, size: '2.3 MB',
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
    id: 'lowmap', match: 'Low detail map', cl: 'lowdetailmap.vpk', name: 'Low detail map', group: 'effects', source: 'complock', author: 'HoppCX', pak: true,
    blurb: '414 textures and 676 materials swapped for low-detail versions.',
    detail: 'Mostly helps when your graphics card is the limit.',
    gain: { avg: 3.8, low: 0 },
    before: CL + 'pack/street-stock.webp', after: CL + 'pack/lowdetailmap-after.webp',
  },
  {
    id: 'lighting', match: 'Brighter lighting', cl: 'brighterlighting.vpk', name: 'Brighter lighting', group: 'effects', source: 'complock', author: 'BreadRollius', pak: true,
    blurb: 'A brighter, flatter image.',
    detail: 'No vignette or base bloom, and no lamp, storm or street light glow.',
    gain: { avg: 2.9, low: 0 },
    before: CL + 'pack/street-stock.webp', after: CL + 'pack/lighting-after.webp',
  },
  {
    id: 'hpbars', cl: 'hpbars.vpk', excludes: ['veilhud'], match: 'health bars', name: 'jcStani’s HP Bars', group: 'visibility', source: 'complock', author: 'jcStani', pak: true,
    blurb: 'Flat hero health bars, stamina as dots, debuffs above the number.',
    detail: 'Design your own version in the Forge and preview it on a hero before you install.',
    after: CL + 'hp-bars.webp',
  },

  // Potato: below the lowest video preset. Values from CompLock's cvar index (build 6861); none are in their gameinfo.gi.
  { id: 'skybox', name: 'No 3D skybox', group: 'potato', source: 'veil', impact: 'small', blurb: 'The distant skyline around the map is not drawn.', detail: 'r_draw3dskybox false. Buildings beyond the play area disappear into a flat sky. Nothing you can fight in is affected.', convars: { r_draw3dskybox: 'false' } },
  { id: 'particlelights', name: 'Effects don’t light the world', group: 'potato', source: 'veil', impact: 'medium', blurb: 'Abilities and explosions stop casting light on walls and heroes.', detail: 'r_citadel_disable_particle_lights true. Every glowing effect was also a moving light; now only effects that need one keep it. Fights look flatter and run lighter.', convars: { r_citadel_disable_particle_lights: 'true' } },
  { id: 'debris', name: 'No effect debris', group: 'potato', source: 'veil', impact: 'small', blurb: 'Effects stop spawning physics chunks.', detail: 'r_physics_particle_op_spawn_scale 0. Rocks and shards that effects throw around are not created, so there is nothing to simulate.', convars: { r_physics_particle_op_spawn_scale: '0' } },
  { id: 'impacts', name: 'No bullet impacts', group: 'potato', source: 'veil', impact: 'small', blurb: 'No puffs and sparks where bullets hit walls.', detail: 'cl_impacteffects false. Hits on heroes still show; only the effects on the world go. You see a little less of where a missed shot landed.', convars: { cl_impacteffects: 'false' } },
  { id: 'blood', name: 'No blood or gibs', group: 'potato', source: 'veil', impact: 'small', blurb: 'The game’s low violence mode.', detail: 'violence_hblood, violence_hgibs, violence_ablood and violence_agibs off. Fewer particles and decals in every fight.', autoexec: { violence_hblood: '0', violence_hgibs: '0', violence_ablood: '0', violence_agibs: '0' } },
  { id: 'faces', name: 'Frozen faces', group: 'potato', source: 'veil', impact: 'small', blurb: 'Heroes keep a neutral face: no expressions, no lip sync.', detail: 'enable_boneflex 0. Flex animation is worked out for every hero on screen each frame; without it faces stop moving.', autoexec: { enable_boneflex: '0' } },
  { id: 'ownlod', name: 'Your hero at normal detail', group: 'potato', source: 'veil', impact: 'small', blurb: 'Your own hero uses the same level of detail as everyone else.', detail: 'citadel_player_model_force_highest_lod false. By default your hero is always drawn at its highest detail, though it fills only a small part of the screen.', convars: { citadel_player_model_force_highest_lod: 'false' } },
  { id: 'bodies', name: 'Bodies vanish fast', group: 'potato', source: 'veil', impact: 'small', blurb: 'Dead heroes disappear after 1 second instead of 5.', detail: 'citadel_death_ragdoll_duration 1. Fewer bodies to animate after a team fight.', convars: { citadel_death_ragdoll_duration: '1' } },
  { id: 'particlerate', name: 'Particles at 60 Hz', group: 'potato', source: 'veil', impact: 'medium', blurb: 'Effects are simulated at most 60 times a second.', detail: 'r_particle_min_timestep 0.0167. Above 60 FPS particles are interpolated between steps instead of simulated every frame. A processor saving that grows with your frame rate.', convars: { r_particle_min_timestep: '0.0167' } },
  { id: 'fallback', name: 'Cheaper effects sooner', group: 'potato', source: 'veil', impact: 'medium', blurb: 'In heavy fights, new effects switch to their cheap versions earlier.', detail: 'cl_particle_sim_fallback_threshold_ms 2 (default 6) and cl_particle_sim_fallback_base_multiplier 10. Once particles take 2 ms of a frame, effects that have a cheaper version use it.', convars: { cl_particle_sim_fallback_threshold_ms: '2', cl_particle_sim_fallback_base_multiplier: '10' } },
  { id: 'distancefield', name: 'No distance field shadows', group: 'potato', source: 'veil', impact: 'medium', blurb: 'The soft, traced shadows of the map are skipped.', detail: 'r_distancefield_enable false and r_citadel_distancefield_shadows false. The map loses its soft large-scale shadowing; hero shadows follow your shadow setting.', convars: { r_distancefield_enable: 'false', r_citadel_distancefield_shadows: 'false' } },
  { id: 'lightshadows', name: 'Lights cast no shadows', group: 'potato', source: 'veil', impact: 'medium', blurb: 'Lamps and dynamic lights stop casting shadows.', detail: 'lb_enable_shadow_casting false. Only the sun can cast shadows, and only with shadow quality above off.', convars: { lb_enable_shadow_casting: 'false' } },
  { id: 'hdr', name: 'HDR off', group: 'potato', source: 'veil', impact: 'small', blurb: 'A flatter image with clipped highlights.', detail: 'sc_hdr_enabled_override 0. Renders in a cheaper colour format. Bright effects lose their glow and look washed out.', convars: { sc_hdr_enabled_override: '0' } },

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
  { id: 'textures', name: 'Lower texture detail', group: 'tweaks', source: 'veil', impact: 'medium', blurb: 'Textures streamed at a fraction of their resolution.', detail: 'r_texture_stream_mip_bias, also written to video.txt, where the game reads it. Each step halves texture resolution. Mostly helps cards with little video memory.',
    options: [
      // the lowest first: it is the default, so switching this on never raises a value already set lower
      { id: '4', label: 'Potato', note: '1/16 of the resolution. Blurry walls; heroes stay clear by shape and colour.', convars: { r_texture_stream_mip_bias: '4' } },
      { id: '2', label: 'Low', note: 'A quarter, like the game’s Low.', convars: { r_texture_stream_mip_bias: '2' } },
      { id: '1', label: 'Medium', note: 'Half resolution, like the game’s Medium.', convars: { r_texture_stream_mip_bias: '1' } },
    ] },
  { id: 'renderscale', name: 'Render scale', group: 'tweaks', source: 'veil', impact: 'large', blurb: 'Draw fewer pixels, upscale to your screen.', detail: 'mat_viewportscale. The biggest lever when your graphics card is the limit.', options: [ { id: '100', label: '100%', convars: { mat_viewportscale: '1' } }, { id: '85', label: '85%', convars: { mat_viewportscale: '0.85' } }, { id: '70', label: '70%', convars: { mat_viewportscale: '0.7' } }, { id: '50', label: '50%', convars: { mat_viewportscale: '0.5' } } ] },
]

export const byId = Object.fromEntries(MODS.map((m) => [m.id, m])) as Record<string, Mod>
export const COMPLOCK_URL = 'https://deadlockconfig.com/#build'
