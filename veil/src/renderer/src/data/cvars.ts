// A curated set of console variables that matter to players. Names, defaults and flags as in Deadlock build 6861.
// "gi" = only settable through gameinfo.gi (developmentonly), "cfg" = console or autoexec.cfg.
// The full list (thousands) can be imported from your own game: see parseCvarlist().

export type Cvar = { name: string; def: string; cat: Cat; via: 'gi' | 'cfg'; range?: string; desc: string; flags?: string[] }
export type Cat = 'Performance' | 'Graphics' | 'Crosshair' | 'HUD' | 'Audio' | 'Network' | 'Physics'
export const CATS: Cat[] = ['Performance', 'Graphics', 'Crosshair', 'HUD', 'Audio', 'Network', 'Physics']

const c = (name: string, def: string, cat: Cat, via: Cvar['via'], desc: string, range?: string, flags?: string[]): Cvar => ({ name, def, cat, via, desc, range, flags })

export const CVARS: Cvar[] = [
  c('fps_max', '400', 'Performance', 'cfg', 'Frame rate cap in a match. 0 means no cap.'),
  c('fps_max_ui', '120', 'Performance', 'cfg', 'Frame rate cap while menus or the dashboard are open. 0 means no cap.'),
  c('r_low_latency', '1', 'Performance', 'gi', 'Reflex or Anti-Lag 2. 0 off, 1 on, 2 on with boost (NVIDIA only).'),
  c('engine_low_latency_sleep_after_client_tick', 'false', 'Performance', 'cfg', 'With low latency on, sleeps after the client simulation on tick frames instead of before it.'),
  c('mat_viewportscale', '1', 'Performance', 'gi', 'Internal render resolution per axis. 0.7 draws about half the pixels.', '0.0016 – 1'),
  c('r_particle_max_detail_level', '3', 'Performance', 'gi', 'Highest particle detail level spawned. Lower levels skip the expensive parts of effects.', '0 – 3'),
  c('r_texture_stream_mip_bias', '0', 'Performance', 'gi', 'Texture detail. Every step halves texture resolution; the in-game setting uses 2 for low.'),
  c('r_citadel_fog_quality', '1', 'Graphics', 'gi', 'Volumetric fog resolution. 0 low, 1 high.', '0 – 1'),
  c('volume_fog_depth', '128', 'Graphics', 'gi', 'Depth slices in the volumetric fog volume. Fewer slices, cheaper fog.', '48 – 1024'),
  c('fog_enable', 'true', 'Graphics', 'gi', 'Draws fog at all.', undefined, ['cheat']),
  c('r_citadel_shadow_quality', '1', 'Graphics', 'gi', 'Shadow quality. 0 low to 3 ultra.'),
  c('r_shadows', 'true', 'Graphics', 'gi', 'Master switch for every shadow.', undefined, ['cheat', 'gameinfo cannot override']),
  c('r_citadel_ssao_quality', '3', 'Graphics', 'gi', 'Ambient occlusion: soft shadows where surfaces meet. 0 off to 4 ultra.'),
  c('r_ssao', 'true', 'Graphics', 'gi', 'Screen-space ambient occlusion on or off.'),
  c('r_depth_of_field', 'true', 'Graphics', 'gi', 'Camera-lens blur away from the focus distance.'),
  c('r_post_bloom', 'false', 'Graphics', 'gi', 'Post-process bloom: light bleeding out of bright areas.'),
  c('r_effects_bloom', 'true', 'Graphics', 'gi', 'Lets effects draw straight into the bloom buffer for a stronger glow.'),
  c('r_postprocess_enable', 'true', 'Graphics', 'gi', 'The whole post-processing pass: bloom, FXAA and similar.', undefined, ['cheat', 'gameinfo cannot override']),
  c('r_citadel_antialiasing', '1', 'Graphics', 'gi', 'Anti-aliasing when FSR2 is off. 0 none, 1 FXAA.'),
  c('r_aspectratio', '0', 'Graphics', 'gi', 'Overrides the view aspect ratio, which changes the field of view. 0 uses your screen. 2.15 gives about 116°.'),
  c('r_fullscreen_gamma', '2.2', 'Graphics', 'cfg', 'Gamma in fullscreen. The Full Screen Brightness slider sets it.', '1 – 4'),
  c('r_citadel_glow_health_bars', 'true', 'Graphics', 'gi', 'Glow around health bars.'),
  c('citadel_crosshair_color_r', '255', 'Crosshair', 'gi', 'Crosshair colour, red part.', '0 – 255'),
  c('citadel_crosshair_color_g', '255', 'Crosshair', 'gi', 'Crosshair colour, green part.', '0 – 255'),
  c('citadel_crosshair_color_b', '255', 'Crosshair', 'gi', 'Crosshair colour, blue part.', '0 – 255'),
  c('citadel_crosshair_pip_gap', '4', 'Crosshair', 'gi', 'Gap between the lines and the centre, in pixels.'),
  c('citadel_crosshair_pip_width', '2', 'Crosshair', 'gi', 'Line thickness in pixels.'),
  c('citadel_crosshair_pip_height', '16', 'Crosshair', 'gi', 'Line length in pixels.'),
  c('citadel_crosshair_pip_opacity', '0.5', 'Crosshair', 'gi', 'Line opacity.'),
  c('citadel_crosshair_pip_outline_opacity', '0.7', 'Crosshair', 'gi', 'Opacity of the border around each line.'),
  c('citadel_crosshair_dot_size', '4', 'Crosshair', 'gi', 'Centre dot size in pixels.'),
  c('citadel_crosshair_dot_opacity', '0.7', 'Crosshair', 'gi', 'Centre dot opacity.'),
  c('citadel_crosshair_hit_marker_duration', '0.1', 'Crosshair', 'cfg', 'How long the hit marker stays after a hit, in seconds.'),
  c('citadel_crosshair_disable_hero_specific_crosshairs', 'false', 'Crosshair', 'gi', 'Uses the plain reticle for every hero instead of their themed one.'),
  c('citadel_damage_text_cumulative_mode', '0', 'HUD', 'cfg', 'Damage totals. 0 one number per hit, 1 a running total, 2 the total once damage stops.'),
  c('citadel_damage_text_dynamic_emphasis', 'true', 'HUD', 'gi', 'Makes damage numbers bigger when a hit takes a large share of the target’s health.'),
  c('citadel_unit_status_show_health_value', 'true', 'HUD', 'cfg', 'Health numbers inside health bars.'),
  c('citadel_unit_status_show_ally_health_value', 'true', 'HUD', 'cfg', 'Health numbers on allies’ bars.'),
  c('citadel_use_vertical_healthbars', 'false', 'HUD', 'gi', 'Draws unit health bars vertically.'),
  c('citadel_hud_hide_own_health', 'false', 'HUD', 'cfg', 'Hides your own health bar on the HUD.'),
  c('volume', '1', 'Audio', 'cfg', 'Master volume.', '0 – 1'),
  c('snd_mixahead', '0.001', 'Audio', 'cfg', 'How far ahead audio is mixed, in seconds. Lower is less audio delay.'),
  c('snd_gamevolume', '1', 'Audio', 'cfg', 'Game sound volume.'),
  c('cl_interp_ratio', '2', 'Network', 'cfg', 'Interpolation in server updates. Changes how far the server rewinds for lag compensation, not what you see.'),
  c('cloth_update', 'true', 'Physics', 'gi', 'Cloth simulation on coats and capes. Off leaves them in their rest pose.'),
  c('cl_phys_enabled', 'true', 'Physics', 'gi', 'All client physics. Off freezes ragdolls and props.', undefined, ['cheat']),
  c('cl_disable_ragdolls', 'false', 'Physics', 'gi', 'Turns ragdolls off. Can break how Doorman’s ultimate looks.', undefined, ['cheat']),
  c('cl_ragdoll_limit', '20', 'Physics', 'cfg', 'Most ragdolls at once. -1 means no limit.'),
]

