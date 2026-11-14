# VEIL HUD extras: minimap, timers, souls

What VEIL HUD can do beyond the hero health bars, how it does it, and what is still blocked.
Status as of VEIL 0.5.2 + this change, checked against the Deadlock files installed on 2026-11-14.

## How it works

VEIL HUD only appends CSS to the game's own compiled stylesheets (`.vcss_c`), the same way it already does
for the health bars (`src/main/resource.ts` `appendToData`). Deadlock's HUD already computes most of what
HUD++ shows; several of those panels exist in the stock HUD but are hidden or faint. VEIL shows, moves and
restyles them. No scripts, no layouts, nothing copied from HUD++.

| Feature | Stock sheet VEIL patches | What the CSS does |
|---|---|---|
| Minimap size, opacity, background, corner, offset | `hud.vcss_c` | resizes `#minimap_persp`, `#minimap_container`, `#minimap_frame`, `#hud_minimap`; `opacity` on the container; frame image swapped for a dark disc or nothing; `horizontal-align` + margins. Targeting mode (`.gMinimapTargeting`) is more specific and keeps its own sizes. |
| Your ability / item cooldown seconds (size, colour) | `hud_ability_icon.vcss_c` | restyles `.cooldown_timer`; passive items: shows `#hud_passive_items .cooldown_timer`, which stock hides |
| Every player's ult cooldown in the top bar | `hud_ability_icon.vcss_c` | stock has `.UltimateStatus .cooldown_timer{visibility: collapse}`; VEIL shows it while `.cooling_down` |
| Respawn timers (size, colour) | `citadel_hud_top_bar.vcss_c`, `hud.vcss_c` | restyles `.RespawnTimer` (top bar) and `#respawn_timer .respawn_number` (your own) |
| Rejuvenator / mid boss timer | `citadel_hud_top_bar.vcss_c` | `#RejuvenatorCharges .midbossTimerLabel` from opacity 0.3 to 1, bigger |
| Mid boss timer on the minimap | `hud_minimap.vcss_c` | shows `.map_button.mid_boss #NextSpawnTimer` all the time (stock: scoreboard only) |
| Powerup spawns | `in_world_event_timer.vcss_c` | shows the full progress ring (`.powerup .full_container`) instead of the small pulse |
| Every player's souls | `citadel_hud_top_bar.vcss_c` | shows `#TotalSoulsContainer` (stock: scoreboard only) |
| Team souls | `hud.vcss_c` | shows `.team_gold` (stock: always collapsed) |

## Verified

- `npm run typecheck` and `npm run build` pass.
- The pak builds from the installed game: all six patched sheets read back with valid block tables, and
  each one's stylesheet text is exactly the stock text plus VEIL's CSS.
- The Forge shows the options with a live preview (Minimap, Timers, Souls tabs). The preview is a drawing that
  uses the same numbers as the CSS, not a capture from the game.

## Not verified in a match (labelled "Not tested in a match" in the Forge)

All of the above. The selectors come from the current stock sheets, but nobody has loaded the pak in a game
yet. Specific doubts:

- **Team souls**: the `.team_gold` label exists but stock always hides it; the game may no longer fill it in.
- **Ult cooldowns of other players**: the cooldown label exists inside `.UltimateStatus`, but whether the game
  sends enemy ult cooldowns (rather than just ready / not ready) is unknown.
- **Powerup ring**: shows the ring the game uses for other world timers; there is no seconds label for
  powerups in the stock HUD, so no seconds.
- **Minimap**: the rule order assumes no other loaded sheet overrides `#minimap_persp` and friends; a moved
  minimap can overlap other HUD parts, which do not move out of the way.
- Everything is off by default, so applying VEIL without touching these tabs changes nothing beyond the bars.

## Blocked: anything that needs a script

**Soul gap (souls and percent ahead / behind)** needs arithmetic, so it needs Panorama JavaScript. HUD++-style
features that are not stock panels at all (its own timer grid, buy tracker) need the same. What's in the way:

1. **Scripts themselves are easy.** A compiled `.vjs_c` (seen in addon paks) is a resource with `RED2`
   (binary KV3 metadata) and a `DATA` block that is the plain JavaScript text. VEIL could write one by taking a
   Valve-compiled script resource and replacing its DATA, like it already does for stylesheets. Stock Deadlock
   ships no `.vjs_c` to start from (its 6 scripts are `.vts_c`, all post-game), so the template would have to be
   built from scratch or from a `.vts_c` with the same layout. Untested.
2. **Getting a script loaded is the blocker.** Panorama only runs scripts a layout includes. Deadlock's layouts
   (`.vxml_c`) no longer carry XML text: their `LaCo` block is a binary KV3 v5 tree (`m_AST`, LZ4-compressed in
   stock files; addon files show the game also accepts it uncompressed). To add a `<scripts><include>` VEIL
   would need a KV3 v5 reader and writer, decode e.g. `panorama/layout/hud.vxml_c`, add the node, and
   re-encode it. That's a real but bounded piece of work (KV3 v5 has separate typed buffers for bytes, ints,
   doubles, strings and a block of object/array layouts).
3. **The script API is undocumented.** What Deadlock exposes to Panorama JS for team souls (and whether it
   exposes enemy values at all) can only be found in a running game with the Panorama debugger. Nobody can do
   that from a dev session.

What it would take: a KV3 v5 codec in `src/main/` (round-trip test: decode and re-encode every stock
`.vxml_c` byte-identically, or at least loadable), a minimal VEIL script that only logs to the Panorama console,
and one session in a real match to confirm the script loads and to find the API for team souls. Only then
build the soul gap on top.
