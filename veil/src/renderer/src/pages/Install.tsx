import { Check, EyeOff, Eye, Trash2, FolderOpen, Undo2 } from 'lucide-react'
import { useStore, computePack } from '../lib/store'
import { api, isApp } from '../lib/api'
import { PageHead, applyPack } from '../components/ui'

const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)
const err = (e: unknown) => String((e as Error).message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

export default function Install() {
  const s = useStore()
  const st = s.status
  const pack = computePack(s)
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { const r = await fn(); if (r && typeof r === 'object' && 'found' in (r as object)) s.set({ status: r as never }); if (ok) s.say(ok) } catch (e) { s.say(err(e), 'bad') }
  }
  const managed = Object.keys(st?.managedConvars ?? {}).length

  return (
    <div className="install">
      <PageHead title="Install" sub={<>VEIL edits two files and the addons folder. It backs up gameinfo.gi the first time and can put it back with one click.{!isApp && ' This is the browser preview: nothing here touches a disk.'}</>} />

      <div className="checks">
        <Row ok={!!st?.found} title={st?.found ? 'Deadlock found' : 'Deadlock not found'} sub={st?.gamePath ?? 'Looked in every Steam library on this PC.'}>
          <button className="btn ghost small" onClick={() => run(api.pick)}><FolderOpen size={14} />{st?.found ? 'Change' : 'Pick folder'}</button>
        </Row>
        <Row ok={!!st?.addonsSearchPath} title="Addons folder is loaded" sub="gameinfo.gi lists citadel/addons so paks in it load.">
          {!st?.addonsSearchPath && st?.found && <button className="btn ghost small" onClick={applyPack}>Fix it</button>}
        </Row>
        <Row ok={managed > 0} title={managed ? `${managed} engine values written` : 'No engine values written yet'} sub={`Your pack sets ${Object.keys(pack.convars).length} engine values and ${Object.keys(pack.autoexec).length} console values.`}>
          <button className="btn brass small" onClick={applyPack} disabled={!st?.found}>Apply pack</button>
        </Row>
        <Row ok={!!st?.backup} title={st?.backup ? 'Original gameinfo.gi is backed up' : 'No backup yet'} sub="Made automatically before the first change.">
          {st?.backup && <button className="btn ghost small" onClick={() => run(api.restore, 'The original gameinfo.gi is back. Paks in addons stay.')}><Undo2 size={14} />Restore original</button>}
        </Row>
      </div>

      <section className="paks">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2>Paks in addons</h2>
          <div className="actions">
            <button className="btn ghost small" onClick={() => run(async () => (await api.installPak()).status, 'Pak installed.')} disabled={!st?.found}>Install pak file</button>
            <button className="btn ghost small" onClick={() => api.reveal()} disabled={!st?.found || !isApp}><FolderOpen size={14} />Open folder</button>
          </div>
        </div>
        {st?.paks.length ? st.paks.map((p) => {
          const off = p.file.endsWith('.off')
          return (
            <div key={p.file} className={`pak ${off ? 'off' : ''}`}>
              <span className="f">{p.file.replace(/\.off$/, '')}</span>
              <span className="faint num">{size(p.size)}</span>
              <span className="faint num">{new Date(p.mtime).toLocaleDateString()}</span>
              <span>
                <button className="iconbtn" onClick={() => run(() => api.togglePak(p.file))} aria-label={off ? `Turn on ${p.file}` : `Turn off ${p.file}`} title={off ? 'Turn on' : 'Turn off'}>{off ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button className="iconbtn" onClick={() => { if (confirm(`Delete ${p.file} from addons? This can’t be undone.`)) run(() => api.removePak(p.file), `Deleted ${p.file}.`) }} aria-label={`Delete ${p.file}`} title="Delete"><Trash2 size={16} /></button>
              </span>
            </div>
          )
        }) : <p className="empty">No paks yet. Get the CompLock paks from the Mods page, then install them here.</p>}
      </section>

      <section className="steps">
        <h2>First time</h2>
        <ol>
          <li><span>Download the CompLock pack from <a href="#" onClick={(e) => { e.preventDefault(); api.open('https://deadlockconfig.com/#build') }}>deadlockconfig.com</a> and unzip it.</span></li>
          <li><span>Install its <code>.vpk</code> files with Install pak file, and its gameinfo.gi from the Engine settings mod.</span></li>
          <li><span>Press Apply pack. VEIL writes your field of view, tweaks, crosshair and HUD values on top.</span></li>
          <li><span>In Steam, open Deadlock’s properties and add <code>+exec autoexec</code> to the launch options so the console values load.</span></li>
          <li><span>Restart Deadlock. To undo everything, Restore original and turn the paks off.</span></li>
        </ol>
      </section>
    </div>
  )
}

function Row({ ok, title, sub, children }: { ok: boolean; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="check">
      <span className={`mark ${ok ? 'ok' : ''}`}>{ok && <Check size={14} strokeWidth={3} />}</span>
      <div><b>{title}</b><small>{sub}</small></div>
      <div className="actions">{children}</div>
    </div>
  )
}
