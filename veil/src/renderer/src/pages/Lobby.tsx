import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { BENCH } from '../data/benchmarks'
import { useStore, computePack } from '../lib/store'
import { api } from '../lib/api'
import { KITS } from '../lib/sound'
import { drawBar } from '../lib/hpbar'
import { Seg, Tween, pct } from '../components/ui'
import { CrosshairSVG } from '../components/CrosshairSVG'

const ease = [0.2, 0.8, 0.2, 1] as const

export default function Lobby() {
  const s = useStore()
  const pack = computePack(s)
  const [mode, setMode] = useState<'cpu' | 'gpu'>('cpu')
  const rows = mode === 'cpu' ? BENCH.cpu : BENCH.gpu
  const top = Math.max(...rows.map((r) => r.avg))
  const yours = Math.round(BENCH.vanilla.avg * (1 + pack.gain.avg / 100))

  return (
    <div className="home">
      <section className="home-hero">
        <motion.div className="home-copy" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <h1 className="display">Clear fights.<br />More frames.</h1>
          <p>VEIL installs the measured CompLock mods, writes the engine settings for you, and lets you shape your health bars, crosshair and hit sounds before they reach the game.</p>
          <div className="ctas">
            <button className="btn primary lg" onClick={() => s.set({ page: 'mods' })}>Build your pack</button>
            <button className="btn ghost lg" onClick={() => s.set({ page: 'forge' })}>Open the Forge</button>
          </div>
        </motion.div>

        <motion.div className="frames-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.9 }}>
          <div className="frames-head">
            <span>Frames drawn in the same 40 ms</span>
            <span className="faint">At the average frame rate of each</span>
          </div>
          <FrameLane label="Vanilla" fps={BENCH.vanilla.avg} tone="bone" />
          <FrameLane label="Your pack" fps={yours} tone="patina" estimate />
          <p className="frames-foot">Vanilla is CompLock’s measured average. Your pack adds the measured gain of each mod you have on: <b className="gain"><Tween value={pack.gain.avg} format={pct} /></b></p>
        </motion.div>
      </section>

      <section className="home-cards">
        <Card title="Pack" onClick={() => s.set({ page: 'mods' })} meta={`${pack.items.length} mods on`}>
          <div className="card-big"><Tween value={pack.gain.avg} format={pct} /></div>
          <div className="card-sub">estimated average FPS</div>
        </Card>
        <Card title="Crosshair" onClick={() => s.set({ page: 'crosshair' })} meta={s.xh.name}>
          <div className="card-art"><CrosshairSVG s={s.xh} zoom={1.6} /></div>
        </Card>
        <Card title="Health bar" onClick={() => s.set({ page: 'forge' })} meta={s.bar.style[0].toUpperCase() + s.bar.style.slice(1)}>
          <div className="card-art"><BarThumb /></div>
        </Card>
        <Card title="Hit sound" onClick={() => s.set({ page: 'sound' })} meta={`${KITS.length} kits`}>
          <div className="card-wave">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: `${18 + Math.abs(Math.sin(i * 1.7)) * 70 * Math.exp(-i / 12)}%` }} />)}</div>
        </Card>
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

function Card({ title, meta, onClick, children }: { title: string; meta: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="home-card" onClick={onClick}>
      <div className="card-top"><span>{title}</span><ArrowUpRight size={15} className="card-go" /></div>
      <div className="card-body">{children}</div>
      <div className="card-meta">{meta}</div>
    </button>
  )
}

function BarThumb() {
  const ref = useRef<HTMLCanvasElement>(null)
  const bar = useStore((s) => s.bar)
  useEffect(() => {
    const c = ref.current!, dpr = 2
    c.width = 180 * dpr; c.height = 60 * dpr
    drawBar(c.getContext('2d')!, 180, 60, dpr, { ...bar, width: 140 }, 'enemy', { hp: 1640, max: 2340, lag: 1900, stamina: 2, debuffs: 1 })
  }, [bar])
  return <canvas ref={ref} style={{ width: 180, height: 60 }} />
}

/**
 * One lane of frames: a tick for every frame at the given average rate, scrolling slowly from right to left.
 * The denser lane is the faster one. 40 ms of game time are shown; the strip moves at 1/60 of real time.
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
      const windowMs = 40
      const ft = 1000 / fpsRef.current
      const shift = reduce ? 0 : (((now - t0) / 60) % ft)
      const col = tone === 'patina' ? '95,224,196' : '237,228,211'
      // grid every 10 ms
      ctx.fillStyle = 'rgba(237,228,211,.08)'
      for (let ms = 0; ms <= windowMs; ms += 10) ctx.fillRect(Math.round((ms / windowMs) * (w - 1)), 0, 1, h)
      for (let t = -shift; t < windowMs; t += ft) {
        if (t < 0) continue
        const x = (t / windowMs) * w
        const fade = Math.min(1, x / 40)
        ctx.fillStyle = `rgba(${col},${0.85 * fade})`
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
