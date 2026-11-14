import { useId } from 'react'
import type { XSpec } from '../lib/crosshair'

/** Draws a crosshair spec at 1 css px per unit (times spec.scale and `zoom`). */
export function CrosshairSVG({ s, zoom = 1, animate = true }: { s: XSpec; zoom?: number; animate?: boolean }) {
  const id = useId().replace(/:/g, '')
  const k = s.scale * zoom
  const L = s.lines, o = s.outline
  const extent = Math.max(
    L.on ? L.gap + Math.max(L.length, L.lengthV ?? 0) : 0, s.dot.on ? s.dot.size : 0, s.ring.on ? s.ring.radius + s.ring.thickness : 0,
    s.brackets.on ? s.brackets.gap + s.brackets.size : 0, s.chevron.on ? s.chevron.offset + s.chevron.size : 0, 4,
  ) + (s.glow.on ? s.glow.size * 2 : 0) + 4
  const size = extent * 2 * k
  const fill = s.color2 ? `url(#g${id})` : s.color
  const ol = o.on ? { stroke: o.color, strokeOpacity: o.opacity, strokeWidth: o.width * 2, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const } : {}
  const crisp = !L.rotate && !L.taper && !L.round ? 'crispEdges' : 'geometricPrecision'

  const lineEls = L.on ? [0, 90, 180, 270].filter((a) => !(L.tShape && a === 270)).map((a) => {
    const ang = a + L.rotate
    const len = (a === 90 || a === 270) && L.lengthV !== null ? L.lengthV : L.length
    const shape = L.taper
      ? <polygon points={`${L.gap},${-L.thickness * 0.18} ${L.gap + len},${-L.thickness / 2} ${L.gap + len},${L.thickness / 2} ${L.gap},${L.thickness * 0.18}`} />
      : <rect x={L.gap} y={-L.thickness / 2} width={len} height={L.thickness} rx={L.round ? L.thickness / 2 : 0} />
    return <g key={a} transform={`rotate(${ang})`}>{shape}</g>
  }) : null

  const d = s.dot
  const dotEl = d.on ? (d.shape === 'circle' ? <circle r={d.size / 2} />
    : d.shape === 'square' ? <rect x={-d.size / 2} y={-d.size / 2} width={d.size} height={d.size} />
    : <polygon points={`0,${-d.size * 0.7} ${d.size * 0.55},0 0,${d.size * 0.7} ${-d.size * 0.55},0`} />) : null

  const ringDash = s.ring.segments > 0 ? (() => {
    const c = 2 * Math.PI * s.ring.radius, seg = c / s.ring.segments
    return `${seg * 0.62} ${seg * 0.38}`
  })() : undefined
  const B = s.brackets
  const bracketPath = B.on ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const x = sx * B.gap, y = sy * B.gap
    return `M${x} ${y - sy * B.size}L${x} ${y}L${x - sx * B.size} ${y}`
  }).join(' ') : ''
  const C = s.chevron
  const chevPath = C.on ? `M${-C.size} ${C.offset + C.size * 0.62}L0 ${C.offset}L${C.size} ${C.offset + C.size * 0.62}` : ''

  const anim = animate && s.motion !== 'none' ? `xh-${s.motion} ${s.motion === 'spin' ? 6 : 1.8}s ${s.motion === 'spin' ? 'linear' : 'ease-in-out'} infinite` : undefined

  return (
    <svg width={size} height={size} viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`} style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <defs>
        {s.color2 && (
          <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={-extent} x2="0" y2={extent}>
            <stop offset="0.3" stopColor={s.color} /><stop offset="0.7" stopColor={s.color2} />
          </linearGradient>
        )}
        {s.glow.on && (
          <filter id={`f${id}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={s.glow.size / 2.5} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <g opacity={s.opacity} filter={s.glow.on ? `url(#f${id})` : undefined} style={{ animation: anim, transformOrigin: '0 0', transformBox: 'view-box' }}>
        {o.on && (
          <g fill="none" stroke={o.color} strokeOpacity={o.opacity} strokeLinecap="round" strokeLinejoin="round">
            {s.ring.on && <circle r={s.ring.radius} strokeWidth={s.ring.thickness + o.width * 2} strokeDasharray={ringDash} transform="rotate(-90)" />}
            {B.on && <path d={bracketPath} strokeWidth={B.thickness + o.width * 2} />}
            {C.on && <path d={chevPath} strokeWidth={C.thickness + o.width * 2} />}
          </g>
        )}
        <g fill="none" stroke={fill} strokeLinejoin="round">
          {s.ring.on && <circle r={s.ring.radius} strokeWidth={s.ring.thickness} strokeDasharray={ringDash} transform="rotate(-90)" />}
          {B.on && <path d={bracketPath} strokeWidth={B.thickness} />}
          {C.on && <path d={chevPath} strokeWidth={C.thickness} strokeLinecap="round" />}
        </g>
        <g fill={fill} shapeRendering={crisp} {...ol}>
          {lineEls}
          {dotEl}
        </g>
      </g>
    </svg>
  )
}
