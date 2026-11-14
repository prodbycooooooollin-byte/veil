import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutGrid, Layers, Wand2, Crosshair as CrossIcon, AudioLines, TerminalSquare, HardDriveDownload, Minus, Square, Copy, X, Download, RotateCw } from './components/icons'
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
import Settings from './pages/Settings'
import { NavIcon, type NavName, Download as DownloadIcon } from './components/icons'

const Forge = lazy(() => import('./pages/Forge'))

type NavItem = { id: Page; label: string; icon: NavName }
const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ id: 'lobby', label: 'Home', icon: 'home' }] },
  { group: 'Performance', items: [{ id: 'mods', label: 'Mods', icon: 'mods' }, { id: 'console', label: 'Console', icon: 'console' }] },
  { group: 'Look and feel', items: [{ id: 'forge', label: 'Forge', icon: 'forge' }, { id: 'crosshair', label: 'Crosshair', icon: 'crosshair' }, { id: 'sound', label: 'Hit sounds', icon: 'sound' }] },
  { group: 'Game', items: [{ id: 'install', label: 'Game', icon: 'game' }] },
]
const PAGES = { lobby: Lobby, mods: Mods, forge: Forge, crosshair: Crosshair, sound: Sound, console: Console, install: Install, settings: Settings }

export default function App() {
  const page = useStore((s) => s.page)
  const set = useStore((s) => s.set)
  const status = useStore((s) => s.status)
  const prefs = useStore((s) => s.prefs)
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion) }, [prefs.reduceMotion])
  const [max, setMax] = useState(false)
  const [version, setVersion] = useState('')
  const [upd, setUpd] = useState<UpdateState>({ state: 'idle' })

  useEffect(() => { api.detect().then((status) => set({ status })).catch(() => set({ status: null })) }, [set])
  useEffect(() => { api.version().then(setVersion) }, [])
  useEffect(() => api.onWinState(setMax), [])
  useEffect(() => api.onUpdate(setUpd), [])
  // load the 3D Forge in the background so opening it later is instant
  useEffect(() => { const t = setTimeout(() => { import('./pages/Forge') }, 1200); return () => clearTimeout(t) }, [])

  const P = PAGES[page] ?? Lobby

  return (
    <>
      {page === 'lobby' && prefs.background && !prefs.reduceMotion && <Liquid tint="#d4a855" />}
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
              {g.items.map(({ id, label, icon }) => (
                <button key={id} className={`side-item ${page === id ? 'on' : ''}`} onClick={() => set({ page: id })} aria-current={page === id ? 'page' : undefined}>
                  {page === id && <motion.span layoutId="side-active" className="side-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <NavIcon name={icon} active={page === id} />
                  <span className="side-name">{label}</span>
                  <SideHint id={id} />
                </button>
              ))}
            </div>
          ))}
          <div className="grow" />
          <PackCard />
          <button className={`side-item side-settings ${page === 'settings' ? 'on' : ''}`} onClick={() => set({ page: 'settings' })} aria-current={page === 'settings' ? 'page' : undefined}>
            {page === 'settings' && <motion.span layoutId="side-active" className="side-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <NavIcon name="settings" active={page === 'settings'} />
            <span className="side-name">Settings</span>
            <span className="hint ver">{version}</span>
          </button>
        </nav>

        <main className="stage">
          {/* the new page shows at once; a short fade-in is the only transition */}
          <motion.div key={page} className="page" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
            <Suspense fallback={null}><P /></Suspense>
          </motion.div>
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
            : <><DownloadIcon size={13} />Downloading update<span className="bar"><i style={{ width: `${u.percent ?? 0}%` }} /></span></>}
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
