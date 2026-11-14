import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, ArrowRight, Play } from 'lucide-react'
import { BENCH } from '../data/benchmarks'
import { byId } from '../data/mods'
import { useStore, computePack, type Page } from '../lib/store'
import { api } from '../lib/api'
import { KITS, play, renderKit } from '../lib/sound'
import { drawBar } from '../lib/hpbar'
import { Seg, Tween, pct } from '../components/ui'
import { CrosshairSVG } from '../components/CrosshairSVG'

const ease = [0.2, 0.8, 0.2, 1] as const

export default function Lobby() {
  const s = useStore()
  const pack = computePack(s)
  const [mode, setMode] = useState<'cpu' | 'gpu'>('cpu')
  const [foreign, setForeign] = useState(0)
  const rows = mode === 'cpu' ? BENCH.cpu : BENCH.gpu
  const top = Math.max(...rows.map((r) => r.avg))
  const yours = Math.round(BENCH.vanilla.avg * (1 + pack.gain.avg / 100))
  const go = (page: Page) => s.set({ page })

  useEffect(() => {
    if (!s.status?.found) return
    api.scan().then((r) => setForeign(r.paks.filter((p) => p.kind !== 'skin').length + r.leftovers.length)).catch(() => {})
  }, [s.status?.found])

  return (
    <div className="home">
      {foreign > 0 && (
        <motion.button className="home-alert" onClick={() => go('install')} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <AlertTriangle size={16} />
          <span><b>{foreign} mods and files from other tools are still in your game.</b> They can override what you set here, like an old health bar mod.</span>
          <span className="ha-go">Review<ArrowRight size={14} /></span>
        </motion.button>
      )}

      <section className="home-hero">
        <motion.div className="home-copy" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <h1 className="display">Clear fights.<br />More frames.</h1>
          <p>Measured performance mods, engine settings written safely, and a HUD you shape yourself before it reaches the game.</p>
          <div className="ctas">
            <button className="btn primary lg" onClick={() => go('mods')}>Build your pack</button>
            <button className="btn ghost lg" onClick={() => go('forge')}>Open the Forge</button>
          </div>
        </motion.div>

        <motion.div className="frames-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8, ease }}>
          <div className="frames-head"><span>Frames drawn in the same 40 ms</span><span className="faint">average frame rate</span></div>
          <FrameLane label="Vanilla" fps={BENCH.vanilla.avg} tone="bone" />
          <FrameLane label="Your pack" fps={yours} tone="patina" estimate />
          <p className="frames-foot">Vanilla is CompLock’s measured average. Your pack adds the measured gain of each mod you have on.</p>
        </motion.div>
      </section>

      <section className="tiles">
        <Tile className="t-pack" title="Pack" action="Edit mods" onClick={() => go('mods')}>
          <div className="t-pack-fig">
            <div><b className="gain"><Tween value={pack.gain.avg} format={pct} /></b><span>average FPS</span></div>
            <div><b><Tween value={pack.gain.low} format={pct} /></b><span>1% lows</span></div>
          </div>
          <div className="t-chips">
            {pack.items.map((i) => <span key={i.id} className={`t-chip ${byId[i.id]?.source === 'veil' ? 'veil' : ''}`}>{i.name}</span>)}
          </div>
        </Tile>
        <Tile className="t-xh" title="Crosshair" action={s.xh.name} onClick={() => go('crosshair')}>
          <div className="t-xh-art"><img src="https://deadlockconfig.com/docs/img/pack/street-stock.webp" alt="" /><div><CrosshairSVG s={s.xh} zoom={2} /></div></div>
        </Tile>
        <Tile className="t-bar" title="Health bar" action={s.bar.style[0].toUpperCase() + s.bar.style.slice(1)} onClick={() => go('forge')}>
          <BarThumb />
        </Tile>
        <Tile className="t-sound" title="Hit sounds" action={`${KITS.length} kits`} onClick={() => go('sound')}>
          <div className="t-kits">
            {KITS.slice(0, 4).map((k) => (
              <span key={k.id} role="button" tabIndex={0} className="t-kit" style={{ ['--kit' as string]: k.hue }}
                onClick={(e) => { e.stopPropagation(); renderKit(k, 'body').then((b) => play(b, { start: 0, end: b.duration, db: 0, pitch: 1 })) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); renderKit(k, 'body').then((b) => play(b, { start: 0, end: b.duration, db: 0, pitch: 1 })) } }}>
                <Play size={11} />{k.name}
              </span>
            ))}
          </div>
        </Tile>
      </section>

      <section className="bench">
        <div>
          <h2>Measured, not promised</h2>
          <p className="lead">Each mod on its own against the same baseline, replaying the five busiest team fights of a public match. {BENCH.launches} launches and {(BENCH.frames / 1e6).toFixed(1)} million frames.</p>
          <p className="rig">{BENCH.rig}. Numbers by CompLock, <a href="#" onClick={(e) => { e.preventDefault(); api.open(BENCH.source) }}>method on deadlockconfig.com</a>.</p>
        </div>
        <div>
          <div className="bench-head">
            <Seg label="Bottleneck" value={mode} onChange={setMode} options={[{ id: 'cpu', label: 'Processor-bound' }, { id: 'gpu', label: 'Graphics-bound' }]} />
            <div className="legend"><span><i style={{ background: 'var(--bone)' }} />Average</span><span><i style={{ background: 'var(--patina)' }} />1% lows</span></div>
          </div>
          <div className="bench-list">
            {rows.map((r, i) => (
              <div className="bench-row" key={mode + i}>
                <div className="n">{r.name}{'sub' in r && r.sub ? <small>{r.sub}</small> : null}</div>
                <div className="bars">
                  <motion.i style={{ background: 'var(--bone)', width: `${(r.avg / top) * 100}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: i * 0.03, ease }} />
                  <motion.i style={{ background: 'var(--patina)', width: `${(r.low / top) * 100}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: i * 0.03 + 0.06, ease }} />
                </div>
                <div className="v">{pct(r.avg)}</div>
                <div className="v gain">{pct(r.low)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Tile({ className, title, action, onClick, children }: { className: string; title: string; action: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={`tile ${className}`} role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="tile-top"><span>{title}</span><span className="tile-act">{action}<ArrowRight size={13} /></span></div>
      <div className="tile-body">{children}</div>
    </div>
  )
}

function BarThumb() {
  const ref = useRef<HTMLCanvasElement>(null)
  const bar = useStore((s) => s.bar)
  useEffect(() => {
    const c = ref.current!, dpr = 2
    c.width = 220 * dpr; c.height = 76 * dpr
    drawBar(c.getContext('2d')!, 220, 76, dpr, { ...bar, width: 160 }, 'enemy', { hp: 1640, max: 2340, lag: 1900, stamina: 2, debuffs: 1, ult: 1 })
  }, [bar])
  return <canvas ref={ref} style={{ width: 220, height: 76 }} />
}

/**
 * One lane of frames: a tick for every frame at the given average rate, drifting from right to left at 1/60
 * of real time. The denser lane is the faster one.
 */
function FrameLane({ label, fps, tone, estimate }: { label: string; fps: number; tone: 'bone' | 'patina'; estimate?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef(fps)
  fpsRef.current = fps
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const t0 = performance.now()
    const draw = (now: number) => {
      const dpr = Math.min(2, devicePixelRatio || 1)
      const w = c.clientWidth, h = c.clientHeight
      if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const windowMs = 40, ft = 1000 / fpsRef.current
      const shift = reduce ? 0 : (((now - t0) / 60) % ft)
      const col = tone === 'patina' ? '95,224,196' : '237,228,211'
      ctx.fillStyle = 'rgba(237,228,211,.07)'
      for (let ms = 0; ms <= windowMs; ms += 10) ctx.fillRect(Math.round((ms / windowMs) * (w - 1)), 0, 1, h)
      for (let t = -shift; t < windowMs; t += ft) {
        if (t < 0) continue
        const x = (t / windowMs) * w
        ctx.fillStyle = `rgba(${col},${0.85 * Math.min(1, x / 40)})`
        ctx.fillRect(Math.round(x), h * 0.18, 2, h * 0.64)
      }
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [tone])
  return (
    <div className={`lane ${tone}`}>
      <div className="lane-l"><span>{label}</span><b><Tween value={fps} format={(v) => String(Math.round(v))} /><small> fps{estimate ? ' est.' : ''}</small></b></div>
      <canvas ref={ref} />
    </div>
  )
}
