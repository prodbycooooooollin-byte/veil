// Drives a <Canvas frameloop="demand"> at a fixed rate instead of the monitor's refresh rate (up to 240 Hz).
// While VEIL isn't focused (you're in the game) it drops to a trickle, enough that a model which finishes
// loading still appears; minimised or hidden, it stops completely.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

const BACKGROUND_FPS = 4

export function FrameCap({ fps = 30 }: { fps?: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let timer = 0
    const run = () => {
      clearInterval(timer)
      timer = 0
      invalidate()
      if (document.hidden) return
      timer = window.setInterval(invalidate, 1000 / (document.hasFocus() ? fps : BACKGROUND_FPS))
    }
    run()
    window.addEventListener('focus', run)
    window.addEventListener('blur', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', run)
      window.removeEventListener('blur', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [invalidate, fps])
  return null
}
