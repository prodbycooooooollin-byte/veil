import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { api, isApp } from '../lib/api'
import { PageHead, Seg, Switch } from '../components/ui'
import { Copy, FolderOpen, RotateCw } from '../components/icons'

/* A settings page laid out the way desktop apps lay them out: grouped sections, label left, control right. */
export default function Settings() {
  const s = useStore()
  const [version, setVersion] = useState('')
  const [checking, setChecking] = useState(false)
  useEffect(() => { api.version().then(setVersion) }, [])

  const exportSettings = () => {
    const { on, opt, bar, cross, xh, xhSaved, xhMode, damageMode, verticalBars, custom, prefs } = useStore.getState()
    navigator.clipboard.writeText(JSON.stringify({ veil: 1, on, opt, bar, cross, xh, xhSaved, xhMode, damageMode, verticalBars, custom, prefs }))
    s.say('All VEIL settings are on the clipboard.')
  }
  const importSettings = async () => {
    try {
      const j = JSON.parse(await navigator.clipboard.readText())
      if (j.veil !== 1) throw new Error()
      const { veil: _, ...rest } = j
      s.set(rest)
      s.say('Settings imported.')
    } catch { s.say('The clipboard has no VEIL settings. Export them from another VEIL first.', 'bad') }
  }
  const reset = () => {
    if (!confirm('Reset every VEIL setting to its default? Your game files are not touched.')) return
    localStorage.removeItem('veil'); location.reload()
  }

  return (
    <div className="settings">
      <PageHead title="Settings" sub="How VEIL behaves. Nothing here changes the game until you apply." />

      <Section title="General">
        <Row label="Open on" hint="The page VEIL shows when it starts.">
          <Seg label="Open on" value={s.prefs.startPage} onChange={(startPage) => s.set({ prefs: { ...s.prefs, startPage } })} options={[{ id: 'home', label: 'Home' }, { id: 'last', label: 'Last page' }]} />
        </Row>
        <Row label="Animated background" hint="The moving light on the Home page.">
          <Switch checked={s.prefs.background} onChange={(background) => s.set({ prefs: { ...s.prefs, background } })} label="Animated background" />
        </Row>
        <Row label="Reduce motion" hint="Turns off transitions and moving effects everywhere.">
          <Switch checked={s.prefs.reduceMotion} onChange={(reduceMotion) => s.set({ prefs: { ...s.prefs, reduceMotion } })} label="Reduce motion" />
        </Row>
      </Section>

      <Section title="Game">
        <Row label="Deadlock folder" hint={s.status?.gamePath ?? 'Not found yet'}>
          <button className="btn ghost small" onClick={() => api.pick().then((status) => s.set({ status })).catch(() => {})}><FolderOpen size={14} />Change</button>
        </Row>
        <Row label="Launch option" hint="Needed so Deadlock loads the console values VEIL writes. Add it in Steam: Deadlock, Properties, Launch options.">
          <button className="btn ghost small" onClick={() => { navigator.clipboard.writeText('+exec autoexec'); s.say('Copied +exec autoexec.') }}><Copy size={14} />Copy +exec autoexec</button>
        </Row>
        <Row label="Game files" hint="Opens game\citadel, where addons and gameinfo.gi live.">
          <button className="btn ghost small" onClick={() => api.reveal()} disabled={!isApp || !s.status?.found}><FolderOpen size={14} />Open folder</button>
        </Row>
      </Section>

      <Section title="Crosshair overlay">
        <Row label="Shortcut" hint="Turns the overlay on and off, also from inside the game.">
          <span className="kbd-row"><kbd>Alt</kbd><kbd>Shift</kbd><kbd>X</kbd></span>
        </Row>
        <Row label="Where it works" hint="Over Deadlock in borderless windowed mode. Exclusive fullscreen draws over it.">
          <span className="faint">Borderless windowed</span>
        </Row>
      </Section>

      <Section title="Updates">
        <Row label="Version" hint="VEIL downloads new versions in the background and asks you to restart.">
          <span className="num">{version}</span>
        </Row>
        <Row label="Check now" hint={isApp ? 'Looks for a newer release on GitHub.' : 'Works in the installed app.'}>
          <button className="btn ghost small" disabled={checking} onClick={async () => { setChecking(true); const r = await api.checkUpdate(); setChecking(false); s.say(r?.message ?? 'Checking for updates. You’ll see it at the top if there is one.') }}><RotateCw size={14} />{checking ? 'Checking' : 'Check for updates'}</button>
        </Row>
      </Section>

      <Section title="Your data">
        <Row label="Export" hint="Copies your mods, Forge, crosshairs and console values as text.">
          <button className="btn ghost small" onClick={exportSettings}>Copy settings</button>
        </Row>
        <Row label="Import" hint="Loads settings copied from another VEIL.">
          <button className="btn ghost small" onClick={importSettings}>Paste settings</button>
        </Row>
        <Row label="Reset VEIL" hint="Back to defaults. Game files stay as they are.">
          <button className="btn ghost small danger" onClick={reset}>Reset</button>
        </Row>
      </Section>

      <Section title="About">
        <Row label="VEIL" hint="Not affiliated with Valve. Benchmarks and comparison images by CompLock (HoppCX, jcStani). Hero models from the game via the community Deadlock API.">
          <button className="btn ghost small" onClick={() => api.open('https://github.com/prodbycooooooollin-byte/veil')}>GitHub</button>
        </Row>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="set-sec"><h2>{title}</h2><div className="set-card">{children}</div></section>
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div className="set-ctl">{children}</div>
    </div>
  )
}
