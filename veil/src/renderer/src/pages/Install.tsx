import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, FolderOpen, Undo2, Shirt, LayoutPanelTop, Sparkles, Volume2, Map, Box, HelpCircle, Layers, AlertTriangle, RotateCcw, FileInput } from 'lucide-react'
import { useStore, computePack } from '../lib/store'
import { api, isApp, type Scan, type ScannedPak, type PakKind } from '../lib/api'
import { PageHead, applyPack } from '../components/ui'

const KIND: Record<PakKind, { label: string; icon: typeof Shirt; tone: string; keep: boolean }> = {
  skin: { label: 'Skin', icon: Shirt, tone: 'var(--patina)', keep: true },
  hud: { label: 'HUD', icon: LayoutPanelTop, tone: 'var(--brass)', keep: false },
  effects: { label: 'Effects', icon: Sparkles, tone: '#b48cff', keep: false },
  sound: { label: 'Sound', icon: Volume2, tone: '#7cc8ff', keep: false },
  map: { label: 'Map', icon: Map, tone: '#c08457', keep: false },
  model: { label: 'Model', icon: Box, tone: '#c08457', keep: false },
  mixed: { label: 'Mixed', icon: Layers, tone: 'var(--bone-2)', keep: false },
  unknown: { label: 'Unknown', icon: HelpCircle, tone: 'var(--ember)', keep: false },
}
const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)
const err = (e: unknown) => String((e as Error).message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const baseName = (n?: string) => (n ?? '').split(/\s[-–(]/)[0].trim().toLowerCase()

export default function Install() {
  const s = useStore()
  const st = s.status
  const pack = computePack(s)
  const [scan, setScan] = useState<Scan | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const refresh = () => api.scan().then((r) => { setScan(r); setSel(new Set()) }).catch(() => setScan(null))
  useEffect(() => { if (st?.found) refresh() }, [st?.found])

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    try { const r = await fn(); if (r && typeof r === 'object' && 'paks' in (r as object) && 'leftovers' in (r as object)) { setScan(r as Scan); setSel(new Set()) } if (ok) s.say(ok) } catch (e) { s.say(err(e), 'bad') }
    setBusy(false)
  }

  const paks = scan?.paks ?? []
  const leftovers = scan?.leftovers ?? []
  const all = [...paks.map((p) => 'addons/' + p.file), ...leftovers.map((l) => l.file)]
  const notSkins = [...paks.filter((p) => !KIND[p.kind].keep).map((p) => 'addons/' + p.file), ...leftovers.map((l) => l.file)]
  const dupes = useMemo(() => {
    const seen: Record<string, ScannedPak[]> = {}
    for (const p of paks) if (p.name) (seen[baseName(p.name)] ??= []).push(p)
    return Object.values(seen).filter((g) => g.length > 1)
  }, [paks])
  const toggle = (r: string) => setSel((x) => { const n = new Set(x); n.has(r) ? n.delete(r) : n.add(r); return n })
  const managed = Object.keys(st?.managedConvars ?? {}).length
  const foreign = paks.filter((p) => !KIND[p.kind].keep).length + leftovers.length

  return (
    <div className="game">
      <PageHead
        title="Game"
        sub={<>What is installed in Deadlock right now, and a clean way back to stock.{!isApp && ' Browser preview: this shows sample data and touches no files.'}</>}
        actions={<>
          <button className="btn ghost" onClick={() => run(api.pick)}><FolderOpen size={15} />{st?.found ? 'Change folder' : 'Pick folder'}</button>
          <button className="btn brass" onClick={applyPack} disabled={!st?.found}>Apply pack</button>
        </>}
      />

      <div className="game-grid">
        <section className="g-status">
          <Stat ok={!!st?.found} label="Deadlock" value={st?.found ? 'Found' : 'Not found'} sub={st?.gamePath ?? 'Looked in every Steam library'} />
          <Stat ok={foreign === 0} warn={foreign > 0} label="From other tools" value={scan ? (foreign ? `${foreign} items` : 'Clean') : '…'} sub={foreign ? 'Mods and files VEIL didn’t install' : 'Nothing left over'} />
          <Stat ok={managed > 0} label="VEIL values" value={managed ? `${managed} written` : 'None yet'} sub={`Pack: ${Object.keys(pack.convars).length} engine, ${Object.keys(pack.autoexec).length} console`} />
          <Stat ok={!!st?.addonsSearchPath} label="Addons" value={st?.addonsSearchPath ? 'Loaded' : 'Not loaded'} sub="gameinfo.gi lists citadel/addons" />
        </section>

        <section className="g-mods">
          <header className="g-head">
            <div><h2>Installed mods</h2><p>Read from inside each pak. Skins are safe to keep; everything else changes how the game runs or looks.</p></div>
            <div className="actions">
              <button className="btn ghost small" onClick={() => setSel(new Set(notSkins))} disabled={!notSkins.length}>Select all but skins</button>
              <button className="btn ghost small" onClick={() => setSel(sel.size === all.length ? new Set() : new Set(all))} disabled={!all.length}>{sel.size === all.length && all.length ? 'Select none' : 'Select all'}</button>
              <button className="btn ghost small" onClick={() => run(async () => (await api.installPak()).status.found && api.scan(), 'Pak installed.')} disabled={!st?.found}><FileInput size={14} />Install pak</button>
            </div>
          </header>

          {dupes.map((g) => (
            <div className="g-warn" key={g[0].file}><AlertTriangle size={15} />Two versions of {g[0].name?.split(/\s[-–(]/)[0]} are installed ({g.map((p) => p.file.replace('_dir.vpk', '')).join(' and ')}). The lower number wins; remove one.</div>
          ))}

          <div className="g-list">
            {!scan && st?.found && <p className="empty">Reading paks…</p>}
            {scan && !paks.length && !leftovers.length && <p className="empty">No mods installed. Deadlock runs stock.</p>}
            {paks.map((p) => {
              const k = KIND[p.kind], r = 'addons/' + p.file, on = sel.has(r)
              return (
                <label key={p.file} className={`g-row ${on ? 'on' : ''} ${p.enabled ? '' : 'off'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(r)} />
                  <span className="g-check"><Check size={12} strokeWidth={3} /></span>
                  <span className="g-kind" style={{ ['--k' as string]: k.tone }}><k.icon size={14} />{k.label}</span>
                  <span className="g-name"><b>{p.name?.split(/\s[-–]\s/)[0] ?? p.label}</b><small>{p.author ?? (p.name?.split(/\s[-–]\s/)[1] || 'Unknown author')}</small></span>
                  <span className="g-meta num">{p.files} files</span>
                  <span className="g-meta num">{size(p.size)}</span>
                  <span className="g-file">{p.file.replace('_dir.vpk', '')}</span>
                </label>
              )
            })}
            {leftovers.map((l) => {
              const on = sel.has(l.file)
              return (
                <label key={l.file} className={`g-row left ${on ? 'on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(l.file)} />
                  <span className="g-check"><Check size={12} strokeWidth={3} /></span>
                  <span className="g-kind" style={{ ['--k' as string]: 'var(--ash)' }}>File</span>
                  <span className="g-name"><b>{l.file}</b><small>{l.what}</small></span>
                  <span /><span /><span />
                </label>
              )
            })}
          </div>

          <AnimatePresence>
            {sel.size > 0 && (
              <motion.div className="g-bar" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
                <span><b className="num">{sel.size}</b> selected. They move to a VEIL folder the game ignores, so you can bring them back.</span>
                <button className="btn primary" disabled={busy} onClick={() => run(() => api.quarantine([...sel]), `Removed ${sel.size} item${sel.size > 1 ? 's' : ''} from the game.`)}>Remove from game</button>
              </motion.div>
            )}
          </AnimatePresence>

          {!!scan?.removed.length && (
            <div className="g-removed">
              <h3>Removed earlier</h3>
              {scan.removed.map((r) => (
                <div key={r.id} className="g-rm">
                  <span>{new Date(r.when).toLocaleString()}</span>
                  <span className="faint">{r.files.length} item{r.files.length === 1 ? '' : 's'}: {r.files.map((f) => f.split('/').pop()).join(', ')}</span>
                  <button className="btn ghost small" onClick={() => run(() => api.unremove(r.id), 'Put back.')}><Undo2 size={14} />Put back</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="g-fresh">
          <h2>Fresh start</h2>
          <p>Gets rid of everything other tools changed, then builds your setup on a stock game.</p>
          <ol>
            <li>
              <div><b>Remove old mods</b><small>Select everything but skins above and remove it.</small></div>
              <button className="btn ghost small" onClick={() => setSel(new Set(notSkins))} disabled={!notSkins.length}>Select</button>
            </li>
            <li>
              <div><b>Restore stock game files</b><small>Parks autoexec.cfg, then Steam checks Deadlock and re-downloads the original gameinfo.gi. Wait until Steam says it’s done.</small></div>
              <button className="btn ghost small" disabled={!st?.found || busy} onClick={() => run(async () => { s.set({ status: await api.freshStart() }); await api.validate(); return api.scan() }, 'Steam is checking Deadlock. When it finishes, do step 3.')}><RotateCcw size={14} />Restore</button>
            </li>
            <li>
              <div><b>Apply your VEIL pack</b><small>Writes your mods, low settings, crosshair and HUD values into the fresh files.</small></div>
              <button className="btn brass small" onClick={async () => { await applyPack(); refresh() }} disabled={!st?.found}>Apply</button>
            </li>
          </ol>
          {st?.backup && (
            <button className="g-link" onClick={() => run(api.restore, 'gameinfo.gi is back to how it was before VEIL’s first change.')}>Undo VEIL’s changes to gameinfo.gi only</button>
          )}
          <div className="g-tip">Console values need <code>+exec autoexec</code> in Deadlock’s Steam launch options.</div>
        </section>
      </div>
    </div>
  )
}

function Stat({ ok, warn, label, value, sub }: { ok: boolean; warn?: boolean; label: string; value: string; sub: string }) {
  return (
    <div className={`g-stat ${ok ? 'ok' : ''} ${warn ? 'warn' : ''}`}>
      <span className="g-stat-l"><i />{label}</span>
      <b>{value}</b>
      <small title={sub}>{sub}</small>
    </div>
  )
}
