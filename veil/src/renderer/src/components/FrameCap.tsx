// Drives a <Canvas frameloop="demand"> at a fixed rate instead of the monitor's refresh rate (up to 240 Hz),
// and stops it completely while VEIL is hidden or not focused, so it never takes GPU time from the game.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function FrameCap({ fps = 30 }: { fps?: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let timer = 0
    const run = () => {
      clearInterval(timer)
      timer = 0
      invalidate() // always one frame, so the scene shows even when VEIL starts in the background
      if (document.hidden || !document.hasFocus()) return
      timer = window.setInterval(invalidate, 1000 / fps)
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
