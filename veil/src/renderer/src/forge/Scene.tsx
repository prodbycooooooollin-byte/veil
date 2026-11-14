// The Forge's 3D range: the chosen hero on a reflective floor in front of their own background art,
// with the health bar and damage numbers floating over their head exactly where the game puts them.
import { Suspense, useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { ContactShadows, MeshReflectorMaterial, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Boundary, HeroModel, HERO_HEIGHT } from '../components/HeroModel'
import { StudioEnv } from '../components/HeroStage'
import { drawBar } from '../lib/hpbar'
import { useStore } from '../lib/store'
import type { Hero } from '../lib/heroes'
import type { Hit, Sim } from './sim'

export type Tab = 'bar' | 'colors' | 'number' | 'stamina' | 'crosshair' | 'damage' | 'hero' | 'export'

export function ForgeScene({ hero, sim, tab, barRef, dmgRef }: { hero?: Hero; sim: Sim; tab: Tab; barRef: RefObject<HTMLCanvasElement | null>; dmgRef: RefObject<HTMLDivElement | null> }) {
  const color = hero?.color ?? '#d4a855'
  return (
    <Canvas className="three" shadows dpr={[1, 1.75]} camera={{ position: [0.5, 1.75, 5.6], fov: 34 }} gl={{ antialias: true }}>
      <color attach="background" args={['#040404']} />
      <fog attach="fog" args={['#040404', 7, 17]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 3]} intensity={2.4} color="#f3ead9" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2.2, -2.5]} intensity={3} color={color} />
      <pointLight position={[2.6, 1, -1.5]} intensity={18} distance={8} color="#5fe0c4" />
      <Suspense fallback={null}>
        <StudioEnv color={color} />
      </Suspense>
      {hero?.background && (
        <Boundary fallback={null} resetKey={hero.id}>
          <Suspense fallback={null}><Backdrop url={hero.background} /></Suspense>
        </Boundary>
      )}

      <Boundary fallback={<Mannequin color={color} />} resetKey={hero?.id}>
        <Suspense fallback={<Mannequin color={color} />}>
          {hero?.model ? <HeroModel key={hero.id} url={hero.model} /> : <Mannequin color={color} />}
        </Suspense>
      </Boundary>

      <BarPainter sim={sim} canvas={barRef} />
      <Project el={barRef} at={[0, HERO_HEIGHT + 0.32, 0]} />
      <Project el={dmgRef} at={[0.55, HERO_HEIGHT + 0.25, 0]} anchor="left" />
      <Floor color={color} />
      <Sparkles count={40} scale={[8, 3, 6]} position={[0, 1.6, -1]} size={1.6} speed={0.25} opacity={0.35} color={color} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.7} scale={6} blur={2.4} far={2.5} />
      <Rig aim={tab === 'crosshair'} />
    </Canvas>
  )
}

function Backdrop({ url }: { url: string }) {
  const tex = useLoader(THREE.TextureLoader, url)
  tex.colorSpace = THREE.SRGBColorSpace
  const aspect = tex.image ? tex.image.width / tex.image.height : 16 / 9
  return (
    <mesh position={[0, 3.2, -7.5]}>
      <planeGeometry args={[11 * aspect, 11]} />
      <meshBasicMaterial map={tex} color="#5a5650" toneMapped={false} fog={false} transparent opacity={0.55} />
    </mesh>
  )
}

function Floor({ color }: { color: string }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial resolution={512} mirror={0.35} blur={[400, 120]} mixBlur={1} mixStrength={2.2} color="#0b0b0b" metalness={0.5} roughness={0.9} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004}>
        <ringGeometry args={[0.62, 0.64, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.003}>
        <ringGeometry args={[0.9, 0.903, 96]} />
        <meshBasicMaterial color="#ede4d3" transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

/** Stand-in figure while the model loads or if it can't be loaded. */
function Mannequin({ color }: { color: string }) {
  const mat = <meshStandardMaterial color="#1a1918" roughness={0.6} metalness={0.2} />
  return (
    <group>
      <mesh position={[0, 1.15, 0]} castShadow><capsuleGeometry args={[0.26, 0.7, 6, 16]} />{mat}</mesh>
      <mesh position={[0, 1.78, 0]} castShadow><sphereGeometry args={[0.16, 24, 24]} />{mat}</mesh>
      <mesh position={[0, 1.92, 0]} castShadow><cylinderGeometry args={[0.36, 0.36, 0.025, 32]} />{mat}</mesh>
      <mesh position={[0, 2.0, 0]} castShadow><cylinderGeometry args={[0.15, 0.17, 0.16, 24]} />{mat}</mesh>
      <mesh position={[0, 0.6, 0]} castShadow><coneGeometry args={[0.42, 1.1, 24, 1, true]} /><meshStandardMaterial color="#121110" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.15, -0.27]}><planeGeometry args={[0.02, 0.9]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  )
}

