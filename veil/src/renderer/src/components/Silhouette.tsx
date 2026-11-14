// Drawn stand-in for hero art when the asset API can't be reached: a figure in a long coat and wide-brim hat.
export function Silhouette({ color = '#d4a855' }: { color?: string }) {
  return (
    <svg viewBox="0 0 360 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
      <defs>
        <linearGradient id="sil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1a18" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="rim" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity=".9" />
          <stop offset=".25" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g>
        <ellipse cx="180" cy="92" rx="88" ry="14" fill="url(#sil)" />
        <path d="M138 92c2-30 18-48 42-48s40 18 42 48z" fill="url(#sil)" />
        <path d="M152 100c0 26 12 44 28 44s28-18 28-44z" fill="url(#sil)" />
        <path d="M110 170c18-22 44-30 70-30s52 8 70 30l26 160-30 6 6 164H108l6-164-30-6z" fill="url(#sil)" />
        <path d="M110 170c18-22 44-30 70-30s52 8 70 30l26 160-30 6 6 164H108l6-164-30-6z" fill="url(#rim)" opacity=".5" />
        <path d="M180 144l-14 60 14 190 14-190z" fill="#000" opacity=".5" />
      </g>
    </svg>
  )
}