/** Parses the output of `cvarlist` as written to console.log (launch the game with -condebug, run cvarlist). */
export function parseCvarlist(text: string): Cvar[] {
  const out: Cvar[] = []
  const seen = new Set(CVARS.map((v) => v.name))
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/\s+:\s+/)
    if (parts.length < 3) continue
    const name = parts[0].replace(/^.*?\]\s*/, '').trim()
    if (!/^[a-z_][a-z0-9_]*$/i.test(name) || seen.has(name)) continue
    seen.add(name)
    const flags = (parts[2] ?? '').split(/[,\s"]+/).filter(Boolean)
    const desc = parts.slice(3).join(' : ').trim()
    out.push({ name, def: (parts[1] ?? '').trim(), cat: guessCat(name), via: flags.includes('developmentonly') ? 'gi' : 'cfg', desc: desc || 'No description in the game.', flags })
  }
  return out
}

function guessCat(n: string): Cat {
  if (/crosshair/.test(n)) return 'Crosshair'
  if (/^snd_|audio|volume|voice/.test(n)) return 'Audio'
  if (/^(cl_|sv_)?(net|rate|interp|cmdrate|updaterate)/.test(n)) return 'Network'
  if (/phys|ragdoll|cloth/.test(n)) return 'Physics'
  if (/hud|damage_text|unit_status|minimap/.test(n)) return 'HUD'
  if (/fps|latency|thread|viewportscale|detail/.test(n)) return 'Performance'
  return 'Graphics'
}
