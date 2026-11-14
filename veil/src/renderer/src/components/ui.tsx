import * as RSlider from '@radix-ui/react-slider'
import * as RSwitch from '@radix-ui/react-switch'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { animate, useMotionValue, useTransform } from 'motion/react'
import { useStore, computePack, clWanted } from '../lib/store'
import { api } from '../lib/api'
import { Check, X } from './icons'
import { AnimatePresence, motion } from 'motion/react'

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <RSwitch.Root className="switch" checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} onClick={(e) => e.stopPropagation()}>
      <RSwitch.Thumb className="thumb" />
    </RSwitch.Root>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="field">
      <div className="head"><span>{label}</span><b>{format ? format(value) : value}</b></div>
      <RSlider.Root className="slider" value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} aria-label={label}>
        <RSlider.Track className="track"><RSlider.Range className="range" /></RSlider.Track>
        <RSlider.Thumb className="knob" />
      </RSlider.Root>
    </div>
  )
}

/** Segmented control with a thumb that slides to the chosen option. */
export function Seg<T extends string>({ value, options, onChange, label, size }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; size?: 'small' }) {
  const id = useId()
  return (
    <div className={`seg ${size ?? ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.id === value && <motion.span layoutId={`seg-${id}`} className="seg-thumb" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
          <span className="seg-l">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** The tab cut into the top edge of a panel, carrying the wordmark. */
export function Notch({ label = 'VEIL' }: { label?: string }) {
  return <div className="notch" aria-hidden><span>{label}</span></div>
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

/** A number that rolls to its new value. */
export function Tween({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, format)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; mv.set(value); return }
    const c = animate(mv, value, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] })
    return () => c.stop()
  }, [value, mv])
  return <motion.span className="num">{text}</motion.span>
}

export const pct = (n: number) => (Math.abs(n) < 0.05 ? '±0%' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`)

export function GainText({ v }: { v?: number }) {
  if (v === undefined) return null
  return <span className={`gain ${Math.abs(v) < 0.05 ? 'zero' : ''}`}>{pct(v)}</span>
}

/** Applies the whole pack: gameinfo.gi convars plus autoexec.cfg. */
export async function applyPack() {
  const s = useStore.getState()
  const p = computePack(s)
  try {
    // 1. CompLock files: download what's on, remove what VEIL installed and is now off
    const wanted = clWanted(s)
    if (wanted.length || s.on.gameinfo !== undefined) {
      const off = api.onClProgress((pr) => { if (pr) s.say(`Downloading ${pr.title} from deadlockconfig.com ${pr.total ? Math.round((pr.done / pr.total) * 100) + '%' : ''}`) })
      try { await api.clSync(wanted, !!s.on.gameinfo) } finally { off() }
    }
    // 2. engine and console values, written on top of whichever gameinfo.gi is now in place
    const status = await api.apply(p.convars, p.autoexec)
    let pakNote = ''
    if (s.on.veilhud) pakNote = ` VEIL HUD installed as ${(await api.installHud(s.bar)).replace('_dir.vpk', '')}.`
    else await api.removeHud()
    s.set({ status })
    const scan = await api.scan().catch(() => null)
    if (scan) s.set({ installed: scan.paks.filter((p) => p.enabled).map((p) => p.name ?? '') })
    const cls = clWanted(s).length
    s.say(`Applied: ${cls ? `${cls} CompLock pak${cls > 1 ? 's' : ''}, ` : ''}${Object.keys(p.convars).length} engine and ${Object.keys(p.autoexec).length} console values.${pakNote} Restart Deadlock.`)
  } catch (e) {
    s.say(String((e as Error).message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'bad')
  }
}

export function Dock() {
  const s = useStore()
  const p = computePack(s)
  return (
    <div className="dock">
      <div className="fig"><b><Tween value={p.gain.avg} format={pct} /></b><span>average FPS</span></div>
      <div className="fig"><b><Tween value={p.gain.low} format={pct} /></b><span>1% lows</span></div>
      <div className="sep" />
      <div className="fig"><b><Tween value={p.items.length} format={(v) => String(Math.round(v))} /></b><span>in your config</span></div>
      <button className="btn brass" onClick={applyPack} disabled={!s.status?.found}>Apply to Deadlock</button>
    </div>
  )
}

export function Toast() {
  const t = useStore((s) => s.toast)
  return (
    <AnimatePresence>
      {t && (
        <motion.div className={`toast ${t.tone}`} role="status" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
          {t.tone === 'ok' ? <Check size={18} /> : <X size={18} />}
          {t.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
