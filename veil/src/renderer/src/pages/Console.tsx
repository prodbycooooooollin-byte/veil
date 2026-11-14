import { useMemo, useRef, useState } from 'react'
import { Copy, FileUp, X } from '../components/icons'
import { CVARS, CATS, parseCvarlist, type Cvar, type Cat } from '../data/cvars'
import { useStore, computePack } from '../lib/store'
import { PageHead, Switch } from '../components/ui'

let imported: Cvar[] = []

function score(v: Cvar, q: string): number {
  if (!q) return 1
  const n = v.name.toLowerCase()
  if (q.startsWith('^')) return n.startsWith(q.slice(1)) ? 3 : 0
  if (q.includes('*')) return new RegExp('^' + q.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(n) ? 3 : 0
  if (n === q) return 10
  if (n.startsWith(q)) return 6
  if (n.includes(q)) return 4
  return q.split(/\s+/).every((w) => (n + ' ' + v.desc.toLowerCase()).includes(w)) ? 1 : 0
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q && !/[*^]/.test(q) ? text.toLowerCase().indexOf(q) : -1
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

export default function Console() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Cat | null>(null)
  const [, force] = useState(0)
  const [sel, setSel] = useState<string>('fps_max')
  const file = useRef<HTMLInputElement>(null)

  const all = useMemo(() => [...CVARS, ...imported], [imported.length])
  const pack = computePack(s)
  const current = { ...pack.convars, ...pack.autoexec }
  const query = q.trim().toLowerCase()
  const list = all
    .filter((v) => !cat || v.cat === cat)
    .map((v) => [v, score(v, query)] as const)
    .filter(([, sc]) => sc > 0)
    .sort((a, b) => b[1] - a[1] || (query ? 0 : CATS.indexOf(a[0].cat) - CATS.indexOf(b[0].cat)) || a[0].name.localeCompare(b[0].name))
    .map(([v]) => v)
  const v = all.find((x) => x.name === sel) ?? list[0]
  // double-click: switches on/off values flip at once, others jump to the value field
  const quick = (x: Cvar) => {
    setSel(x.name)
    const cur = current[x.name] ?? x.def
    if (/^(true|false)$/.test(x.def)) {
      const next = cur === 'true' ? 'false' : 'true'
      s.setCustom(x.name, next)
      s.say(`${x.name} is now ${next}. Apply to write it.`)
    } else setTimeout(() => (document.querySelector('.setter input') as HTMLInputElement | null)?.select(), 30)
  }

  const importLog = async (f: File | undefined) => {
    if (!f) return
    const found = parseCvarlist(await f.text())
    if (!found.length) return s.say('No cvarlist output found. Run cvarlist in the console with -condebug, then pick console.log.', 'bad')
    imported = found
    force((n) => n + 1)
    s.say(`Imported ${found.length} more cvars from your game.`)
  }

  return (
    <div className="console">
      <div className="console-main">
        <PageHead title="Console" sub="Every setting the game reads. Switches flip right in the list; click any other row to set your own value on the right. Your values are written to the game when you apply." />
        <div className="prompt">
          <label>
            <span aria-hidden>›</span>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a cvar, or try ^citadel_crosshair or r_*fog*" aria-label="Search cvars" spellCheck={false} />
          </label>
          <div className="chips">
            <button className={`chip ${!cat ? 'on' : ''}`} onClick={() => setCat(null)}>All</button>
            {CATS.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(cat === c ? null : c)}>{c}</button>)}
            <button className="chip" onClick={() => file.current?.click()} title="Import the full list from console.log"><FileUp size={13} />Import from game</button>
            <input ref={file} type="file" accept=".log,.txt" hidden onChange={(e) => importLog(e.target.files?.[0])} />
            <span className="count num">{list.length} of {all.length}</span>
          </div>
        </div>
        <div className="cv-head" aria-hidden><span>Setting</span><span>Value</span><span>What it does</span><span>Written to</span></div>
        <div className="cv-list" role="listbox" aria-label="Cvars">
          {list.slice(0, 400).map((x) => {
            const val = s.custom[x.name] ?? current[x.name] ?? x.def
            const bool = /^(true|false)$/.test(x.def)
            return (
              <div key={x.name} role="option" tabIndex={0} aria-selected={v?.name === x.name} className={`cv ${v?.name === x.name ? 'sel' : ''} ${s.custom[x.name] !== undefined ? 'set' : ''}`}
                onClick={() => setSel(x.name)} onDoubleClick={() => quick(x)} onKeyDown={(e) => e.key === 'Enter' && quick(x)}>
                <span className="name"><Highlight text={x.name} q={query} /></span>
                <span className="def">{bool
                  ? <Switch checked={val === 'true'} onChange={(on) => { s.setCustom(x.name, on ? 'true' : 'false'); setSel(x.name) }} label={x.name} />
                  : val}</span>
                <span className="desc">{x.desc}</span>
                <span className={`via ${x.via === 'gi' ? 'gi' : 'ae'}`} title={x.via === 'gi' ? 'Only gameinfo.gi can set it' : 'autoexec.cfg or the console'}>{x.via === 'gi' ? 'gameinfo' : 'autoexec'}</span>
              </div>
            )
          })}
          {!list.length && <p className="empty">Nothing matches “{q}”. Start with ^ to match the beginning, or use * as a wildcard.</p>}
        </div>
      </div>
      <aside className="cv-side">{v ? <Side v={v} current={current[v.name]} key={v.name} /> : null}</aside>
    </div>
  )
}

