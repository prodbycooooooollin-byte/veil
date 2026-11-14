import { useRef, useState, type PointerEvent as RPE } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronsLeftRight, Download, FileInput, ExternalLink, Lock } from 'lucide-react'
import { MODS, GROUPS, byId, COMPLOCK_URL, type Mod } from '../data/mods'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { GainText, PageHead, Switch, pct } from '../components/ui'

const ORDER: Mod['group'][] = ['hud', 'engine', 'effects', 'visibility', 'tweaks']

export default function Mods() {
  const [sel, setSel] = useState('particles')
  const on = useStore((s) => s.on)
  const toggle = useStore((s) => s.toggle)
  const m = byId[sel]

  return (
    <div className="mods">
      <aside className="mods-list">
        <PageHead title="Mods" sub="Every CompLock mod and VEIL tweak. Turn them on, then apply once." />
        {ORDER.map((g) => (
          <section key={g}>
            <div className="group-h"><b>{GROUPS[g].name}</b><span>{MODS.filter((x) => x.group === g && on[x.id]).length} of {MODS.filter((x) => x.group === g).length} on</span></div>
            {MODS.filter((x) => x.group === g).map((x) => (
              <div key={x.id} role="button" tabIndex={0} className={`mod-row ${sel === x.id ? 'sel' : ''}`} onClick={() => setSel(x.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(x.id)}>
                <span className="t">{x.name}{x.source === 'veil' ? <span className="tag veil">VEIL</span> : null}</span>
                {x.locked ? <Lock size={14} className="faint" aria-label="Always on" /> : <Switch checked={!!on[x.id]} onChange={() => toggle(x.id)} label={`Use ${x.name}`} />}
                <span className="s">{x.blurb}</span>
                <span className="g">{x.gain ? <GainText v={x.gain.avg} /> : x.impact ? <Impact level={x.impact} /> : null}</span>
              </div>
            ))}
          </section>
        ))}
      </aside>
      <AnimatePresence mode="wait">
        <motion.article key={m.id} className="mod-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Detail m={m} />
        </motion.article>
      </AnimatePresence>
    </div>
  )
}

function Impact({ level }: { level: 'small' | 'medium' | 'large' }) {
  const n = { small: 1, medium: 2, large: 3 }[level]
  return <span className="impact" aria-label={`Estimated impact: ${level}`}>{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} style={{ width: 12, height: 4 }} />)}</span>
}

function Detail({ m }: { m: Mod }) {
  const s = useStore()
  const chosen = m.options?.find((o) => o.id === s.opt[m.id]) ?? m.options?.[0]
  const g = chosen?.gain ?? m.gain
  const lines = { ...m.convars, ...chosen?.convars, ...m.autoexec, ...chosen?.autoexec }

  const installPak = async () => {
    try {
      const r = await api.installPak()
      if (r.names.length) { s.set({ status: r.status }); s.say(`Installed ${r.names.join(', ')} in addons.`) }
    } catch (e) { s.say(String((e as Error).message), 'bad') }
  }
  const installGi = async () => {
    try { s.set({ status: await api.installGameinfo() }); s.say('CompLock’s gameinfo.gi is in place. Your original is backed up.') } catch (e) { s.say(String((e as Error).message), 'bad') }
  }

  return (
    <>
      {m.before && m.after ? <Compare before={m.before} after={m.after} />
        : m.shots ? <Gallery shots={m.shots} />
        : m.before || m.after ? <div className="compare" style={{ cursor: 'default' }}><img src={m.after ?? m.before} alt="" /></div>
        : <div className="placeholder-art"><span className="display">{m.name.split(' ')[0]}</span></div>}

      <div className="detail-body">
        <div>
          <h2>{m.name}</h2>
          <div className="by">
            {m.source === 'complock'
              ? <>By {m.author} for CompLock · <a href="#" onClick={(e) => { e.preventDefault(); api.open(COMPLOCK_URL) }}>deadlockconfig.com</a></>
              : <>A VEIL tweak, written to {m.convars || chosen?.convars ? 'gameinfo.gi' : 'autoexec.cfg'}</>}
          </div>
          <p className="text">{m.detail}</p>
          {m.conflicts && <p className="warn">{m.conflicts}</p>}
          {Object.keys(lines).length > 0 && (
            <div className="cv-lines">{Object.entries(lines).map(([k, v]) => <div key={k}><code>{k}</code> <span className="faint">{v}</span></div>)}</div>
          )}
        </div>
        <div>
          {g ? (
            <div className="stats">
              <div><b className="num" style={{ color: g.avg > 0 ? 'var(--bone)' : 'var(--ash)' }}>{pct(g.avg)}</b><span>average FPS</span></div>
              <div><b className="num" style={{ color: g.low > 0 ? 'var(--patina)' : 'var(--ash)' }}>{pct(g.low)}</b><span>1% lows</span></div>
            </div>
          ) : m.impact ? (
            <div className="stats"><div><div className="impact" style={{ height: 46, alignItems: 'center' }}>{[1, 2, 3].map((i) => <i key={i} className={i <= { small: 1, medium: 2, large: 3 }[m.impact!] ? 'on' : ''} />)}</div><span>estimated {m.impact} impact, not benchmarked</span></div></div>
          ) : null}

          {m.options && (
            <div className="opts" role="radiogroup" aria-label={`${m.name} options`}>
              {m.options.map((o) => (
                <button key={o.id} className="opt" role="radio" aria-pressed={chosen?.id === o.id} aria-checked={chosen?.id === o.id} onClick={() => s.pick(m.id, o.id)}>
                  <span className="r" />
                  <span><b>{o.label}</b>{o.note && <small>{o.note}</small>}</span>
                  {o.gain ? <GainText v={o.gain.avg} /> : <span />}
                </button>
              ))}
            </div>
          )}

          <div className="actions">
            {!m.locked && (
              <button className={`btn ${s.on[m.id] ? 'ghost' : 'primary'}`} onClick={() => s.toggle(m.id)}>{s.on[m.id] ? 'Remove from pack' : 'Add to pack'}</button>
            )}
            {m.pak && <button className="btn ghost" onClick={() => api.open(COMPLOCK_URL)}><Download size={16} />Get the pak</button>}
            {m.pak && <button className="btn ghost" onClick={installPak} disabled={!s.status?.found}><FileInput size={16} />Install pak file</button>}
            {m.gameinfo && <button className="btn ghost" onClick={() => api.open(COMPLOCK_URL)}><ExternalLink size={16} />Get CompLock’s pack</button>}
            {m.gameinfo && <button className="btn ghost" onClick={installGi} disabled={!s.status?.found}><FileInput size={16} />Use their gameinfo.gi</button>}
          </div>
        </div>
      </div>
    </>
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
      <div className="handle"><span><ChevronsLeftRight size={20} /></span></div>
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
