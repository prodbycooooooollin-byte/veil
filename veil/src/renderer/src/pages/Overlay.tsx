// Runs in the transparent, click-through overlay window: just the crosshair, centred on the screen.
import { useEffect, useState } from 'react'
import { CrosshairSVG } from '../components/CrosshairSVG'
import { api } from '../lib/api'
import type { XSpec } from '../lib/crosshair'

export default function Overlay() {
  const [spec, setSpec] = useState<XSpec | null>(null)
  useEffect(() => {
    api.getOverlaySpec().then((s) => s && setSpec(s as XSpec))
    return api.onOverlaySpec((s) => setSpec(s as XSpec))
  }, [])
  if (!spec) return null
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <CrosshairSVG s={spec} />
    </div>
  )
}