function Side({ v, current }: { v: Cvar; current?: string }) {
  const s = useStore()
  const [val, setVal] = useState(s.custom[v.name] ?? current ?? v.def)
  const line = `${v.name} "${val}"`
  return (
    <>
      <h2>{v.name}</h2>
      <p className="d">{v.desc}</p>
      {/^(true|false)$/.test(v.def) && (
        <div className="cv-toggle">
          <span>{(s.custom[v.name] ?? current ?? v.def) === 'true' ? 'On' : 'Off'}</span>
          <Switch checked={(s.custom[v.name] ?? current ?? v.def) === 'true'} onChange={(on) => { s.setCustom(v.name, on ? 'true' : 'false'); setVal(on ? 'true' : 'false') }} label={v.name} />
        </div>
      )}
      <dl className="kv">
        <dt>Default</dt><dd>{v.def}</dd>
        {v.range && <><dt>Range</dt><dd>{v.range}</dd></>}
        <dt>In your config</dt><dd>{current ?? 'not set'}</dd>
        <dt>Where it goes</dt><dd>{v.via === 'gi' ? 'gameinfo.gi (engine-only value)' : 'autoexec.cfg or the console'}</dd>
        <dt>Group</dt><dd>{v.cat}</dd>
        {v.flags?.length ? <><dt>Flags</dt><dd>{v.flags.join(', ')}</dd></> : null}
      </dl>
      <div className="setter">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { s.setCustom(v.name, val); s.say(`${v.name} set to ${val}. Apply to write it.`) } }} aria-label={`Value for ${v.name}`} spellCheck={false} />
        <button className="btn primary" onClick={() => { s.setCustom(v.name, val); s.say(`${v.name} set to ${val}. Apply to write it.`) }}>Set</button>
      </div>
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn ghost small" onClick={() => { navigator.clipboard.writeText(line); s.say('Copied the console line.') }}><Copy size={14} />Copy line</button>
        {s.custom[v.name] !== undefined && <button className="btn ghost small" onClick={() => { s.setCustom(v.name, null); setVal(current ?? v.def) }}><X size={14} />Clear my value</button>}
      </div>
      {Object.keys(s.custom).length > 0 && (
        <div className="overrides">
          <h4>Your values</h4>
          <ul>{Object.entries(s.custom).map(([k, val2]) => <li key={k}><code>{k}</code><span className="faint">{val2}</span></li>)}</ul>
        </div>
      )}
    </>
  )
}
