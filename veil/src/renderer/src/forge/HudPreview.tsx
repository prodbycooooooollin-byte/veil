// A flat mock of the Deadlock HUD at 1920×1080 that shows what the VEIL HUD extras change: the minimap, the
// top bar (ults, respawn timers, souls, rejuvenator / mid boss timer), your ability and item cooldowns and a
// powerup spawn. Positions follow the stock stylesheets VEIL patches (see src/main/hud.ts), so moving the
// minimap here moves it the same way in game. It is a drawing, not a capture: art and fonts are stand-ins.
import { useEffect, useState } from 'react'
import type { HudExtras } from '../lib/store'
import type { Hero } from '../lib/heroes'

export type PreviewFocus = 'map' | 'timers' | 'souls'

const OFF_WHITE = '#f3ead9'
const TEAM = ['#e7b659', '#5b79e6'] // stock team colours from hud_minimap.vcss
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const souls = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString('en-US'))

export function HudPreview({ x, focus, heroes }: { x: HudExtras; focus: PreviewFocus; heroes: Hero[] }) {
  const [t, setT] = useState(0)
  useEffect(() => { const id = setInterval(() => setT((v) => v + 1), 1000); return () => clearInterval(id) }, [])
  const dim = (part: PreviewFocus | 'all') => (part === 'all' || part === focus ? 1 : 0.35)

  // minimap geometry, the same arithmetic as the CSS in hud.ts (stock values when the minimap option is off)
  const m = x.minimap.on ? x.minimap : { size: 100, opacity: 100, bg: 'stock' as const, side: 'right' as const, x: 0, y: 15 }
  const k = m.size / 100
  const boxW = 440 * k, boxH = 520 * k
  const boxX = m.side === 'right' ? 1920 - m.x - boxW : m.x
  const boxY = 1080 - m.y - boxH
  const cx = boxX + boxW / 2, cy = boxY + boxH / 2 + 40 * k, R = 200 * k, mapR = 180 * k

  // top bar: 6 v 6; a few players are on ult cooldown, two are dead
  const icons = heroes.slice(0, 12)
  const players = Array.from({ length: 12 }, (_, i) => {
    const ult = [0, 41, 0, 87, 12, 0, 0, 0, 63, 0, 25, 0][i]
    const dead = i === 4 || i === 9 ? (i === 4 ? 18 : 7) : 0
    return { i, team: i < 6 ? 0 : 1, icon: icons[i]?.icon, ult: ult ? Math.max(0, ult - (t % (ult + 1))) : 0, dead: dead ? Math.max(1, dead - (t % dead)) : 0, souls: 6400 + ((i * 2731) % 9000) }
  })
  const teamSouls = [0, 1].map((tm) => players.filter((p) => p.team === tm).reduce((a, p) => a + p.souls, 0))
  const rejuv = 300 - (t % 300)

  const cdColor = x.cooldowns.on ? x.cooldowns.color : OFF_WHITE
  const cdK = x.cooldowns.on ? x.cooldowns.size / 100 : 1
  const abilities = [0, 6, 0, 23].map((cd) => (cd ? Math.max(1, cd - (t % cd)) : 0))
  const actives = [0, 14, 0, 0].map((cd) => (cd ? Math.max(1, cd - (t % cd)) : 0))
  const passives = [9, 0, 31, 0].map((cd) => (cd ? Math.max(1, cd - (t % cd)) : 0))
  const respawnK = x.respawn.on ? x.respawn.size / 100 : 1
  const respawnColor = x.respawn.on ? x.respawn.color : '#fe420e'
  const ultK = x.ults.size / 100

  return (
    <svg className="hudp" viewBox="0 0 1920 1080" role="img" aria-label="Preview of the Deadlock HUD with your VEIL HUD settings">
      <defs>
        <radialGradient id="hudp-world" cx="50%" cy="40%" r="80%"><stop offset="0" stopColor="#3a3328" /><stop offset="1" stopColor="#0d0c0a" /></radialGradient>
        <clipPath id="hudp-map"><circle cx={cx} cy={cy} r={mapR} /></clipPath>
        <clipPath id="hudp-portrait"><rect width="56" height="56" rx="4" /></clipPath>
      </defs>
      <rect width="1920" height="1080" fill="url(#hudp-world)" />
      <path d="M0 760 L700 520 L1220 520 L1920 760 L1920 1080 L0 1080Z" fill="#1d1a15" opacity="0.8" />
      <path d="M760 520 L640 1080 M1160 520 L1280 1080" stroke="#2c2720" strokeWidth="6" />

      {/* top bar */}
      <g opacity={dim(focus === 'map' ? 'map' : 'all')}>
        {players.map((p) => {
          const px = p.team === 0 ? 960 - 60 - (6 - p.i) * 64 : 960 + 60 + (p.i - 6) * 64 + 8
          return (
            <g key={p.i} transform={`translate(${px} 10)`}>
              <rect width="56" height="56" rx="4" fill={TEAM[p.team]} opacity={p.dead ? 0.25 : 0.35} />
              {p.icon && <image href={p.icon} width="56" height="56" clipPath="url(#hudp-portrait)" opacity={p.dead ? 0.3 : 1} preserveAspectRatio="xMidYMid slice" />}
              <rect width="56" height="56" rx="4" fill="none" stroke={TEAM[p.team]} strokeWidth="2" />
              {p.dead > 0 && <text x="28" y={30 + 10 * respawnK} textAnchor="middle" fontSize={32 * respawnK} fontWeight="800" fill={respawnColor} stroke="#000" strokeWidth="5" paintOrder="stroke">{p.dead}</text>}
              {/* ult status under the portrait: stock shows ready / not ready, VEIL adds the seconds */}
              <circle cx="28" cy="78" r="11" fill={p.ult ? '#16140f' : TEAM[p.team]} stroke="#000" strokeWidth="2" opacity={p.dead ? 0.4 : 1} />
              <path d="M28 71 l5 7 l-5 7 l-5 -7z" fill={p.ult ? '#6b6457' : '#fff'} />
              {x.ults.on && p.ult > 0 && <text x="28" y={78 + 5 * ultK} textAnchor="middle" fontSize={14 * ultK * 1.2} fontWeight="800" fill={OFF_WHITE} stroke="#000" strokeWidth="4" paintOrder="stroke">{p.ult}</text>}
              {x.souls.players && <text x="28" y="108" textAnchor="middle" fontSize="15" fontWeight="700" fill={OFF_WHITE} stroke="#000" strokeWidth="3" paintOrder="stroke" opacity={dim('souls')}>{souls(p.souls)}</text>}
            </g>
          )
        })}
        {/* the rejuvenator / mid boss timer sits between the teams */}
        <g transform="translate(960 40)">
          <circle r="24" fill="#16140f" stroke="#c9a46a" strokeWidth="2" />
          <path d="M0 -12 l9 12 l-9 12 l-9 -12z" fill="#c9a46a" opacity="0.7" />
          <text y="44" textAnchor="middle" fontSize={x.objectives.rejuv ? 16 : 11} fontWeight="800" fill={OFF_WHITE} opacity={x.objectives.rejuv ? 1 : 0.3} stroke="#000" strokeWidth="3" paintOrder="stroke">{mmss(rejuv)}</text>
        </g>
        {x.souls.team && (
          <g fontSize="24" fontWeight="800" stroke="#000" strokeWidth="4" paintOrder="stroke" opacity={dim('souls')}>
            <text x={960 - 60 - 6 * 64 - 24} y="48" textAnchor="end" fill={TEAM[0]}>{souls(teamSouls[0])}</text>
            <text x={960 + 60 + 6 * 64 + 32} y="48" fill={TEAM[1]}>{souls(teamSouls[1])}</text>
          </g>
        )}
        {focus === 'souls' && (
          // the soul gap needs a Panorama script; shown as a ghost so it is clear VEIL can't draw it yet
          <g transform="translate(960 150)" opacity="0.55">
            <rect x="-150" y="-20" width="300" height="36" rx="18" fill="none" stroke={OFF_WHITE} strokeDasharray="6 6" />
            <text y="5" textAnchor="middle" fontSize="16" fontWeight="700" fill={OFF_WHITE}>{`+${souls(Math.abs(teamSouls[0] - teamSouls[1]))} · ${Math.round(Math.abs(teamSouls[0] - teamSouls[1]) / Math.min(...teamSouls) * 100)}% ahead`}</text>
            <text y="40" textAnchor="middle" fontSize="13" fill={OFF_WHITE}>soul gap: needs a script, not in VEIL HUD yet</text>
          </g>
        )}
      </g>

      {/* powerup spawn in the world: stock shows a small pulse, VEIL can show the full ring */}
      <g transform="translate(780 600)" opacity={dim('timers')}>
        {x.objectives.powerups ? (
          <>
            <circle r="26" fill="#0d0c0acc" />
            <circle r="24" fill="none" stroke="#6a686b90" strokeDasharray="4 4" strokeWidth="2" />
            <circle r="24" fill="none" stroke="#99ffdd" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 24 * (((t % 20) + 1) / 20)} 999`} transform="rotate(-90)" />
          </>
        ) : <circle r="10" fill="none" stroke="#99ffdd" strokeWidth="2" opacity={0.4 + 0.4 * (t % 2)} />}
      </g>

      {/* your abilities and items with their cooldown seconds */}
      <g opacity={dim('timers')}>
        {abilities.map((cd, i) => (
          <g key={i} transform={`translate(${960 - 170 + i * 85} 900)`}>
            <rect width="72" height="72" rx="8" fill={cd ? '#1a1814' : '#2e2a22'} stroke="#000" strokeWidth="2" />
            <path d="M36 16 l16 20 l-16 20 l-16 -20z" fill={cd ? '#4a443a' : '#c9a46a'} />
            {cd > 0 && <text x="36" y={36 + 12 * cdK} textAnchor="middle" fontSize={35 * cdK} fontWeight="700" fill={cdColor} stroke="#000" strokeWidth="5" paintOrder="stroke">{cd}</text>}
          </g>
        ))}
        {actives.map((cd, i) => (
          <g key={i} transform={`translate(${960 - 170 + i * 56} 990)`}>
            <rect width="48" height="48" rx="6" fill={cd ? '#1a1814' : '#283039'} stroke="#000" strokeWidth="2" />
            {cd > 0 && <text x="24" y={20 + 8 * cdK} textAnchor="middle" fontSize={22 * cdK} fontWeight="700" fill={cdColor} stroke="#000" strokeWidth="4" paintOrder="stroke">{cd}</text>}
          </g>
        ))}
        {passives.map((cd, i) => (
          <g key={i} transform={`translate(${960 + 66 + i * 44} 996)`}>
            <rect width="38" height="38" rx="5" fill={cd ? '#1a1814' : '#2b3326'} stroke="#000" strokeWidth="2" />
            {cd > 0 && x.cooldowns.on && x.cooldowns.passives && <text x="19" y={19 + 6 * cdK} textAnchor="middle" fontSize={16 * cdK} fontWeight="700" fill={cdColor} stroke="#000" strokeWidth="3" paintOrder="stroke">{cd}</text>}
          </g>
        ))}
      </g>

      {/* minimap */}
      <g opacity={dim('map')}>
        {focus === 'map' && <rect x={boxX} y={boxY} width={boxW} height={boxH} fill="none" stroke={OFF_WHITE} strokeOpacity="0.25" strokeDasharray="8 8" />}
        <g opacity={m.opacity / 100}>
          {m.bg === 'stock' && <><circle cx={cx} cy={cy} r={R} fill="#14120e" stroke="#8a7350" strokeWidth={10 * k} /><circle cx={cx} cy={cy} r={R - 14 * k} fill="none" stroke="#c9a46a" strokeOpacity="0.5" strokeWidth={2} /></>}
          {m.bg === 'dark' && <circle cx={cx} cy={cy} r={R} fill="#000000b0" />}
          <g clipPath="url(#hudp-map)">
            <circle cx={cx} cy={cy} r={mapR} fill={m.bg === 'none' ? 'transparent' : '#2a261e'} opacity="0.9" />
            {[-0.55, 0, 0.55].map((o) => (
              <path key={o} d={`M${cx + o * mapR} ${cy - mapR} C${cx + o * mapR * 1.3} ${cy - mapR / 3} ${cx + o * mapR * 1.3} ${cy + mapR / 3} ${cx + o * mapR} ${cy + mapR}`} fill="none" stroke="#d8c9a8" strokeOpacity="0.55" strokeWidth={6 * k} />
            ))}
            <circle cx={cx} cy={cy} r={22 * k} fill="#3c352a" stroke="#d8c9a8" strokeOpacity="0.5" strokeWidth={2} />
            {[[-0.5, 0.62], [0.05, 0.4], [0.55, 0.7]].map(([a, b], i) => <circle key={i} cx={cx + a * mapR} cy={cy + b * mapR} r={9 * k} fill={TEAM[0]} stroke="#000" strokeWidth="2" />)}
            {[[-0.45, -0.5], [0.6, -0.3]].map(([a, b], i) => <circle key={i} cx={cx + a * mapR} cy={cy + b * mapR} r={9 * k} fill={TEAM[1]} stroke="#000" strokeWidth="2" />)}
          </g>
          {x.objectives.midboss && <text x={cx} y={cy + 6 * k} textAnchor="middle" fontSize={Math.max(14, 16 * k)} fontWeight="800" fill={OFF_WHITE} stroke="#000" strokeWidth="4" paintOrder="stroke">{mmss(rejuv)}</text>}
        </g>
      </g>
    </svg>
  )
}
