import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { RotateCcw, Copy, Lock, ArrowUpRight } from '../components/icons'
import { ForgeScene, DamageNumbers, BAR_W, BAR_H, type Tab } from '../forge/Scene'
import { Sim } from '../forge/sim'
import { STYLES, drawBar } from '../lib/hpbar'
import { useHeroes } from '../lib/heroes'
import { useStore, DEFAULT_BAR, DEFAULT_CROSS, DEFAULT_HUDX, computePack, type Bar } from '../lib/store'
import { Seg, Slider, Switch, applyPack } from '../components/ui'
import { HudPreview } from '../forge/HudPreview'
import { api } from '../lib/api'

const TABS: { id: Tab; label: string }[] = [
  { id: 'bar', label: 'Bar' }, { id: 'colors', label: 'Colours' }, { id: 'number', label: 'Number' }, { id: 'stamina', label: 'Stamina' }, { id: 'ult', label: 'Ult' },
  { id: 'map', label: 'Minimap' }, { id: 'timers', label: 'Timers' }, { id: 'souls', label: 'Souls' },
  { id: 'damage', label: 'Damage' }, { id: 'hero', label: 'Hero' }, { id: 'export', label: 'Apply' },
]
/** Tabs that design the rest of the HUD; they show the flat HUD preview instead of the hero and bar. */
const HUD_TABS: Tab[] = ['map', 'timers', 'souls']
function resetHudx(tab: Tab) {
  const s = useStore.getState(), d = DEFAULT_HUDX
  const parts = tab === 'map' ? { minimap: d.minimap } : tab === 'souls' ? { souls: d.souls } : { cooldowns: d.cooldowns, ults: d.ults, respawn: d.respawn, objectives: d.objectives }
  s.set({ hudx: { ...s.hudx, ...parts } })
}

/** How sure VEIL is that an option works in a real match. */
function Status({ kind }: { kind: 'untested' | 'blocked' }) {
  return kind === 'untested'
    ? <span className="vstatus untested" title="Built on the game’s own stylesheets, but nobody has checked it in a real match yet.">Not tested in a match</span>
    : <span className="vstatus blocked" title="Needs a Panorama script, which VEIL can’t ship yet.">Not possible yet</span>
}
const ENEMY = ['#f0524f', '#ff2d55', '#ff8a3d', '#f2c14e', '#e94cff', '#ffffff']
const ALLY = ['#5fe0c4', '#4fb3ff', '#7cff6b', '#a98bff', '#f3ead9', '#2bd9ff']

