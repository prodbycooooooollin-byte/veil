import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutGrid, Layers, Wand2, Crosshair as CrossIcon, AudioLines, TerminalSquare, HardDriveDownload, Minus, Square, Copy, X, Download, RotateCw } from 'lucide-react'
import { useStore, type Page } from './lib/store'
import { api, isApp, type UpdateState } from './lib/api'
import { Liquid } from './fx/Liquid'
import { Toast, Tween, pct, applyPack } from './components/ui'
import { CrosshairSVG } from './components/CrosshairSVG'
import { computePack } from './lib/store'
import logo from './assets/logo.svg'
import Lobby from './pages/Lobby'
import Mods from './pages/Mods'
import Sound from './pages/Sound'
import Console from './pages/Console'
import Install from './pages/Install'
import Crosshair from './pages/Crosshair'

const Forge = lazy(() => import('./pages/Forge'))

type NavItem = { id: Page; label: string; icon: typeof LayoutGrid }
const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ id: 'lobby', label: 'Home', icon: LayoutGrid }] },
  { group: 'Performance', items: [{ id: 'mods', label: 'Mods', icon: Layers }, { id: 'console', label: 'Console', icon: TerminalSquare }] },
  { group: 'Look and feel', items: [{ id: 'forge', label: 'Forge', icon: Wand2 }, { id: 'crosshair', label: 'Crosshair', icon: CrossIcon }, { id: 'sound', label: 'Hit sounds', icon: AudioLines }] },
  { group: 'Game', items: [{ id: 'install', label: 'Game', icon: HardDriveDownload }] },
]
const PAGES = { lobby: Lobby, mods: Mods, forge: Forge, crosshair: Crosshair, sound: Sound, console: Console, install: Install }

export default function App() {
  const page = useStore((s) => s.page)
  const set = useStore((s) => s.set)
  const status = useStore((s) => s.status)
  const [max, setMax] = useState(false)
  const [version, setVersion] = useState('')
  const [upd, setUpd] = useState<UpdateState>({ state: 'idle' })

  useEffect(() => { api.detect().then((status) => set({ status })).catch(() => set({ status: null })) }, [set])
  useEffect(() => { api.version().then(setVersion) }, [])
  useEffect(() => api.onWinState(setMax), [])
  useEffect(() => api.onUpdate(setUpd), [])

  const P = PAGES[page] ?? Lobby

  return (
    <>
      <Liquid tint="#d4a855" dim={page === 'lobby' ? 1 : 0} />
      <div className="grain" aria-hidden />
      <div className="app">
        <header className="topbar">
          <div className="spacer" />
          <UpdatePill u={upd} />
          <button className="status" onClick={() => set({ page: 'install' })}>
            <span className={`dot ${status?.found ? 'ok' : 'bad'}`} />
            {status?.found ? 'Deadlock found' : status ? 'Deadlock not found' : 'Looking for Deadlock'}
          </button>
          <div className="winbtns">
            <button aria-label="Minimise" onClick={() => api.win('min')}><Minus size={15} /></button>
            <button aria-label={max ? 'Restore' : 'Maximise'} onClick={() => api.win('max')}>{max ? <Copy size={12} style={{ transform: 'scaleX(-1)' }} /> : <Square size={12} />}</button>
            <button aria-label="Close" className="x" onClick={() => api.win('close')}><X size={16} /></button>
          </div>
        </header>

        <nav className="side" aria-label="Sections">
          <div className="side-brand"><img src={logo} alt="" width={30} height={30} /><div><b>VEIL</b><span>for Deadlock</span></div></div>
          {NAV.map((g, gi) => (
            <div className="side-group" key={gi}>
              {g.group && <div className="side-label">{g.group}</div>}
              {g.items.map(({ id, label, icon: I }) => (
                <button key={id} className={`side-item ${page === id ? 'on' : ''}`} onClick={() => set({ page: id })} aria-current={page === id ? 'page' : undefined}>
                  {page === id && <motion.span layoutId="side-active" className="side-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <I size={17} strokeWidth={1.8} />
                  <span className="side-name">{label}</span>
                  <SideHint id={id} />
                </button>
              ))}
            </div>
          ))}
          <div className="grow" />
          <PackCard />
          <div className="side-foot">
            <span>VEIL {version}</span>
            <button onClick={() => api.checkUpdate().then((r) => r && setUpd(r))} title="Check for updates" aria-label="Check for updates"><RotateCw size={13} /></button>
          </div>
        </nav>

        <main className="stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={page} className="page"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Suspense fallback={null}><P /></Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toast />
    </>
  )
}

function UpdatePill({ u }: { u: UpdateState }) {
  if (!isApp) return null
  const show = u.state === 'downloading' || u.state === 'ready'
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className={`update ${u.state}`} onClick={() => u.state === 'ready' && api.installUpdate()}
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          disabled={u.state !== 'ready'}
        >
          {u.state === 'ready'
            ? <><RotateCw size={13} />Restart to update{u.version ? ` to ${u.version}` : ''}</>
            : <><Download size={13} />Downloading update<span className="bar"><i style={{ width: `${u.percent ?? 0}%` }} /></span></>}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** The live state each section is in, shown right in the sidebar. */
function SideHint({ id }: { id: Page }) {
  const s = useStore()
  if (id === 'mods') return <span className="hint gain"><Tween value={computePack(s).gain.avg} format={pct} /></span>
  if (id === 'crosshair') return <span className="hint xh"><CrosshairSVG s={s.xh} zoom={0.75} animate={false} /></span>
  if (id === 'forge') return <span className="hint bar"><i style={{ background: s.side === 'enemy' ? s.bar.enemy : s.bar.ally }} /></span>
  if (id === 'sound') return <span className="hint wave">{[5, 9, 6, 11, 4, 7, 3].map((h, i) => <i key={i} style={{ height: h }} />)}</span>
  if (id === 'console') { const n = Object.keys(s.custom).length; return n ? <span className="hint count">{n}</span> : null }
  if (id === 'install') return <span className={`hint dot ${s.status?.found ? 'ok' : 'bad'}`} />
  return null
}

function PackCard() {
  const s = useStore()
  const p = computePack(s)
  return (
    <div className="pack-card">
      <div className="pc-top"><span>Your pack</span><span className="faint">{p.items.length} mods</span></div>
      <div className="pc-fig"><Tween value={p.gain.avg} format={pct} /><small>avg FPS</small></div>
      <div className="pc-meter"><i style={{ width: `${Math.min(100, p.gain.avg / 0.7)}%` }} /></div>
      <button className="btn brass" onClick={applyPack} disabled={!s.status?.found}>Apply to Deadlock</button>
    </div>
  )
}
