import { useEffect, useRef, useState } from 'react'
import { Play, Upload } from '../components/icons'
import { KITS, renderKit, decodeFile, play, bake, peaks, leadingSilence, type Cut, type Kit } from '../lib/sound'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { PageHead, Slider } from '../components/ui'

type Src = { id: string; name: string; hue: string; feel: string; body: AudioBuffer; head: AudioBuffer; mine?: boolean }
type Slot = 'body' | 'head'
type Pick = { src: string; part: Slot; cut: Cut }

export default function Sound() {
  const say = useStore((s) => s.say)
  const [srcs, setSrcs] = useState<Src[]>([])
  const [pick, setPick] = useState<Record<Slot, Pick | null>>({ body: null, head: null })
  const [over, setOver] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all(KITS.map(async (k: Kit) => ({ id: k.id, name: k.name, hue: k.hue, feel: k.feel, body: await renderKit(k, 'body'), head: await renderKit(k, 'head') }))).then((list) => {
      setSrcs(list)
      const a = list[0]
      setPick({ body: { src: a.id, part: 'body', cut: full(a.body) }, head: { src: a.id, part: 'head', cut: full(a.head) } })
    })
  }, [])

  const buf = (p: Pick | null) => { const s = p && srcs.find((x) => x.id === p.src); return s ? s[p!.part] : null }
  const assign = (slot: Slot, s: Src, part: Slot = slot) => { setPick((p) => ({ ...p, [slot]: { src: s.id, part, cut: full(s[part]) } })); play(s[part], full(s[part])) }
  const useKit = (s: Src) => { setPick({ body: { src: s.id, part: 'body', cut: full(s.body) }, head: { src: s.id, part: 'head', cut: full(s.head) } }); play(s.body, full(s.body)); setTimeout(() => play(s.head, full(s.head)), 260) }

  const add = async (files: FileList | null) => {
    if (!files) return
    for (const f of [...files]) {
      try {
        const b = await decodeFile(f)
        const s: Src = { id: `mine-${f.name}-${Date.now()}`, name: f.name.replace(/\.\w+$/, ''), hue: '#ede4d3', feel: `${(b.duration * 1000).toFixed(0)} ms, your file`, body: b, head: b, mine: true }
        setSrcs((x) => [s, ...x])
      } catch { say(`${f.name} could not be read. Use WAV, MP3, OGG or FLAC.`, 'bad') }
    }
  }

  const exportWavs = async () => {
    for (const slot of ['body', 'head'] as Slot[]) {
      const p = pick[slot], b = buf(p)
      if (!p || !b) continue
      const saved = await api.save(`hitsound_${slot}.wav`, await bake(b, p.cut))
      if (!saved) return
    }
    say('Saved both hit sounds as WAV.')
  }

  return (
    <div className="sound">
      <PageHead title="Hit sounds" sub="Pick a kit and you hear it at once. One sound plays on body shots, one on headshots, and only for hits you deal." />

      <div className="kits">
        <button
          className={`drop ${over ? 'over' : ''}`} onClick={() => file.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
        >
          <span><Upload size={22} style={{ marginBottom: 10 }} /><br /><b style={{ color: 'var(--bone)' }}>Add your own</b><br />Drop WAV, MP3, OGG or FLAC files</span>
        </button>
        <input ref={file} type="file" accept="audio/*" multiple hidden onChange={(e) => add(e.target.files)} />
        {srcs.map((s) => (
          <div key={s.id} className={`kit ${s.mine ? 'mine' : ''} ${pick.body?.src === s.id ? 'body-on' : ''} ${pick.head?.src === s.id ? 'head-on' : ''}`} style={{ ['--kit' as string]: s.hue }}>
            <h3>{s.name}</h3>
            <p>{s.feel}</p>
            <button className="wave" onClick={() => (s.mine ? play(s.body, full(s.body)) : useKit(s))} aria-label={`Play ${s.name}`} style={{ cursor: 'pointer' }}>
              {peaks(s.body, 36).map((v, i) => <i key={i} style={{ height: `${Math.max(6, v * 100)}%` }} />)}
            </button>
            <div className="acts">
              <button aria-pressed={pick.body?.src === s.id} onClick={() => assign('body', s, s.mine ? 'body' : 'body')}><Play size={12} />Body</button>
              <button aria-pressed={pick.head?.src === s.id} onClick={() => assign('head', s, s.mine ? 'body' : 'head')}><Play size={12} />Head</button>
            </div>
          </div>
        ))}
      </div>

      <div className="editors">
        {(['body', 'head'] as Slot[]).map((slot) => {
          const p = pick[slot], b = buf(p)
          const name = p ? srcs.find((x) => x.id === p.src)?.name : ''
          return (
            <section className="editor" key={slot}>
              <header><h3>{slot === 'body' ? 'Body shot' : 'Headshot'}</h3><span>{name}</span></header>
              {b && p ? (
                <>
                  <Waveform buf={b} cut={p.cut} onChange={(cut) => setPick((x) => ({ ...x, [slot]: { ...p, cut } }))} />
                  <div className="row2">
                    <Slider label="Volume" value={p.cut.db} min={-18} max={9} step={0.5} onChange={(db) => setPick((x) => ({ ...x, [slot]: { ...p, cut: { ...p.cut, db } } }))} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`} />
                    <Slider label="Pitch" value={p.cut.pitch} min={0.5} max={2} step={0.01} onChange={(pitch) => setPick((x) => ({ ...x, [slot]: { ...p, cut: { ...p.cut, pitch } } }))} format={(v) => `${v.toFixed(2)}×`} />
                  </div>
                  <div className="actions">
                    <button className="btn primary small" onClick={() => play(b, p.cut)}><Play size={14} />Play {slot === 'body' ? 'body shot' : 'headshot'}</button>
                    <button className="btn ghost small" onClick={() => setPick((x) => ({ ...x, [slot]: { ...p, cut: { ...p.cut, start: leadingSilence(b) } } }))}>Cut silence at start</button>
                    <button className="btn ghost small" onClick={() => setPick((x) => ({ ...x, [slot]: { ...p, cut: full(b) } }))}>Use whole file</button>
                  </div>
                </>
              ) : <p className="faint">Pick a sound above.</p>}
            </section>
          )
        })}
      </div>

      <div className="export">
        <div>
          <h3>Take them into the game</h3>
          <p>VEIL saves both sounds trimmed and tuned, as 44.1 kHz mono WAV. To hear them in game they go into a hitsound pak at the stock hit-indicator paths: drop the two files into CompLock’s Hitsound Builder and download the pak, then install it here from the Install page.</p>
        </div>
        <div className="actions" style={{ flexWrap: 'nowrap' }}>
          <button className="btn brass" onClick={exportWavs}>Save both as WAV</button>
          <button className="btn ghost" onClick={() => api.open('https://deadlockconfig.com/docs/hitsound/')}>Hitsound Builder</button>
        </div>
      </div>
    </div>
  )
}

const full = (b: AudioBuffer): Cut => ({ start: 0, end: b.duration, db: 0, pitch: 1 })

function Waveform({ buf, cut, onChange }: { buf: AudioBuffer; cut: Cut; onChange: (c: Cut) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const dur = buf.duration
  useEffect(() => {
    const c = ref.current!, r = c.getBoundingClientRect(), dpr = 2
    c.width = r.width * dpr; c.height = r.height * dpr
    const ctx = c.getContext('2d')!
    ctx.scale(dpr, dpr)
    const p = peaks(buf, Math.floor(r.width / 3))
    const mid = r.height / 2
    p.forEach((v, i) => {
      const h = Math.max(1, v * (r.height * 0.42))
      ctx.fillStyle = 'rgba(237,228,211,.85)'
      ctx.fillRect(i * 3, mid - h, 2, h * 2)
    })
  }, [buf])
  const drag = (which: 'start' | 'end') => (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const r = box.current!.getBoundingClientRect()
      const t = Math.min(dur, Math.max(0, ((ev.clientX - r.left) / r.width) * dur))
      onChange(which === 'start' ? { ...cut, start: Math.min(t, cut.end - 0.005) } : { ...cut, end: Math.max(t, cut.start + 0.005) })
    }
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up)
  }
  const s = (cut.start / dur) * 100, en = (cut.end / dur) * 100
  return (
    <div>
      <div className="waveform" ref={box}>
        <canvas ref={ref} />
        <div className="shade" style={{ left: 0, width: `${s}%` }} />
        <div className="shade" style={{ left: `${en}%`, right: 0 }} />
        <div className="mark" style={{ left: `${s}%` }} onPointerDown={drag('start')} role="slider" aria-label="Start" aria-valuenow={Math.round(cut.start * 1000)} tabIndex={0} />
        <div className="mark" style={{ left: `${en}%` }} onPointerDown={drag('end')} role="slider" aria-label="End" aria-valuenow={Math.round(cut.end * 1000)} tabIndex={0} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ash)', marginTop: 8 }} className="num">
        <span>Start {(cut.start * 1000).toFixed(1)} ms</span><span>Length {((cut.end - cut.start) * 1000 / cut.pitch).toFixed(0)} ms</span><span>End {(cut.end * 1000).toFixed(1)} ms</span>
      </div>
    </div>
  )
}
