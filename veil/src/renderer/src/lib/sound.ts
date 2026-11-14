// Hit sounds. Every kit is synthesised here (no third-party audio is shipped), in the spirit of the hit sounds
// players know from arena shooters and tactical games. Your own files decode into the same AudioBuffer shape.

export const RATE = 44100
type Gen = (ctx: OfflineAudioContext, t: number) => void

function env(ctx: BaseAudioContext, t: number, a: number, d: number, peak = 1) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  g.connect(ctx.destination)
  return g
}
function tone(ctx: BaseAudioContext, t: number, type: OscillatorType, f0: number, f1: number, a: number, d: number, peak = 0.6) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + a + d)
  o.connect(env(ctx, t, a, d, peak))
  o.start(t); o.stop(t + a + d + 0.02)
}
function noise(ctx: BaseAudioContext, t: number, dur: number, hp: number, peak = 0.4, q = 0.7) {
  const b = ctx.createBuffer(1, Math.ceil(RATE * dur), RATE)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const s = ctx.createBufferSource(); s.buffer = b
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hp; f.Q.value = q
  s.connect(f); f.connect(env(ctx, t, 0.001, dur, peak))
  s.start(t)
}
function fm(ctx: BaseAudioContext, t: number, carrier: number, ratio: number, index: number, d: number, peak = 0.5) {
  const c = ctx.createOscillator(); c.frequency.value = carrier
  const m = ctx.createOscillator(); m.frequency.value = carrier * ratio
  const mg = ctx.createGain(); mg.gain.setValueAtTime(carrier * index, t); mg.gain.exponentialRampToValueAtTime(1, t + d)
  m.connect(mg); mg.connect(c.frequency)
  c.connect(env(ctx, t, 0.002, d, peak))
  c.start(t); m.start(t); c.stop(t + d + 0.05); m.stop(t + d + 0.05)
}

export type Kit = { id: string; name: string; feel: string; hue: string; body: Gen; head: Gen; dur: [number, number] }

