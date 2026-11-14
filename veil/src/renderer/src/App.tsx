import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Square, Copy, X, RotateCw, ArrowUpRight } from './components/icons'
import { useStore, type Page } from './lib/store'
import { api, isApp, type UpdateState } from './lib/api'
import { Toast, Tween, pct, applyPack, Notch } from './components/ui'
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
// one column of round icon buttons, grouped by thin rules: home | config | look | game
const NAV: NavItem[][] = [
  [{ id: 'lobby', label: 'Home', icon: 'home' }],
  [{ id: 'mods', label: 'Config', icon: 'mods' }, { id: 'console', label: 'Console', icon: 'console' }],
  [{ id: 'forge', label: 'Forge · design your HUD', icon: 'forge' }, { id: 'crosshair', label: 'Crosshair', icon: 'crosshair' }, { id: 'sound', label: 'Hit sounds', icon: 'sound' }],
  [{ id: 'install', label: 'Game', icon: 'game' }],
]
const PAGES = { lobby: Lobby, mods: Mods, forge: Forge, crosshair: Crosshair, sound: Sound, console: Console, install: Install, settings: Settings }
const TITLES: Record<Page, string> = { lobby: 'Home', mods: 'Config', forge: 'Forge', crosshair: 'Crosshair', sound: 'Hit sounds', console: 'Console', install: 'Game', settings: 'Settings' }

export default function App() {
  const page = useStore((s) => s.page)
  const set = useStore((s) => s.set)
  const prefs = useStore((s) => s.prefs)
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion) }, [prefs.reduceMotion])
  const [max, setMax] = useState(false)
  const [upd, setUpd] = useState<UpdateState>({ state: 'idle' })

  useEffect(() => { api.detect().then((status) => set({ status })).catch(() => set({ status: null })) }, [set])
  useEffect(() => api.onWinState(setMax), [])
  useEffect(() => api.onUpdate(setUpd), [])
  // load the 3D Forge in the background so opening it later is instant
  useEffect(() => { const t = setTimeout(() => { import('./pages/Forge') }, 1200); return () => clearTimeout(t) }, [])

  const P = PAGES[page] ?? Lobby
  // these pages lay out their own panels; the rest sit in one panel with the notch
  const bare = page === 'lobby' || page === 'mods'

  return (
    <>
      <div className="ambient" aria-hidden />
      <div className={`app ${max ? 'max' : ''}`}>
        <nav className="rail" aria-label="Sections">
          <button className="rail-logo" onClick={() => set({ page: 'lobby' })} aria-label="VEIL home"><img src={logo} alt="" width={26} height={26} /></button>
          <div className="rail-items">
            {NAV.map((g, gi) => (
              <div className="rail-group" key={gi}>
                {g.map(({ id, label, icon }) => <RailBtn key={id} id={id} label={label} icon={icon} />)}
              </div>
            ))}
          </div>
          <RailBtn id="settings" label="Settings" icon="settings" />
        </nav>

        <header className="topbar">
          <div className="crumbs"><span className="faint">VEIL</span><span className="sep">/</span><b>{TITLES[page]}</b></div>
          <div className="spacer" />
          <UpdatePill u={upd} />
          <StatusPill />
          <ApplyPill />
          <div className="winbtns">
            <button aria-label="Minimise" onClick={() => api.win('min')}><Minus size={14} /></button>
            <button aria-label={max ? 'Restore' : 'Maximise'} onClick={() => api.win('max')}>{max ? <Copy size={11} style={{ transform: 'scaleX(-1)' }} /> : <Square size={11} />}</button>
            <button aria-label="Close" className="x" onClick={() => api.win('close')}><X size={14} /></button>
          </div>
        </header>

        <main className={`stage ${bare ? 'bare' : ''}`}>
          {!bare && <Notch />}
          <motion.div key={page} className="page" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.14 }}>
            <Suspense fallback={null}><P /></Suspense>
          </motion.div>
        </main>
      </div>
      <Toast />
    </>
  )
}

function RailBtn({ id, label, icon }: NavItem) {
  const page = useStore((s) => s.page)
  const set = useStore((s) => s.set)
  const on = page === id
  return (
    <button className={`rail-btn ${on ? 'on' : ''}`} onClick={() => set({ page: id })} aria-label={label} aria-current={on ? 'page' : undefined} data-tip={label}>
      {on && <motion.span layoutId="rail-active" className="rail-active" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
      <NavIcon name={icon} active={on} size={20} />
    </button>
  )
}

function StatusPill() {
  const status = useStore((s) => s.status)
  const set = useStore((s) => s.set)
  return (
    <button className="pill" onClick={() => set({ page: 'install' })}>
      <span className={`dot ${status?.found ? 'ok' : 'bad'}`} />
      {status?.found ? 'Deadlock found' : status ? 'Deadlock not found' : 'Looking for Deadlock'}
    </button>
  )
}

/** Always in reach: what the config is worth, and the button that writes it. */
function ApplyPill() {
  // subscribes to two values only, so the top bar doesn't re-render on every slider tick elsewhere
  const gain = useStore((s) => computePack(s).gain.avg)
  const found = useStore((s) => !!s.status?.found)
  return (
    <button className="cta" onClick={applyPack} disabled={!found} title={found ? 'Write your config into Deadlock' : 'Deadlock was not found'}>
      <span className="cta-fig"><Tween value={gain} format={pct} /></span>
      <span className="cta-l">Apply config</span>
      <span className="cta-go"><ArrowUpRight size={14} /></span>
    </button>
  )
}

function UpdatePill({ u }: { u: UpdateState }) {
  if (!isApp) return null
  const show = u.state === 'downloading' || u.state === 'ready'
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className={`pill update ${u.state}`} onClick={() => u.state === 'ready' && api.installUpdate()}
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          disabled={u.state !== 'ready'}
        >
          {u.state === 'ready'
            ? <><RotateCw size={13} />Restart to update{u.version ? ` to ${u.version}` : ''}</>
            : <><DownloadIcon size={13} />Updating<span className="bar"><i style={{ width: `${u.percent ?? 0}%` }} /></span></>}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
