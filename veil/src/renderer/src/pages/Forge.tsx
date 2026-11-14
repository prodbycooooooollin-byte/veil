import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { RotateCcw, Copy } from '../components/icons'
import { ForgeScene, DamageNumbers, BAR_W, BAR_H, type Tab } from '../forge/Scene'
import { Sim } from '../forge/sim'
import { STYLES, drawBar } from '../lib/hpbar'
import { useHeroes } from '../lib/heroes'
import { useStore, DEFAULT_BAR, DEFAULT_CROSS, computePack, type Bar } from '../lib/store'
import { Seg, Slider, Switch, applyPack } from '../components/ui'
import { api } from '../lib/api'

const TABS: { id: Tab; label: string }[] = [
  { id: 'bar', label: 'Bar' }, { id: 'colors', label: 'Colours' }, { id: 'number', label: 'Number' }, { id: 'stamina', label: 'Stamina' }, { id: 'ult', label: 'Ult' },
{ id: 'damage', label: 'Damage' }, { id: 'hero', label: 'Hero' }, { id: 'export', label: 'Apply' },
]
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

  return (
    <div className="forge">
      <ForgeScene hero={hero} sim={sim} tab={tab} barRef={barRef} dmgRef={dmgRef} />
      <div className="overhead" ref={dmgRef} aria-hidden><DamageNumbers sim={sim} /></div>
      <canvas
        ref={barRef} className={`overhead bar ${['bar', 'colors', 'number', 'stamina', 'ult'].includes(tab) ? 'editing' : ''}`}
        style={{ width: BAR_W, height: BAR_H }} onClick={() => setTab('bar')} title="Edit the bar" aria-label="Health bar preview"
      />


      <div className="forge-title">
        <h1>Forge</h1>
        <p>Shape what you see in a fight. Click the bar over {hero?.name ?? 'the hero'} to edit it; drag to look around.</p>
      </div>

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
          <button className="btn ghost small" onClick={() => s.set({ bar: DEFAULT_BAR })} aria-label="Reset this part"><RotateCcw size={14} />Reset</button>
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
    c.width = 104 * dpr; c.height = 40 * dpr
    drawBar(c.getContext('2d')!, 104, 40, dpr, { ...bar, style: id, width: 84, height: Math.min(bar.height, 9), numberSize: 11, debuffs: false }, side, { hp: 1580, max: 2340, lag: 1800, stamina: 2, debuffs: 0 })
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