export const BAR_W = 280, BAR_H = 96

/** Keeps a DOM element glued to a point in the scene, scaled by distance the way the game scales overhead bars. */
function Project({ el, at, anchor = 'center' }: { el: RefObject<HTMLElement | null>; at: [number, number, number]; anchor?: 'center' | 'left' }) {
  const v = useRef(new THREE.Vector3())
  const { camera, size } = useThree()
  useFrame(() => {
    const e = el.current
    if (!e) return
    v.current.set(...at).project(camera)
    const x = (v.current.x * 0.5 + 0.5) * size.width
    const y = (-v.current.y * 0.5 + 0.5) * size.height
    const d = camera.position.distanceTo(new THREE.Vector3(...at))
    const k = Math.max(0.45, Math.min(1.6, 4.4 / d))
    e.style.transform = `translate(${x}px, ${y}px) translate(${anchor === 'center' ? '-50%' : '0'}, -50%) scale(${k})`
    e.style.transformOrigin = anchor === 'center' ? '50% 50%' : '0 50%'
    e.style.visibility = v.current.z < 1 ? 'visible' : 'hidden'
  })
  return null
}

function BarPainter({ sim, canvas }: { sim: Sim; canvas: RefObject<HTMLCanvasElement | null> }) {
  useFrame((_, dt) => {
    const c = canvas.current
    if (!c) return
    const s = useStore.getState()
    const dpr = Math.min(2, window.devicePixelRatio || 1) * 1.5
    if (c.width !== BAR_W * dpr) { c.width = BAR_W * dpr; c.height = BAR_H * dpr }
    sim.step(Math.min(dt, 0.05), performance.now() / 1000, true)
    drawBar(c.getContext('2d')!, BAR_W, BAR_H, dpr, s.bar, s.side, sim, { vertical: s.verticalBars })
  })
  return null
}

/** Floating damage numbers in the three game modes. Plain DOM, positioned by <Project>. */
export function DamageNumbers({ sim }: { sim: Sim }) {
  const mode = useStore((s) => s.damageMode)
  const [hits, setHits] = useState<Hit[]>([])
  const [total, setTotal] = useState<{ v: number; key: number; show: boolean }>({ v: 0, key: 0, show: false })
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout> | undefined
    let hide: ReturnType<typeof setTimeout> | undefined
    sim.onHit = (h) => {
      setHits((x) => [...x.filter((y) => h.t - y.t < 1.2), h])
      clearTimeout(idle); clearTimeout(hide)
      if (mode === 1) setTotal({ v: sim.total, key: h.id, show: true })
      if (mode === 2) setTotal((t) => ({ ...t, show: false }))
      idle = setTimeout(() => {
        if (mode === 2) setTotal({ v: sim.total, key: h.id, show: true })
        hide = setTimeout(() => setTotal((t) => ({ ...t, show: false })), mode === 2 ? 1300 : 500)
      }, mode === 2 ? 900 : 1100)
    }
    return () => { sim.onHit = undefined; clearTimeout(idle); clearTimeout(hide) }
  }, [sim, mode])

  return (
    <div style={{ position: 'relative', width: 140, height: 120 }}>
      {mode === 0 && hits.map((h, i) => (
        <span key={h.id} className="dmg" style={{ left: 8 + ((h.id * 37) % 50), color: h.head ? '#f2c14e' : '#fff', fontSize: h.head ? 26 : 21, zIndex: i }}>{h.dmg}</span>
      ))}
      {mode !== 0 && total.show && <span key={total.key} className="dmg total" style={{ left: 10 }}>{total.v}</span>}
    </div>
  )
}

function Rig({ aim }: { aim: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; enabled: boolean; update: () => void } | null }
  const goal = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    if (!aim) return
    goal.current.set(0.35, 1.75, 7.2)
    camera.position.lerp(goal.current, Math.min(1, dt * 3))
    if (controls) { controls.target.lerp(new THREE.Vector3(0, 1.45, 0), Math.min(1, dt * 3)); controls.update() }
  })
  return <OrbitControls makeDefault enabled={!aim} enablePan={false} target={[0, 1.3, 0]} minDistance={2.2} maxDistance={8} minPolarAngle={0.6} maxPolarAngle={1.62} enableDamping dampingFactor={0.08} />
}
