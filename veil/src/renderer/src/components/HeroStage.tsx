// Lobby hero: the 3D model under a cold key light and a rim light in the hero's colour, on a floor that fades out.
import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Boundary, HeroModel, Parallax } from './HeroModel'
import { Silhouette } from './Silhouette'
import { FrameCap } from './FrameCap'
import type { Hero } from '../lib/heroes'

/** Reflections from a few soft panels, built locally so nothing is downloaded. */
export function StudioEnv({ color }: { color: string }) {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 4, 2]} scale={[6, 2, 1]} color="#f3ead9" />
      <Lightformer form="rect" intensity={3} position={[-4, 1.5, -2]} rotation-y={Math.PI / 2.5} scale={[2, 5, 1]} color={color} />
      <Lightformer form="rect" intensity={1.4} position={[4, 1, -1]} rotation-y={-Math.PI / 2.5} scale={[2, 4, 1]} color="#5fe0c4" />
    </Environment>
  )
}

export function HeroStage({ hero }: { hero?: Hero }) {
  const fallback = <Silhouette color={hero?.color} />
  // the id of the hero whose model is in; a different hero shows the loading line until its model reports in.
  // (No reset effect on hero change: parent effects run after the child's, so it would wipe a cached model's ready.)
  const [ready, setReady] = useState<string | null>(null)
  if (!hero?.model) return fallback
  return (
    <Boundary fallback={fallback} resetKey={hero.id}>
      {ready !== hero.id && <div className="hero-loading">Loading {hero.name}</div>}
      <Canvas onCreated={(st) => st.camera.lookAt(0, 1.02, 0)} frameloop="demand" dpr={[1, 1.25]} camera={{ position: [0, 1.15, 5.6], fov: 30 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} style={{ position: 'absolute', inset: 0 }}>
        <ambientLight intensity={0.28} />
        <spotLight position={[0.6, 6, 3]} angle={0.42} penumbra={0.85} intensity={90} color="#ffffff" />
        <FrameCap fps={30} />
        <directionalLight position={[-3, 2, -2.5]} intensity={4.2} color="#ffffff" />
        <pointLight position={[2.4, 0.8, -1.5]} intensity={14} distance={8} color={hero.color} />
        <Suspense fallback={null}>
          <StudioEnv color={hero.color} />
          <group position={[0, -0.02, 0]}>
            <Parallax amount={0.35}>
              <HeroModel key={hero.id} url={hero.model} onReady={() => setReady(hero.id)} />
            </Parallax>
          </group>
          {/* drawn once the model is in; it barely moves, so the shadow needn't be redrawn every frame */}
          {ready === hero.id && <ContactShadows key={hero.id} frames={1} position={[0, 0, 0]} opacity={0.75} scale={6} blur={2.6} far={2.5} />}
        </Suspense>
      </Canvas>
    </Boundary>
  )
}
