import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Copy, ClipboardPaste, Plus, Trash2, ZoomIn } from 'lucide-react'
import { CrosshairSVG } from '../components/CrosshairSVG'
import { LIBRARY, gameFit, extent, type XSpec } from '../lib/crosshair'
import { useStore } from '../lib/store'
import { api, isApp } from '../lib/api'
import { PageHead, Seg, Slider, Switch, applyPack } from '../components/ui'

const CL = 'https://deadlockconfig.com/docs/img/'
const SCENES = [
  { id: 'fight', label: 'Fight', src: CL + 'particles-before.webp' },
  { id: 'street', label: 'Street', src: CL + 'pack/street-stock.webp' },
  { id: 'lane', label: 'Lane', src: CL + 'pack/fov-fight.webp' },
  { id: 'bright', label: 'Bright', src: CL + 'pack/lighting-after.webp' },
  { id: 'flat', label: 'Grey', src: '' },
]
const SWATCHES = ['#ffffff', '#00ffff', '#5fe0c4', '#9cff7a', '#f0cf86', '#ffd400', '#ff5a4f', '#ff2d95', '#b48cff', '#000000']

export default function Crosshair() {
  const s = useStore()
  const xh = s.xh
  const [scene, setScene] = useState('fight')
  const [zoom, setZoom] = useState(1)
  const [overlay, setOverlay] = useState(false)
  const fit = gameFit(xh)

  useEffect(() => api.onOverlayState(setOverlay), [])
  useEffect(() => { if (overlay) api.sendOverlaySpec(xh) }, [xh, overlay])

  const set = (p: Partial<XSpec>) => s.setXh(p)
  const part = <K extends keyof XSpec>(k: K, p: Partial<XSpec[K] & object>) => s.setXh({ [k]: { ...(xh[k] as object), ...p } } as Partial<XSpec>)
  const choose = (spec: XSpec) => s.set({ xh: structuredClone(spec) })

  const share = () => { navigator.clipboard.writeText('VEIL-XH:' + btoa(JSON.stringify(xh))); s.say('Share code copied. Anyone with VEIL can paste it.') }
  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (!t.startsWith('VEIL-XH:')) throw new Error()
      choose({ ...xh, ...JSON.parse(atob(t.slice(8))) })
      s.say('Crosshair loaded from the share code.')
    } catch { s.say('The clipboard has no VEIL crosshair code. Codes start with VEIL-XH:', 'bad') }
  }
  const save = () => {
    const n = s.xhSaved.length + 1
    s.set({ xhSaved: [...s.xhSaved, { ...structuredClone(xh), name: `Mine ${n}` }] })
    s.say(`Saved as Mine ${n}.`)
  }
  const toggleOverlay = async () => {
    const next = !overlay
    await api.setOverlay(next, xh)
    setOverlay(next)
    s.say(next ? (isApp ? 'Overlay on. Alt+Shift+X turns it off from inside the game.' : 'Overlay works in the installed app.') : 'Overlay off.')
  }
  const sc = SCENES.find((x) => x.id === scene)!

  return (
    <div className="xh-page">
      <PageHead
        title="Crosshair"
        sub="Pick one, shape it, then use it in game or as an overlay that can draw anything."
        actions={<>
          <Seg label="Where it shows" value={s.xhMode} onChange={(xhMode) => s.set({ xhMode })} options={[{ id: 'game', label: 'In game' }, { id: 'overlay', label: 'Overlay' }]} />
          {s.xhMode === 'game'
            ? <button className="btn brass" onClick={applyPack} disabled={!s.status?.found}>Apply to Deadlock</button>
            : <button className={`btn ${overlay ? 'live' : 'brass'}`} onClick={toggleOverlay}>{overlay ? <><span className="live-dot" />Overlay on</> : 'Turn overlay on'}</button>}
        </>}
      />

      <div className="xh-main">
        <section className="xh-stage">
          <div className={`xh-view ${sc.src ? '' : 'flat'}`}>
            {sc.src && <img src={sc.src} alt="" />}
            <div className="xh-center"><CrosshairSVG s={xh} zoom={zoom} /></div>
            <div className="xh-tools">
              <div className="seg small" role="group" aria-label="Scene">
                {SCENES.map((x) => <button key={x.id} aria-pressed={scene === x.id} onClick={() => setScene(x.id)}>{x.label}</button>)}
              </div>
              <button className={`tool ${zoom > 1 ? 'on' : ''}`} onClick={() => setZoom(zoom > 1 ? 1 : 4)} aria-pressed={zoom > 1}><ZoomIn size={15} />{zoom > 1 ? '4×' : '1:1'}</button>
            </div>
            <div className={`xh-fit ${s.xhMode === 'game' && !fit.ok ? 'warn' : ''}`}>
              {fit.ok ? <><Check size={14} />Works in game and as overlay</>
                : s.xhMode === 'game' ? <>In game this loses: {fit.lost.join(', ')}. Switch to Overlay to keep them.</>
                : <>Overlay only: {fit.lost.join(', ')}</>}
            </div>
          </div>

          <div className="xh-library">
            {s.xhSaved.length > 0 && (
              <LibGroup title="Mine">
                {s.xhSaved.map((x, i) => (
                  <Tile key={i} x={x} on={xh.name === x.name} onPick={() => choose(x)} onRemove={() => s.set({ xhSaved: s.xhSaved.filter((_, j) => j !== i) })} />
                ))}
              </LibGroup>
            )}
            {LIBRARY.map((g) => (
              <LibGroup key={g.group} title={g.group}>
                {g.items.map((x) => <Tile key={x.name} x={x} on={xh.name === x.name} onPick={() => choose(x)} />)}
              </LibGroup>
            ))}
          </div>
        </section>

        <aside className="xh-editor">
          <div className="xh-editor-head">
            <b>{xh.name}</b>
            <div className="row-actions">
              <button className="iconbtn" onClick={save} title="Save to Mine" aria-label="Save to Mine"><Plus size={16} /></button>
              <button className="iconbtn" onClick={share} title="Copy share code" aria-label="Copy share code"><Copy size={15} /></button>
              <button className="iconbtn" onClick={paste} title="Paste share code" aria-label="Paste share code"><ClipboardPaste size={15} /></button>
            </div>
          </div>

          <Section title="Colour" open>
            <div className="swatches">
              {SWATCHES.map((c) => <button key={c} className="swatch" style={{ background: c }} aria-pressed={xh.color === c} onClick={() => set({ color: c })} aria-label={c} />)}
              <input type="color" value={xh.color} onChange={(e) => set({ color: e.target.value })} aria-label="Custom colour" />
            </div>
            <div className="toggle-row"><span>Gradient<small>Overlay only</small></span><Switch checked={!!xh.color2} onChange={(v) => set({ color2: v ? '#d4a855' : null })} label="Gradient" /></div>
            {xh.color2 && <div className="swatches">{SWATCHES.slice(0, 9).map((c) => <button key={c} className="swatch sm" style={{ background: c }} aria-pressed={xh.color2 === c} onClick={() => set({ color2: c })} aria-label={c} />)}<input type="color" value={xh.color2} onChange={(e) => set({ color2: e.target.value })} aria-label="Gradient end" /></div>}
            <Slider label="Opacity" value={xh.opacity} min={0.1} max={1} step={0.05} onChange={(opacity) => set({ opacity })} format={(v) => `${Math.round(v * 100)}%`} />
          </Section>

          <Section title="Lines" on={xh.lines.on} onToggle={(on) => part('lines', { on })}>
            <div className="row2">
              <Slider label="Length" value={xh.lines.length} min={1} max={40} onChange={(length) => part('lines', { length })} />
              <Slider label="Thickness" value={xh.lines.thickness} min={0.5} max={8} step={0.5} onChange={(thickness) => part('lines', { thickness })} />
            </div>
            <Slider label="Gap" value={xh.lines.gap} min={0} max={30} onChange={(gap) => part('lines', { gap })} />
            <div className="toggle-row"><span>Own vertical length<small>Overlay only</small></span><Switch checked={xh.lines.lengthV !== null} onChange={(v) => part('lines', { lengthV: v ? xh.lines.length : null })} label="Own vertical length" /></div>
            {xh.lines.lengthV !== null && <Slider label="Vertical length" value={xh.lines.lengthV} min={1} max={40} onChange={(lengthV) => part('lines', { lengthV })} />}
            <div className="chips">
              <button className={`chip ${xh.lines.rotate ? 'on' : ''}`} onClick={() => part('lines', { rotate: xh.lines.rotate ? 0 : 45 })}>Rotate 45°</button>
              <button className={`chip ${xh.lines.tShape ? 'on' : ''}`} onClick={() => part('lines', { tShape: !xh.lines.tShape })}>T-shape</button>
              <button className={`chip ${xh.lines.taper ? 'on' : ''}`} onClick={() => part('lines', { taper: !xh.lines.taper })}>Tapered</button>
              <button className={`chip ${xh.lines.round ? 'on' : ''}`} onClick={() => part('lines', { round: !xh.lines.round })}>Rounded</button>
            </div>
          </Section>

          <Section title="Centre dot" on={xh.dot.on} onToggle={(on) => part('dot', { on })}>
            <Slider label="Size" value={xh.dot.size} min={1} max={12} step={0.5} onChange={(size) => part('dot', { size })} />
            <Seg label="Dot shape" value={xh.dot.shape} onChange={(shape) => part('dot', { shape })} options={[{ id: 'circle', label: 'Circle' }, { id: 'square', label: 'Square' }, { id: 'diamond', label: 'Diamond' }]} />
          </Section>

          <Section title="Ring" on={xh.ring.on} onToggle={(on) => part('ring', { on })}>
            <div className="row2">
              <Slider label="Radius" value={xh.ring.radius} min={3} max={60} onChange={(radius) => part('ring', { radius })} />
              <Slider label="Thickness" value={xh.ring.thickness} min={0.5} max={5} step={0.5} onChange={(thickness) => part('ring', { thickness })} />
            </div>
            <Slider label="Segments" value={xh.ring.segments} min={0} max={12} onChange={(segments) => part('ring', { segments })} format={(v) => (v ? String(v) : 'Solid')} />
          </Section>

          <Section title="Brackets" on={xh.brackets.on} onToggle={(on) => part('brackets', { on })}>
            <div className="row2">
              <Slider label="Size" value={xh.brackets.size} min={2} max={20} onChange={(size) => part('brackets', { size })} />
              <Slider label="Distance" value={xh.brackets.gap} min={3} max={40} onChange={(gap) => part('brackets', { gap })} />
            </div>
            <Slider label="Thickness" value={xh.brackets.thickness} min={0.5} max={5} step={0.5} onChange={(thickness) => part('brackets', { thickness })} />
          </Section>

          <Section title="Chevron" on={xh.chevron.on} onToggle={(on) => part('chevron', { on })}>
            <div className="row2">
              <Slider label="Size" value={xh.chevron.size} min={3} max={20} onChange={(size) => part('chevron', { size })} />
              <Slider label="Offset" value={xh.chevron.offset} min={0} max={30} onChange={(offset) => part('chevron', { offset })} />
            </div>
            <Slider label="Thickness" value={xh.chevron.thickness} min={0.5} max={5} step={0.5} onChange={(thickness) => part('chevron', { thickness })} />
          </Section>

          <Section title="Outline" on={xh.outline.on} onToggle={(on) => part('outline', { on })}>
            <div className="row2">
              <Slider label="Width" value={xh.outline.width} min={0.5} max={3} step={0.5} onChange={(width) => part('outline', { width })} />
              <Slider label="Opacity" value={xh.outline.opacity} min={0.1} max={1} step={0.05} onChange={(opacity) => part('outline', { opacity })} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
            <div className="swatches">{['#000000', '#ffffff', '#d4a855', '#ff3b3b', '#00ffff'].map((c) => <button key={c} className="swatch sm" style={{ background: c }} aria-pressed={xh.outline.color === c} onClick={() => part('outline', { color: c })} aria-label={`Outline ${c}`} />)}<input type="color" value={xh.outline.color} onChange={(e) => part('outline', { color: e.target.value })} aria-label="Custom outline colour" /></div>
          </Section>

          <Section title="Glow" on={xh.glow.on} onToggle={(on) => part('glow', { on })} note="Overlay only">
            <Slider label="Size" value={xh.glow.size} min={2} max={20} onChange={(size) => part('glow', { size })} />
          </Section>

          <Section title="Motion" note="Overlay only">
            <Seg label="Motion" value={xh.motion} onChange={(motion) => set({ motion })} options={[{ id: 'none', label: 'Still' }, { id: 'pulse', label: 'Pulse' }, { id: 'spin', label: 'Spin' }, { id: 'breathe', label: 'Breathe' }]} />
            <Slider label="Overlay scale" value={xh.scale} min={0.5} max={3} step={0.1} onChange={(scale) => set({ scale })} format={(v) => `${v.toFixed(1)}×`} />
          </Section>

          <Section title="In-game extras">
            <Slider label="Hit marker" value={s.cross.hitMarker} min={0} max={0.5} step={0.02} onChange={(hitMarker) => s.setCross({ hitMarker })} format={(v) => `${v.toFixed(2)} s`} />
            <div className="toggle-row"><span>Hero reticles<small>Off gives every hero this crosshair</small></span><Switch checked={s.cross.heroReticles} onChange={(heroReticles) => s.setCross({ heroReticles })} label="Hero reticles" /></div>
          </Section>

          {s.xhMode === 'overlay' && (
            <p className="xh-note">The overlay draws over the game in borderless windowed mode. Alt+Shift+X turns it on and off from inside the game.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function LibGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lib-group">
      <h4>{title}</h4>
      <div className="lib-grid">{children}</div>
    </div>
  )
}

function Tile({ x, on, onPick, onRemove }: { x: XSpec; on: boolean; onPick: () => void; onRemove?: () => void }) {
  const fit = gameFit(x)
  return (
    <div className={`xh-tile ${on ? 'on' : ''}`}>
      <button onClick={onPick} aria-pressed={on} aria-label={x.name}>
        <span className="art"><CrosshairSVG s={x} zoom={Math.min(1.6, 22 / extent(x))} animate={false} /></span>
        <span className="nm">{x.name}</span>
        {!fit.ok && <span className="ov" title="Overlay only">OV</span>}
      </button>
      {onRemove && <button className="rm" onClick={onRemove} aria-label={`Delete ${x.name}`}><Trash2 size={12} /></button>}
    </div>
  )
}

function Section({ title, on, onToggle, note, open, children }: { title: string; on?: boolean; onToggle?: (v: boolean) => void; note?: string; open?: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(!!open || !!on)
  useEffect(() => { if (on) setExpanded(true) }, [on])
  return (
    <section className={`acc ${expanded ? 'open' : ''}`}>
      <header>
        <button className="acc-h" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          <ChevronDown size={15} className="chev" />
          <span>{title}</span>
          {note && <small>{note}</small>}
        </button>
        {onToggle && <Switch checked={!!on} onChange={onToggle} label={`${title} on`} />}
      </header>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div className="acc-b" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
            <div className={`acc-in ${onToggle && !on ? 'dim' : ''}`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