export default function Forge() {
  const [tab, setTab] = useState<Tab>('bar')
  const sim = useMemo(() => new Sim(), [])
  const barRef = useRef<HTMLCanvasElement>(null)
  const dmgRef = useRef<HTMLDivElement>(null)
  const { heroes, failed } = useHeroes()
  const s = useStore()
  const hero = heroes.find((h) => h.id === s.hero) ?? heroes.find((h) => h.name === 'Haze') ?? heroes[0]
  // the Forge designs VEIL HUD; with it off (HUD++ or another bar mod on) nothing here reaches the game
  const live = !!s.on.veilhud
  const rival = s.on.hudpp ? 'HUD++' : s.on.hpbars ? 'jcStani’s HP Bars' : null

  return (
    <div className={`forge ${live ? '' : 'locked'}`}>
      <ForgeScene hero={hero} sim={sim} tab={tab} barRef={barRef} dmgRef={dmgRef} />
      <div className={`overhead ${HUD_TABS.includes(tab) ? 'off' : ''}`} ref={dmgRef} aria-hidden><DamageNumbers sim={sim} /></div>
      {HUD_TABS.includes(tab) && (
        <div className="hudp-wrap">
          <div className="hudp-stage"><HudPreview x={s.hudx} focus={tab as 'map' | 'timers' | 'souls'} heroes={heroes} /></div>
          <p>A drawing of the stock HUD with your settings, not a capture from the game.</p>
        </div>
      )}
      <canvas
        ref={barRef} className={`overhead bar ${['bar', 'colors', 'number', 'stamina', 'ult'].includes(tab) ? 'editing' : ''} ${HUD_TABS.includes(tab) ? 'off' : ''}`}
        style={{ width: BAR_W, height: BAR_H }} onClick={() => setTab('bar')} title="Edit the bar" aria-label="Health bar preview"
      />


      <div className="forge-title">
        <span className={`forge-state ${live ? 'on' : ''}`}><i />{live ? 'Designing VEIL HUD · in your config' : 'VEIL HUD is off'}</span>
        <h1>Forge</h1>
        <p>Everything you set here is built into your VEIL HUD and goes into the game when you apply. Click the bar over {hero?.name ?? 'the hero'} to edit it; drag to look around.</p>
      </div>

      {!live && (
        <div className="forge-lock" role="dialog" aria-label="VEIL HUD is off">
          <span className="round"><Lock size={16} /></span>
          <h2 className="h-wide">{rival ? `${rival} is on` : 'VEIL HUD is off'}</h2>
          <p>The Forge designs VEIL HUD. {rival ? `${rival} replaces the same health bars, so nothing you set here would reach the game.` : 'Switch it on and everything you set here goes into the game when you apply.'}</p>
          <button className="cta" onClick={() => s.toggle('veilhud')}>
            <span>{rival ? `Use VEIL HUD instead of ${rival}` : 'Switch VEIL HUD on'}</span>
            <span className="cta-go"><ArrowUpRight size={14} /></span>
          </button>
        </div>
      )}

      <div className="forge-top">
        <Seg label="Whose bar" value={s.side} onChange={(side) => s.set({ side })} options={[{ id: 'enemy', label: 'Enemy' }, { id: 'ally', label: 'Ally' }]} />
      </div>

      <section className="panel" aria-label="Forge settings">
        <nav>{TABS.map((t) => (
          <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {tab === t.id && <motion.span layoutId="forge-tab" className="tab-line" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
          </button>
        ))}</nav>
        <AnimatePresence mode="wait">
          <motion.div key={tab} className="body" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <TabBody tab={tab} heroes={heroes} failed={failed} />
          </motion.div>
        </AnimatePresence>
        <footer>
          <button className="btn brass small" style={{ flex: 1, justifyContent: 'center' }} onClick={applyPack} disabled={!s.status?.found}>Apply to Deadlock</button>
          <button className="btn ghost small" onClick={() => HUD_TABS.includes(tab) ? resetHudx(tab) : s.set({ bar: DEFAULT_BAR })} aria-label="Reset this part"><RotateCcw size={14} />Reset</button>
        </footer>
      </section>

      {['bar', 'colors', 'number', 'stamina', 'ult'].includes(tab) && (
        <div className="styles-strip" role="group" aria-label="Bar styles">
          {STYLES.map((st) => <StyleCard key={st.id} id={st.id} name={st.name} />)}
        </div>
      )}
    </div>
  )
}

function StyleCard({ id, name }: { id: Bar['style']; name: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const bar = useStore((s) => s.bar)
  const side = useStore((s) => s.side)
  const setBar = useStore((s) => s.setBar)
  useEffect(() => {
    const c = ref.current!, dpr = 2
    c.width = 104 * dpr; c.height = 44 * dpr
    drawBar(c.getContext('2d')!, 104, 44, dpr, { ...bar, style: id, width: 80, height: Math.min(bar.height, 9), numberSize: 10, numberPos: bar.numberPos === 'left' ? 'above' : bar.numberPos, debuffs: false, ult: { ...bar.ult, show: false } }, side, { hp: 1580, max: 2340, lag: 1800, stamina: 2, debuffs: 0 })
  }, [bar, side, id])
  return (
    <button className="style-card" aria-pressed={bar.style === id} onClick={() => setBar({ style: id })}>
      <canvas ref={ref} />
      {name}
    </button>
  )
}

function TabBody({ tab, heroes, failed }: { tab: Tab; heroes: ReturnType<typeof useHeroes>['heroes']; failed: boolean }) {
  const s = useStore()
  const b = s.bar, c = s.cross

  if (tab === 'bar') return (
    <>
      <h3>Bar</h3>
      <p className="hint">Pick a style below, then size it.</p>
      <Slider label="Width" value={b.width} min={70} max={200} onChange={(width) => s.setBar({ width })} format={(v) => `${v} px`} />
      <Slider label="Height" value={b.height} min={4} max={22} onChange={(height) => s.setBar({ height })} format={(v) => `${v} px`} />
      <div className="toggle-row"><span>Glow<small>Writes r_citadel_glow_health_bars</small></span><Switch checked={b.glow} onChange={(glow) => s.setBar({ glow })} label="Glow" /></div>
      <div className="toggle-row"><span>Vertical bars<small>Writes citadel_use_vertical_healthbars</small></span><Switch checked={s.verticalBars} onChange={(verticalBars) => s.set({ verticalBars })} label="Vertical bars" /></div>
      <div className="field"><div className="head"><span>Background</span></div>
        <div className="colors">{['#0d0d0f', '#1c1a17', '#2a0f0f', '#000000'].map((v) => <button key={v} className="swatch" style={{ background: v, boxShadow: 'inset 0 0 0 1px rgba(237,228,211,.2)' }} aria-pressed={b.back === v} onClick={() => s.setBar({ back: v })} aria-label={v} />)}<input type="color" value={b.back} onChange={(e) => s.setBar({ back: e.target.value })} aria-label="Custom background" /></div>
      </div>
    </>
  )
  if (tab === 'colors') return (
    <>
      <h3>Colours</h3>
      <p className="hint">One for enemies, one for allies. Flip the switch at the top to see each.</p>
      <div className="field"><div className="head"><span>Enemy</span><b>{b.enemy}</b></div>
        <div className="colors">{ENEMY.map((v) => <button key={v} className="swatch" style={{ background: v }} aria-pressed={b.enemy === v} onClick={() => { s.setBar({ enemy: v }); s.set({ side: 'enemy' }) }} aria-label={v} />)}<input type="color" value={b.enemy} onChange={(e) => s.setBar({ enemy: e.target.value })} aria-label="Custom enemy colour" /></div>
      </div>
      <div className="field"><div className="head"><span>Ally</span><b>{b.ally}</b></div>
        <div className="colors">{ALLY.map((v) => <button key={v} className="swatch" style={{ background: v }} aria-pressed={b.ally === v} onClick={() => { s.setBar({ ally: v }); s.set({ side: 'ally' }) }} aria-label={v} />)}<input type="color" value={b.ally} onChange={(e) => s.setBar({ ally: e.target.value })} aria-label="Custom ally colour" /></div>
      </div>
    </>
  )
  if (tab === 'number') return (
    <>
      <h3>Health number</h3>
      <div className="toggle-row"><span>Show the number<small>Writes citadel_unit_status_show_health_value</small></span><Switch checked={b.showNumber} onChange={(showNumber) => s.setBar({ showNumber })} label="Show health number" /></div>
      <Slider label="Size" value={b.numberSize} min={10} max={24} onChange={(numberSize) => s.setBar({ numberSize })} format={(v) => `${v} px`} />
      <div className="field"><div className="head"><span>Position</span></div>
        <Seg label="Number position" value={b.numberPos} onChange={(numberPos) => s.setBar({ numberPos })} options={[{ id: 'above', label: 'Above' }, { id: 'inside', label: 'Inside' }, { id: 'left', label: 'Left' }]} />
      </div>
    </>
  )
  if (tab === 'stamina') return (
    <>
      <h3>Stamina and debuffs</h3>
      <div className="toggle-row"><span>Stamina dots<small>Under the bar, one per charge</small></span><Switch checked={b.stamina} onChange={(stamina) => s.setBar({ stamina })} label="Stamina dots" /></div>
      <Slider label="Charges shown" value={b.staminaCount} min={1} max={5} onChange={(staminaCount) => s.setBar({ staminaCount })} />
      <div className="toggle-row"><span>Debuff icons<small>Right above the health number</small></span><Switch checked={b.debuffs} onChange={(debuffs) => s.setBar({ debuffs })} label="Debuff icons" /></div>
    </>
  )
  if (tab === 'ult') return (
    <>
      <h3>Ult indicator</h3>
      <p className="hint">Shows whether the hero has their ultimate ready. Watch it charge on the preview.</p>
      <div className="toggle-row"><span>Show ult indicator</span><Switch checked={b.ult.show} onChange={(show) => s.setBar({ ult: { ...b.ult, show } })} label="Show ult indicator" /></div>
      <div className="field"><div className="head"><span>Where</span></div>
        <Seg label="Ult position" value={b.ult.pos} onChange={(pos) => s.setBar({ ult: { ...b.ult, pos } })} options={[{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }, { id: 'above', label: 'Above' }, { id: 'below', label: 'Below' }]} />
      </div>
      <div className="field"><div className="head"><span>Look</span></div>
        <Seg label="Ult style" value={b.ult.style} onChange={(style) => s.setBar({ ult: { ...b.ult, style } })} options={[{ id: 'icon', label: 'Diamond' }, { id: 'dot', label: 'Dot' }, { id: 'ring', label: 'Ring' }, { id: 'text', label: 'Text' }]} />
      </div>
      <Slider label="Size" value={b.ult.size} min={8} max={22} onChange={(size) => s.setBar({ ult: { ...b.ult, size } })} format={(v) => `${v} px`} />
      <div className="field"><div className="head"><span>Colour when ready</span><b>{b.ult.color}</b></div>
        <div className="colors">{['#f2c14e', '#5fe0c4', '#ffffff', '#b48cff', '#ff5a4f', '#2bd9ff'].map((v) => <button key={v} className="swatch" style={{ background: v }} aria-pressed={b.ult.color === v} onClick={() => s.setBar({ ult: { ...b.ult, color: v } })} aria-label={v} />)}<input type="color" value={b.ult.color} onChange={(e) => s.setBar({ ult: { ...b.ult, color: e.target.value } })} aria-label="Custom ult colour" /></div>
      </div>
      <p className="hint" style={{ margin: 0 }}>In game this needs the VEIL HUD pak, which is not built yet. Your design is saved for it.</p>
    </>
  )
  const x = s.hudx
  if (tab === 'map') return (
    <>
      <h3>Minimap</h3>
      <p className="hint">Size, see-through, background and corner. Targeting mode (the big map) keeps its own size.</p>
      <div className="toggle-row"><span>Custom minimap<small>Off keeps the stock minimap</small><Status kind="untested" /></span><Switch checked={x.minimap.on} onChange={(on) => s.setHudx('minimap', { on })} label="Custom minimap" /></div>
      <fieldset className="hudx-group" disabled={!x.minimap.on}>
        <Slider label="Size" value={x.minimap.size} min={60} max={150} step={5} onChange={(size) => s.setHudx('minimap', { size })} format={(v) => `${v}%`} />
        <Slider label="Opacity" value={x.minimap.opacity} min={20} max={100} step={5} onChange={(opacity) => s.setHudx('minimap', { opacity })} format={(v) => `${v}%`} />
        <div className="field"><div className="head"><span>Background</span></div>
          <Seg label="Minimap background" value={x.minimap.bg} onChange={(bg) => s.setHudx('minimap', { bg })} options={[{ id: 'stock', label: 'Stock frame' }, { id: 'dark', label: 'Dark disc' }, { id: 'none', label: 'None' }]} />
        </div>
        <div className="field"><div className="head"><span>Corner</span></div>
          <Seg label="Minimap corner" value={x.minimap.side} onChange={(side) => s.setHudx('minimap', { side })} options={[{ id: 'left', label: 'Bottom left' }, { id: 'right', label: 'Bottom right' }]} />
        </div>
        <Slider label="From the side" value={x.minimap.x} min={0} max={600} step={5} onChange={(v) => s.setHudx('minimap', { x: v })} format={(v) => `${v} px`} />
        <Slider label="From the bottom" value={x.minimap.y} min={0} max={500} step={5} onChange={(y) => s.setHudx('minimap', { y })} format={(v) => `${v} px`} />
      </fieldset>
      <p className="hint" style={{ margin: 0 }}>Other HUD parts don’t move out of the way. After you apply, check nothing overlaps.</p>
    </>
  )
  if (tab === 'timers') return (
    <>
      <h3>Timers</h3>
      <p className="hint">The game already counts all of these. VEIL shows the ones it hides and restyles the rest.</p>
      <div className="toggle-row"><span>Your cooldowns<small>Seconds on abilities and items in your colour and size</small><Status kind="untested" /></span><Switch checked={x.cooldowns.on} onChange={(on) => s.setHudx('cooldowns', { on })} label="Cooldown seconds" /></div>
      <fieldset className="hudx-group" disabled={!x.cooldowns.on}>
        <Slider label="Size" value={x.cooldowns.size} min={60} max={150} step={5} onChange={(size) => s.setHudx('cooldowns', { size })} format={(v) => `${v}%`} />
        <div className="field"><div className="head"><span>Colour</span><b>{x.cooldowns.color}</b></div>
          <div className="colors">{['#f3ead9', '#ffffff', '#f2c14e', '#5fe0c4', '#ff5a4f'].map((v) => <button key={v} className="swatch" style={{ background: v }} aria-pressed={x.cooldowns.color === v} onClick={() => s.setHudx('cooldowns', { color: v })} aria-label={v} />)}<input type="color" value={x.cooldowns.color} onChange={(e) => s.setHudx('cooldowns', { color: e.target.value })} aria-label="Custom cooldown colour" /></div>
        </div>
        <div className="toggle-row"><span>On passive items too<small>Stock hides these</small></span><Switch checked={x.cooldowns.passives} onChange={(passives) => s.setHudx('cooldowns', { passives })} label="Passive item cooldowns" /></div>
      </fieldset>
      <div className="toggle-row"><span>Every player’s ult<small>Seconds left on each ult in the top bar</small><Status kind="untested" /></span><Switch checked={x.ults.on} onChange={(on) => s.setHudx('ults', { on })} label="Ult cooldowns in the top bar" /></div>
      {x.ults.on && <Slider label="Ult number size" value={x.ults.size} min={60} max={150} step={5} onChange={(size) => s.setHudx('ults', { size })} format={(v) => `${v}%`} />}
      <div className="toggle-row"><span>Respawn timers<small>The stock HUD shows them; VEIL sets their size and colour</small><Status kind="untested" /></span><Switch checked={x.respawn.on} onChange={(on) => s.setHudx('respawn', { on })} label="Respawn timers" /></div>
      <fieldset className="hudx-group" disabled={!x.respawn.on}>
        <Slider label="Size" value={x.respawn.size} min={60} max={160} step={5} onChange={(size) => s.setHudx('respawn', { size })} format={(v) => `${v}%`} />
        <div className="field"><div className="head"><span>Colour</span><b>{x.respawn.color}</b></div>
          <div className="colors">{['#fe420e', '#ffffff', '#f2c14e', '#5fe0c4'].map((v) => <button key={v} className="swatch" style={{ background: v }} aria-pressed={x.respawn.color === v} onClick={() => s.setHudx('respawn', { color: v })} aria-label={v} />)}<input type="color" value={x.respawn.color} onChange={(e) => s.setHudx('respawn', { color: e.target.value })} aria-label="Custom respawn colour" /></div>
        </div>
      </fieldset>
      <div className="toggle-row"><span>Rejuvenator timer<small>In the top bar, bright instead of faint</small><Status kind="untested" /></span><Switch checked={x.objectives.rejuv} onChange={(rejuv) => s.setHudx('objectives', { rejuv })} label="Rejuvenator timer" /></div>
      <div className="toggle-row"><span>Mid boss timer<small>On the minimap all the time, not only with the scoreboard open</small><Status kind="untested" /></span><Switch checked={x.objectives.midboss} onChange={(midboss) => s.setHudx('objectives', { midboss })} label="Mid boss timer" /></div>
      <div className="toggle-row"><span>Powerup spawns<small>The full spawn ring instead of a small pulse. No seconds: the game has no label for them.</small><Status kind="untested" /></span><Switch checked={x.objectives.powerups} onChange={(powerups) => s.setHudx('objectives', { powerups })} label="Powerup spawn ring" /></div>
    </>
  )
  if (tab === 'souls') return (
    <>
      <h3>Souls</h3>
      <p className="hint">Who has how much, always on screen instead of only with the scoreboard open.</p>
      <div className="toggle-row"><span>Every player’s souls<small>Under each portrait in the top bar</small><Status kind="untested" /></span><Switch checked={x.souls.players} onChange={(players) => s.setHudx('souls', { players })} label="Every player’s souls" /></div>
      <div className="toggle-row"><span>Team souls<small>Each team’s total beside the top bar. The game has this label but hides it; whether it still fills it in is unknown.</small><Status kind="untested" /></span><Switch checked={x.souls.team} onChange={(team) => s.setHudx('souls', { team })} label="Team souls" /></div>
      <div className="toggle-row"><span>Soul gap<small>How far ahead or behind, in souls and percent. That is arithmetic, which needs a Panorama script. VEIL HUD can only show and restyle what the game already draws.</small><Status kind="blocked" /></span><Switch checked={false} disabled onChange={() => {}} label="Soul gap" /></div>
    </>
  )
  if (tab === 'damage') return (
    <>
      <h3>Damage numbers</h3>
      <p className="hint">The target is taking hits so you can compare. Writes citadel_damage_text_cumulative_mode.</p>
      <div className="opts" style={{ marginBottom: 0 }}>
        {([[0, 'Every hit', 'One number per bullet, headshots in gold.'], [1, 'Running total', 'One number that counts up while you shoot.'], [2, 'Total at the end', 'Nothing while shooting, the total once you stop.']] as const).map(([v, t, n]) => (
          <button key={v} className="opt" aria-pressed={s.damageMode === v} onClick={() => s.set({ damageMode: v })}><span className="r" /><span><b>{t}</b><small>{n}</small></span><span /></button>
        ))}
      </div>
      <p className="hint" style={{ margin: 0 }}>HUD++ can also hide them completely; pick that under Mods.</p>
    </>
  )
  if (tab === 'hero') return (
    <>
      <h3>Hero</h3>
      <p className="hint">{failed ? 'Hero models need a connection to the Deadlock asset API. Showing a stand-in.' : 'Preview on any hero. Models and art come from the game’s own files.'}</p>
      <div className="heroes-grid">
        {heroes.map((h) => (
          <button key={h.id} aria-pressed={(s.hero ?? heroes[0]?.id) === h.id} onClick={() => s.set({ hero: h.id })} title={h.name} aria-label={h.name}>
            {h.icon && <img src={h.icon} alt="" loading="lazy" />}
          </button>
        ))}
      </div>
    </>
  )
  // export / apply
  const p = computePack(s)
  const mine = Object.entries({ ...p.convars, ...p.autoexec }).filter(([k]) => /health|damage_text|glow_health/.test(k))
  return (
    <>
      <h3>Apply</h3>
      <p className="hint">These go into the game when you apply. Bar colours and shapes beyond these need an HP bar pak; open CompLock’s builder to make one with the same look.</p>
      <pre className="code">{mine.map(([k, v]) => `${k} "${v}"`).join('\n')}</pre>
      <div className="actions">
        <button className="btn ghost small" onClick={() => { navigator.clipboard.writeText(JSON.stringify({ bar: s.bar, damageMode: s.damageMode }, null, 2)); s.say('Your Forge settings are on the clipboard.') }}><Copy size={14} />Copy settings</button>
        <button className="btn ghost small" onClick={() => api.open('https://deadlockconfig.com/docs/hpbars/')}>HP bar pak builder</button>
      </div>
    </>
  )
}
