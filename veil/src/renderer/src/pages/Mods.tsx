import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronsLeftRight, Lock, ArrowUpRight } from '../components/icons'
import { MODS, GROUPS, byId, COMPLOCK_URL, type Mod } from '../data/mods'
import { useStore, isInstalled, computePack } from '../lib/store'
import { api } from '../lib/api'
import { drawBar } from '../lib/hpbar'
import { GainText, Switch, Tween, pct, Notch } from '../components/ui'

const ORDER: Mod['group'][] = ['hud', 'engine', 'effects', 'visibility', 'tweaks', 'potato']

/**
 * The config: every setting VEIL can write, as switches. Left the list, middle the selected setting
 * shown big, right what it does and what it is worth.
 */
export default function Mods() {
  const [sel, setSel] = useState('particles')
  const s = useStore()
  const set = s.set
  useEffect(() => { api.scan().then((r) => set({ installed: r.paks.filter((q) => q.enabled).map((q) => q.name ?? '') })).catch(() => {}) }, [set])
  const m = byId[sel]
  const onCount = MODS.filter((x) => s.on[x.id]).length
  const pack = computePack(s)

  return (
    <div className="cfg">
      <aside className="cfg-list">
        <header className="cfg-head">
          <h1 className="h-wide">Your config</h1>
          <div className="cfg-sum"><span><b>{onCount}</b> of {MODS.length} on</span><span className="gain"><Tween value={pack.gain.avg} format={pct} /> FPS</span></div>
        </header>
        <div className="cfg-scroll">
          {ORDER.map((g) => {
            const items = MODS.filter((x) => x.group === g)
            if (!items.length) return null
            return (
              <section key={g}>
                <div className="cfg-group"><b>{GROUPS[g].name}</b><span>{items.filter((x) => s.on[x.id]).length}/{items.length}</span></div>
                {items.map((x) => (
                  <div key={x.id} role="button" tabIndex={0} className={`cfg-row ${sel === x.id ? 'sel' : ''} ${s.on[x.id] ? 'on' : ''}`} onClick={() => setSel(x.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(x.id)}>
                    <span className="t">{x.name}</span>
                    <span className="s">{x.id === 'veilhud' ? <b className="forge-hint">Customise it in the Forge</b> : x.source === 'veil' ? 'VEIL' : x.source === 'complock' ? `CompLock${x.author ? ' · ' + x.author : ''}` : 'Tweak'}{x.gain ? <> · <GainText v={x.gain.avg} /></> : null}</span>
                    {x.locked ? <Lock size={14} className="faint" aria-label="Always on" /> : <Switch checked={!!s.on[x.id]} onChange={() => s.toggle(x.id)} label={`Use ${x.name}`} />}
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      </aside>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={m.id} className="cfg-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <Detail m={m} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Dots({ n, of = 5 }: { n: number; of?: number }) {
  return <span className="dots" aria-hidden>{Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>
}
/** 0–5 dots from a measured gain or an estimated impact. */
const strength = (m: Mod, avg?: number) => avg !== undefined ? Math.max(1, Math.min(5, Math.round(avg / 2))) : m.impact ? { small: 1, medium: 2, large: 4 }[m.impact] : 0

function Detail({ m }: { m: Mod }) {
  const s = useStore()
  const chosen = m.options?.find((o) => o.id === s.opt[m.id]) ?? m.options?.[0]
  const g = chosen?.gain ?? m.gain
  const lines = { ...m.convars, ...chosen?.convars, ...m.autoexec, ...chosen?.autoexec }
  const on = !!s.on[m.id]

  return (
    <>
      <section className="cfg-hero">
        {m.id === 'veilhud' ? <HudPreview />
          : m.before && m.after ? <Compare before={m.before} after={m.after} />
          : m.shots ? <Gallery shots={m.shots} />
          : m.before || m.after ? <img className="cfg-img" src={m.after ?? m.before} alt="" />
          : <div className="cfg-ph"><span>{m.name}</span></div>}
        <Notch />
        {m.source === 'complock' && (m.pak || m.gameinfo) && (
          <span className={`cfg-state ${isInstalled(m, s.installed) ? 'ok' : ''}`}>{isInstalled(m, s.installed) ? 'In your game' : 'Downloads when you apply'}</span>
        )}
        <div className="cut">
          <h2 className="h-wide">{m.name}</h2>
          <Dots n={strength(m, g?.avg)} />
          <p>{m.blurb}</p>
          {m.locked
            ? <span className="cta off" aria-disabled><span>Always on</span><span className="cta-go"><Lock size={13} /></span></span>
            : (
              <button className={`cta ${on ? 'off' : ''}`} onClick={() => s.toggle(m.id)}>
                {g && <span className="cta-fig">{pct(g.avg)}</span>}
                <span>{on ? 'In your config' : 'Add to config'}</span>
                <span className="cta-go"><ArrowUpRight size={14} /></span>
              </button>
            )}
          {m.id === 'veilhud' && (
            <button className={`cta ${on ? '' : 'off'}`} onClick={() => s.set({ page: 'forge' })}>
              <span>Customise it in the Forge</span>
              <span className="cta-go"><ArrowUpRight size={14} /></span>
            </button>
          )}
        </div>
      </section>

      <aside className="cfg-side">
        <div className="card">
          <h4>{g ? 'Frame rate' : 'Impact'}</h4>
          {g ? (
            <>
              <div className="duo">
                <div><b className="num">{pct(g.avg)}</b><span>average FPS</span></div>
                <div><b className="num lows">{pct(g.low)}</b><span>1% lows</span></div>
              </div>
              <Wave avg={g.avg} low={g.low} />
            </>
          ) : m.impact ? <p>Estimated {m.impact} impact. Not part of CompLock’s benchmark.</p> : <p>A feel and visibility setting, not a performance one.</p>}
        </div>

        {m.options && (
          <div className="card">
            <h4>Variant</h4>
            <div className="opts" role="radiogroup" aria-label={`${m.name} options`}>
              {m.options.map((o) => (
                <button key={o.id} className="opt" role="radio" aria-pressed={chosen?.id === o.id} aria-checked={chosen?.id === o.id} onClick={() => s.pick(m.id, o.id)}>
                  <span className="r" />
                  <span><b>{o.label}</b>{o.note && <small>{o.note}</small>}</span>
                  {o.gain ? <GainText v={o.gain.avg} /> : <span />}
                </button>
              ))}
            </div>
          </div>
        )}

        {m.ingame && (
          <div className="card">
            <h4>In game</h4>
            <p>{m.ingame}</p>
          </div>
        )}

        <div className="card grow">
          <h4>What it does</h4>
          <p>{m.detail}</p>
          {m.conflicts && <p className="warn">{m.conflicts}</p>}
          {Object.keys(lines).length > 0 && (
            <div className="cv-lines">{Object.entries(lines).map(([k, v]) => <div key={k}><code>{k}</code> <span className="faint">{v}</span></div>)}</div>
          )}
          <div className="by">
            {m.source === 'complock'
              ? <>By {m.author ?? 'CompLock'} · <a href="#" onClick={(e) => { e.preventDefault(); api.open(COMPLOCK_URL) }}>deadlockconfig.com</a> · <a href="#" onClick={(e) => { e.preventDefault(); api.open('https://ko-fi.com/deadlockconfig') }}>support them</a></>
              : <>VEIL · written to {m.convars || chosen?.convars ? 'gameinfo.gi' : m.id === 'veilhud' ? 'a pak in addons' : 'autoexec.cfg'}</>}
          </div>
        </div>
      </aside>
    </>
  )
}

/** A strip of bars whose height follows the gain, so a bigger gain reads as a louder wave. */
function Wave({ avg, low }: { avg: number; low: number }) {
  const n = 42
  const amp = Math.min(1, Math.max(0.12, Math.abs(avg) / 10))
  const bars = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const env = Math.sin(t * Math.PI) ** 0.6
    const noise = (Math.sin(i * 12.9898 + avg) * 43758.5453) % 1
    return Math.max(0.08, env * amp * (0.55 + Math.abs(noise) * 0.45))
  })
  return (
    <div className="wave" aria-hidden>
      {bars.map((h, i) => <motion.i key={i} initial={{ scaleY: 0 }} animate={{ scaleY: h }} transition={{ duration: 0.5, delay: i * 0.008 }} className={i % 3 === 0 && low > avg ? 'lo' : ''} />)}
    </div>
  )
}

function Compare({ before, after }: { before: string; after: string }) {
  const [split, setSplit] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: RPE) => {
    const r = ref.current!.getBoundingClientRect()
    setSplit(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)))
  }
  return (
    <div
      ref={ref} className="compare" style={{ ['--split' as string]: `${split}%` }}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e) }}
      onPointerMove={(e) => e.buttons && move(e)}
      role="slider" aria-label="Before and after" aria-valuenow={Math.round(split)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') setSplit((v) => Math.max(0, v - 5)); if (e.key === 'ArrowRight') setSplit((v) => Math.min(100, v + 5)) }}
    >
      <img src={before} alt="Before" draggable={false} />
      <img src={after} alt="After" className="after" draggable={false} />
      <div className="handle"><span><ChevronsLeftRight size={18} /></span></div>
      <span className="lbl l">Stock</span>
      <span className="lbl r">With the mod</span>
    </div>
  )
}

function Gallery({ shots }: { shots: { src: string; caption: string }[] }) {
  return (
    <div className="gallery">
      {shots.slice(0, 5).map((s) => (
        <figure key={s.src}><img src={s.src} alt={s.caption} loading="lazy" /><figcaption>{s.caption}</figcaption></figure>
      ))}
    </div>
  )
}

/** VEIL HUD's hero image: your own bar from the Forge, enemy and ally, drawn big. Click opens the Forge. */
function HudPreview() {
  const bar = useStore((s) => s.bar)
  const set = useStore((s) => s.set)
  const enemy = useRef<HTMLCanvasElement>(null)
  const ally = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const W = 300, H = 92, dpr = 2
    for (const [ref, side, hp] of [[enemy, 'enemy', 1480], [ally, 'ally', 2010]] as const) {
      const c = ref.current
      if (!c) continue
      c.width = W * dpr; c.height = H * dpr
      drawBar(c.getContext('2d')!, W, H, dpr, { ...bar, width: Math.min(220, bar.width * 1.6) }, side, { hp, max: 2340, lag: hp + 260, stamina: 2, debuffs: 1, ult: 1 })
    }
  }, [bar])
  return (
    <button className="hud-preview" onClick={() => set({ page: 'forge' })} aria-label="Open the Forge">
      <span className="k">Your design, from the Forge</span>
      <canvas ref={enemy} style={{ width: 300, height: 92 }} />
      <canvas ref={ally} style={{ width: 300, height: 92 }} />
      <span className="hp-go">Click to change it</span>
    </button>
  )
}
