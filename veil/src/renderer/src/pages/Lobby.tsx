import { lazy, Suspense, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, ArrowUpRight } from '../components/icons'
import { BENCH } from '../data/benchmarks'
import { MODS, byId } from '../data/mods'
import { useStore, computePack, type Page } from '../lib/store'
import { api } from '../lib/api'
import { useHeroes } from '../lib/heroes'
import { Tween, pct, applyPack, Notch } from '../components/ui'
import { Silhouette } from '../components/Silhouette'

// three.js only loads when the home page shows the hero
const HeroStage = lazy(() => import('../components/HeroStage').then((m) => ({ default: m.HeroStage })))
const ease = [0.2, 0.8, 0.2, 1] as const

export default function Lobby() {
  const s = useStore()
  const pack = computePack(s)
  const [foreign, setForeign] = useState(0)
  const { heroes } = useHeroes()
  const hero = heroes.find((h) => h.id === s.hero) ?? heroes.find((h) => h.name === 'Haze') ?? heroes[0]
  const yours = Math.round(BENCH.vanilla.avg * (1 + pack.gain.avg / 100))
  const go = (page: Page) => s.set({ page })
  const onCount = MODS.filter((m) => s.on[m.id]).length

  useEffect(() => {
    if (!s.status?.found) return
    api.scan().then((r) => { setForeign(r.paks.filter((p) => p.kind !== 'skin' && !p.veil).length + r.leftovers.length); s.set({ installed: r.paks.filter((p) => p.enabled).map((p) => p.name ?? '') }) }).catch(() => {})
  }, [s.status?.found])

  return (
    <div className="home5">
      <section className="h5-hero">
        <div className="h5-word" aria-hidden>VEIL</div>
        <div className="h5-model">
          <Suspense fallback={<Silhouette color={hero?.color} />}>{hero ? <HeroStage hero={hero} /> : <Silhouette />}</Suspense>
        </div>
        <Notch />

        <nav className="h5-pills" aria-label="Quick links">
          <button className="pill" onClick={() => go('mods')}>Config</button>
          <button className="pill" onClick={() => go('forge')}>Forge</button>
          <button className="pill" onClick={() => go('crosshair')}>Crosshair</button>
        </nav>
        {foreign > 0 && (
          <button className="pill warnpill" onClick={() => go('install')}><AlertTriangle size={14} />{foreign} files from other tools</button>
        )}

        <motion.div className="h5-copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <span className="k">Deadlock, tuned</span>
          <h1 className="h-wide">The perfect<br />config.</h1>
          <p>Switch settings on and off, apply once. VEIL writes them into the game and downloads CompLock’s files for you.</p>
          <div className="h5-ctas">
            <button className="round" onClick={() => go('mods')} aria-label="Open the config"><ArrowUpRight size={16} /></button>
            <button className="cta off" onClick={() => go('forge')}>
              <span>{s.on.veilhud ? 'Design your HUD in the Forge' : 'Your own HUD: try the Forge'}</span>
              <span className="cta-go"><ArrowUpRight size={14} /></span>
            </button>
          </div>
        </motion.div>

        <div className="cut">
          <h2 className="h-wide">Your config</h2>
          <div className="chipline">
            {MODS.filter((m) => s.on[m.id]).slice(0, 4).map((m) => <span key={m.id}>{byId[m.id].name}</span>)}
            {onCount > 4 && <span>+{onCount - 4}</span>}
          </div>
          <p>{onCount} settings on. Estimated {pct(pack.gain.low)} on your 1% lows.</p>
          <button className="cta" onClick={applyPack} disabled={!s.status?.found}>
            <span className="cta-fig"><Tween value={pack.gain.avg} format={pct} /></span>
            <span>Apply to Deadlock</span>
            <span className="cta-go"><ArrowUpRight size={14} /></span>
          </button>
        </div>
      </section>

      <aside className="h5-side">
        <div className="card">
          <h4>Measured,<br />not promised</h4>
          <p>Every gain is CompLock’s benchmark: {BENCH.launches} launches, {(BENCH.frames / 1e6).toFixed(1)} million frames in the busiest team fights.</p>
          <BenchWave />
        </div>
        <div className="card ring-card">
          <button className="round sm ring-go" onClick={() => go('mods')} aria-label="Open the config"><ArrowUpRight size={14} /></button>
          <Ring vanilla={BENCH.vanilla.avg} yours={yours} />
          <h4>Frame rate</h4>
          <p>{BENCH.vanilla.avg} fps stock, about {yours} fps with your config. Measured on {BENCH.rig.split(',')[0]}.</p>
        </div>
      </aside>
    </div>
  )
}

/** One bar per benchmarked mod, height = its average gain. Hover shows the name. */
function BenchWave() {
  const rows = [...BENCH.cpu, ...BENCH.gpu]
  const top = Math.max(...rows.map((r) => r.avg))
  const bars = Array.from({ length: 44 }, (_, i) => rows[i % rows.length])
  return (
    <div className="wave tall" aria-hidden>
      {bars.map((r, i) => <motion.i key={i} title={r.name} initial={{ scaleY: 0 }} animate={{ scaleY: Math.max(0.08, (r.avg / top) * (0.6 + 0.4 * Math.sin((i / 43) * Math.PI))) }} transition={{ duration: 0.6, delay: i * 0.01, ease }} />)}
    </div>
  )
}

/** A metal ring that fills with the share of frames your config adds. */
function Ring({ vanilla, yours }: { vanilla: number; yours: number }) {
  const r = 62, c = 2 * Math.PI * r
  const share = Math.min(1, Math.max(0.04, (yours - vanilla) / vanilla / 0.6))
  return (
    <div className="ring">
      <svg viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="0.5" stopColor="#6b6b6b" /><stop offset="1" stopColor="#e8e8e8" /></linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="url(#ringg)" strokeWidth="9" opacity="0.22" />
        <motion.circle cx="80" cy="80" r={r} fill="none" stroke="url(#ringg)" strokeWidth="9" strokeLinecap="round" transform="rotate(-90 80 80)"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - share) }} transition={{ duration: 1, ease }} />
      </svg>
      <div className="ring-l"><b><Tween value={yours} format={(v) => String(Math.round(v))} /></b><span>fps est.</span></div>
    </div>
  )
}