export const KITS: Kit[] = [
  { id: 'arena', name: 'Arena Dink', feel: 'Bright ping of the classic arena shooters', hue: '#f2c14e', dur: [0.14, 0.2],
    body: (c, t) => { tone(c, t, 'square', 1760, 1700, 0.001, 0.11, 0.18); tone(c, t, 'sine', 3520, 3500, 0.001, 0.08, 0.15) },
    head: (c, t) => { tone(c, t, 'square', 2637, 2600, 0.001, 0.16, 0.2); tone(c, t, 'sine', 5274, 5200, 0.001, 0.12, 0.12) } },
  { id: 'tac', name: 'Tac Tick', feel: 'Dry, short click of tactical shooters', hue: '#e8e1d3', dur: [0.06, 0.12],
    body: (c, t) => { noise(c, t, 0.03, 4200, 0.7, 2); tone(c, t, 'triangle', 2200, 900, 0.0005, 0.04, 0.3) },
    head: (c, t) => { noise(c, t, 0.035, 5600, 0.8, 2.5); tone(c, t, 'triangle', 3600, 1800, 0.0005, 0.05, 0.35); tone(c, t + 0.045, 'sine', 4200, 4100, 0.001, 0.05, 0.2) } },
  { id: 'bell', name: 'Brass Bell', feel: 'Small bell with a long tail. Deadlock’s brass', hue: '#d4a855', dur: [0.4, 0.55],
    body: (c, t) => fm(c, t, 880, 3.5, 2.2, 0.38, 0.45),
    head: (c, t) => { fm(c, t, 1318, 3.5, 2.6, 0.5, 0.45); fm(c, t + 0.03, 1975, 2.01, 1.2, 0.4, 0.2) } },
  { id: 'coin', name: 'Soul Coin', feel: 'Two-note pickup, like collecting souls', hue: '#5fe0c4', dur: [0.16, 0.24],
    body: (c, t) => { tone(c, t, 'square', 988, 988, 0.001, 0.05, 0.16); tone(c, t + 0.05, 'square', 1319, 1319, 0.001, 0.1, 0.16) },
    head: (c, t) => { tone(c, t, 'square', 1319, 1319, 0.001, 0.05, 0.16); tone(c, t + 0.05, 'square', 1976, 1976, 0.001, 0.08, 0.16); tone(c, t + 0.1, 'square', 2637, 2637, 0.001, 0.12, 0.12) } },
  { id: '808', name: 'Eight-O-Eight', feel: 'Punchy drum machine kick and rim', hue: '#f0524f', dur: [0.18, 0.12],
    body: (c, t) => { tone(c, t, 'sine', 180, 45, 0.001, 0.17, 0.95) },
    head: (c, t) => { noise(c, t, 0.02, 1800, 0.8, 6); tone(c, t, 'triangle', 1700, 1600, 0.0005, 0.06, 0.4) } },
  { id: 'glass', name: 'Glass', feel: 'High, clean and almost weightless', hue: '#a9d6ff', dur: [0.22, 0.32],
    body: (c, t) => { tone(c, t, 'sine', 3136, 3130, 0.001, 0.2, 0.3); tone(c, t, 'sine', 4699, 4690, 0.001, 0.14, 0.12) },
    head: (c, t) => { tone(c, t, 'sine', 4186, 4180, 0.001, 0.28, 0.32); tone(c, t, 'sine', 6272, 6260, 0.001, 0.2, 0.14); tone(c, t + 0.02, 'sine', 8372, 8360, 0.001, 0.1, 0.06) } },
  { id: 'pop', name: 'Bubble Pop', feel: 'Soft upward pop, easy on long sessions', hue: '#f59ac1', dur: [0.1, 0.14],
    body: (c, t) => tone(c, t, 'sine', 320, 1100, 0.002, 0.08, 0.6),
    head: (c, t) => { tone(c, t, 'sine', 500, 1900, 0.002, 0.1, 0.6); tone(c, t + 0.035, 'sine', 900, 2600, 0.002, 0.06, 0.3) } },
  { id: 'retro', name: '8-Bit', feel: 'Chiptune blip from the arcade', hue: '#9cff7a', dur: [0.09, 0.16],
    body: (c, t) => tone(c, t, 'square', 1200, 600, 0.001, 0.08, 0.2),
    head: (c, t) => { tone(c, t, 'square', 1600, 3200, 0.001, 0.06, 0.2); tone(c, t + 0.06, 'square', 3200, 3200, 0.001, 0.08, 0.15) } },
  { id: 'wood', name: 'Wood Block', feel: 'Hollow knock, very short', hue: '#c08457', dur: [0.07, 0.09],
    body: (c, t) => { tone(c, t, 'sine', 820, 760, 0.0005, 0.06, 0.8); noise(c, t, 0.012, 2400, 0.3, 4) },
    head: (c, t) => { tone(c, t, 'sine', 1240, 1150, 0.0005, 0.08, 0.8); noise(c, t, 0.014, 3600, 0.35, 4) } },
  { id: 'laser', name: 'Spirit Zap', feel: 'Falling zap with a spark on headshots', hue: '#b48cff', dur: [0.12, 0.18],
    body: (c, t) => tone(c, t, 'sawtooth', 2400, 300, 0.001, 0.11, 0.18),
    head: (c, t) => { tone(c, t, 'sawtooth', 3600, 500, 0.001, 0.15, 0.18); noise(c, t, 0.05, 7000, 0.25, 1) } },
  { id: 'marker', name: 'Hitmarker', feel: 'Crisp military-shooter tick', hue: '#ffffff', dur: [0.05, 0.08],
    body: (c, t) => { noise(c, t, 0.018, 6500, 0.9, 3); tone(c, t, 'square', 4200, 3000, 0.0005, 0.02, 0.08) },
    head: (c, t) => { noise(c, t, 0.02, 7500, 1, 3); tone(c, t, 'square', 5200, 4000, 0.0005, 0.03, 0.1); noise(c, t + 0.035, 0.018, 7000, 0.6, 3) } },
  { id: 'clink', name: 'Helmet Clink', feel: 'Metallic ring, like a headshot on armour', hue: '#c9d6df', dur: [0.18, 0.35],
    body: (c, t) => { [2400, 3730, 5110].forEach((f, i) => tone(c, t, 'sine', f, f * 0.995, 0.001, 0.16 - i * 0.03, 0.18 / (i + 1))); noise(c, t, 0.01, 5000, 0.4, 2) },
    head: (c, t) => { [3100, 4870, 6620, 8050].forEach((f, i) => tone(c, t, 'sine', f, f * 0.995, 0.001, 0.32 - i * 0.05, 0.2 / (i + 1))); noise(c, t, 0.012, 7000, 0.5, 2) } },
  { id: 'dingding', name: 'Double Ding', feel: 'Two quick bell taps', hue: '#ffd77a', dur: [0.22, 0.28],
    body: (c, t) => { fm(c, t, 1568, 2, 0.8, 0.12, 0.3); fm(c, t + 0.07, 1568, 2, 0.8, 0.14, 0.3) },
    head: (c, t) => { fm(c, t, 2093, 2, 0.8, 0.12, 0.3); fm(c, t + 0.06, 2637, 2, 0.8, 0.2, 0.3) } },
  { id: 'synth', name: 'Synth Blip', feel: 'Filtered saw with a quick sweep', hue: '#7cc8ff', dur: [0.1, 0.16],
    body: (c, t) => tone(c, t, 'sawtooth', 660, 990, 0.001, 0.09, 0.16),
    head: (c, t) => { tone(c, t, 'sawtooth', 990, 1980, 0.001, 0.08, 0.16); tone(c, t + 0.05, 'sawtooth', 1980, 1980, 0.001, 0.09, 0.1) } },
  { id: 'drum', name: 'Kick and Snare', feel: 'Drum kit: kick on body, snare on head', hue: '#ff8a5c', dur: [0.2, 0.18],
    body: (c, t) => { tone(c, t, 'sine', 140, 40, 0.001, 0.19, 0.95); noise(c, t, 0.008, 3000, 0.3, 2) },
    head: (c, t) => { noise(c, t, 0.15, 2200, 0.8, 0.6); tone(c, t, 'triangle', 240, 180, 0.001, 0.08, 0.4) } },
  { id: 'drop', name: 'Water Drop', feel: 'Round plop with a falling pitch', hue: '#5fc8e0', dur: [0.14, 0.18],
    body: (c, t) => tone(c, t, 'sine', 1400, 380, 0.001, 0.12, 0.6),
    head: (c, t) => { tone(c, t, 'sine', 2000, 520, 0.001, 0.1, 0.6); tone(c, t + 0.06, 'sine', 1600, 1300, 0.001, 0.08, 0.25) } },
  { id: 'piano', name: 'Keys', feel: 'Soft piano notes, a fifth apart', hue: '#ede4d3', dur: [0.4, 0.5],
    body: (c, t) => { tone(c, t, 'triangle', 523, 523, 0.002, 0.38, 0.4); tone(c, t, 'sine', 1046, 1046, 0.002, 0.2, 0.12) },
    head: (c, t) => { tone(c, t, 'triangle', 784, 784, 0.002, 0.48, 0.4); tone(c, t, 'sine', 1568, 1568, 0.002, 0.25, 0.12) } },
  { id: 'chime', name: 'Glock', feel: 'Bright glockenspiel tap', hue: '#a9ffe6', dur: [0.3, 0.4],
    body: (c, t) => { tone(c, t, 'sine', 2637, 2637, 0.001, 0.28, 0.35); tone(c, t, 'sine', 7400, 7400, 0.001, 0.06, 0.08) },
    head: (c, t) => { tone(c, t, 'sine', 3520, 3520, 0.001, 0.38, 0.35); tone(c, t, 'sine', 9800, 9800, 0.001, 0.06, 0.08) } },
  { id: 'keyboard', name: 'Click Clack', feel: 'Mechanical key, clicky switch', hue: '#d0b48c', dur: [0.05, 0.09],
    body: (c, t) => { noise(c, t, 0.012, 3200, 0.9, 5); noise(c, t + 0.018, 0.01, 1800, 0.5, 5) },
    head: (c, t) => { noise(c, t, 0.012, 4500, 1, 5); noise(c, t + 0.02, 0.012, 2600, 0.6, 5); noise(c, t + 0.045, 0.01, 5200, 0.4, 5) } },
  { id: 'cash', name: 'Cash Out', feel: 'Register ring for every headshot', hue: '#9cff7a', dur: [0.12, 0.35],
    body: (c, t) => { tone(c, t, 'square', 1318, 1318, 0.001, 0.1, 0.12) },
    head: (c, t) => { tone(c, t, 'square', 1975, 1975, 0.001, 0.05, 0.12); tone(c, t + 0.05, 'square', 2637, 2637, 0.001, 0.08, 0.12); fm(c, t + 0.1, 4186, 3.5, 1.5, 0.22, 0.18) } },
]

const cache = new Map<string, AudioBuffer>()
export async function renderKit(kit: Kit, which: 'body' | 'head'): Promise<AudioBuffer> {
  const key = kit.id + which
  if (cache.has(key)) return cache.get(key)!
  const dur = (which === 'body' ? kit.dur[0] : kit.dur[1]) + 0.04
  const ctx = new OfflineAudioContext(1, Math.ceil(RATE * dur), RATE)
  kit[which](ctx, 0.002)
  const buf = await ctx.startRendering()
  cache.set(key, buf)
  return buf
}

let live: AudioContext | null = null
export const audio = () => (live ??= new AudioContext({ sampleRate: RATE }))

export async function decodeFile(file: File): Promise<AudioBuffer> {
  return audio().decodeAudioData(await file.arrayBuffer())
}

export type Cut = { start: number; end: number; db: number; pitch: number }

export function play(buf: AudioBuffer, cut: Cut) {
  const ctx = audio()
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = cut.pitch
  const g = ctx.createGain(); g.gain.value = Math.pow(10, cut.db / 20)
  s.connect(g); g.connect(ctx.destination)
  s.start(0, cut.start, Math.max(0.005, cut.end - cut.start))
}

/** Applies the cut, gain and pitch and returns a mono 16-bit WAV. */
export async function bake(buf: AudioBuffer, cut: Cut): Promise<Uint8Array> {
  const len = Math.max(1, Math.ceil(((cut.end - cut.start) / cut.pitch) * RATE))
  const ctx = new OfflineAudioContext(1, len, RATE)
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = cut.pitch
  const g = ctx.createGain(); g.gain.value = Math.pow(10, cut.db / 20)
  s.connect(g); g.connect(ctx.destination)
  s.start(0, cut.start, cut.end - cut.start)
  return wav(await ctx.startRendering())
}

function wav(b: AudioBuffer): Uint8Array {
  const d = b.getChannelData(0)
  const out = new DataView(new ArrayBuffer(44 + d.length * 2))
  const w = (o: number, s: string) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)))
  w(0, 'RIFF'); out.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true)
  out.setUint32(24, b.sampleRate, true); out.setUint32(28, b.sampleRate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true)
  w(36, 'data'); out.setUint32(40, d.length * 2, true)
  for (let i = 0; i < d.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 0x7fff, true)
  return new Uint8Array(out.buffer)
}

/** Seconds of leading silence (below -40 dB). */
export function leadingSilence(b: AudioBuffer) {
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.01) return Math.max(0, i / b.sampleRate - 0.001)
  return 0
}

export function peaks(b: AudioBuffer, n = 120): number[] {
  const d = b.getChannelData(0)
  const step = Math.max(1, Math.floor(d.length / n))
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    let m = 0
    for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(d[j]))
    out.push(m)
  }
  const top = Math.max(...out, 0.0001)
  return out.map((v) => v / top)
}
