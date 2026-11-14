// The Forge's stage: the chosen hero on a small brass-rimmed platform under a cone of light, inside a dark
// curved backdrop, with the health bar and damage numbers projected over their head every frame.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { FrameCap } from '../components/FrameCap'
import * as THREE from 'three'
import { Boundary, HeroModel, HERO_HEIGHT } from '../components/HeroModel'
import { StudioEnv } from '../components/HeroStage'
import { drawBar } from '../lib/hpbar'
import { useStore } from '../lib/store'
import type { Hero } from '../lib/heroes'
import type { Hit, Sim } from './sim'

export type Tab = 'bar' | 'colors' | 'number' | 'stamina' | 'ult' | 'map' | 'timers' | 'souls' | 'crosshair' | 'damage' | 'hero' | 'export'

export function ForgeScene({ hero, sim, tab, barRef, dmgRef }: { hero?: Hero; sim: Sim; tab: Tab; barRef: RefObject<HTMLCanvasElement | null>; dmgRef: RefObject<HTMLDivElement | null> }) {
  const color = hero?.color ?? '#d4a855'
  // the head's height in this pose (crouching heroes like Drifter stand lower); the bar floats just above it
  const [top, setTop] = useState(HERO_HEIGHT)
  const onFit = useCallback((f: { top: number }) => setTop(f.top), [])
  return (
    <Canvas className="three" shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0.6, 1.7, 5.4], fov: 32 }} gl={{ antialias: true }}>
      <color attach="background" args={['#030303']} />
      <fog attach="fog" args={['#030303', 9, 22]} />
      <ambientLight intensity={0.35} />
      {/* 60 fps is plenty for a model you turn by hand; the bar sim and damage numbers run in useFrame */}
      <FrameCap fps={60} />
      <spotLight position={[0.6, 6.5, 2.2]} angle={0.42} penumbra={0.85} intensity={95} distance={14} decay={1.6} color="#f6ecd9" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[-3.2, 2.4, -2.8]} intensity={2.6} color={color} />
      <directionalLight position={[3.4, 1.4, -2.4]} intensity={1.4} color="#5fe0c4" />
      <directionalLight position={[0, 1.6, 4]} intensity={0.55} color="#f3ead9" />
      <Suspense fallback={null}><StudioEnv color={color} /></Suspense>

      <Boundary fallback={<Mannequin color={color} />} resetKey={hero?.id}>
        <Suspense fallback={<Mannequin color={color} />}>
          <group position-y={0.07}>{hero?.model ? <HeroModel key={hero.id} url={hero.model} onReady={onFit} /> : <Mannequin color={color} />}</group>
        </Suspense>
      </Boundary>

      <BarPainter sim={sim} canvas={barRef} />
      <Project el={barRef} at={[0, top + 0.07 + 0.3, 0]} />
      <Project el={dmgRef} at={[0.55, top + 0.07 + 0.25, 0]} anchor="left" />
      <Cyclorama color={color} />
      <Platform color={color} />
      <LightCone />
      <ContactShadows position={[0, 0.071, 0]} opacity={0.8} scale={2.4} blur={2} far={2} />
      <Rig aim={tab === 'crosshair'} />
    </Canvas>
  )
}

/** A dark sphere around the stage: near black at the floor, a faint warm wash behind the hero. */
function Cyclorama({ color }: { color: string }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vP; uniform vec3 tint;
      void main(){
        float h = vP.y;
        vec3 base = mix(vec3(.012), vec3(.045, .04, .035), smoothstep(-.05, .35, h));
        base = mix(base, vec3(.01), smoothstep(.35, .9, h));
        float back = pow(max(0., -vP.z), 3.) * smoothstep(-.1, .3, h) * (1. - smoothstep(.3, .7, h));
        base += tint * back * .09 + vec3(.9, .8, .6) * back * .03;
        gl_FragColor = vec4(base, 1.);
      }`,
  }), [color])
  return <mesh material={mat}><sphereGeometry args={[18, 48, 32]} /></mesh>
}

function Platform({ color }: { color: string }) {
  const floor = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vU;
      void main(){
        float r = length(vU);
        vec2 g = abs(fract(vU * 1.25) - .5) / fwidth(vU * 1.25);
        float line = 1. - min(min(g.x, g.y), 1.);
        float fade = 1. - smoothstep(1.5, 7., r);
        float pool = 1. - smoothstep(.4, 3.2, r);
        vec3 c = vec3(.03, .028, .025) + vec3(.9, .82, .7) * pool * .05;
        gl_FragColor = vec4(c + vec3(.9, .85, .75) * line * .05 * fade, fade * .96);
      }`,
  }), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={floor} receiveShadow><planeGeometry args={[16, 16]} /></mesh>
      <mesh position-y={0.035} receiveShadow castShadow>
        <cylinderGeometry args={[0.92, 0.96, 0.07, 96]} />
        <meshStandardMaterial color="#0d0c0b" metalness={0.75} roughness={0.38} />
      </mesh>
      <mesh position-y={0.071} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.86, 0.9, 128]} />
        <meshStandardMaterial color="#d4a855" metalness={1} roughness={0.25} emissive="#5a3d10" emissiveIntensity={0.4} />
      </mesh>
      <mesh position-y={0.0715} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.505, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** The visible beam of the overhead light: an open cone, brightest at the top and fading out. */
function LightCone() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 w = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }',
    fragmentShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = edge * smoothstep(0., .9, vY) * .085; gl_FragColor = vec4(vec3(1., .93, .8) * a, a); }',
  }), [])
  return <mesh material={mat} position={[0.25, 3.3, 0.75]} rotation-x={-0.12}><cylinderGeometry args={[0.18, 1.35, 6.6, 64, 1, true]} /></mesh>
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

// roomy enough for vertical bars and an ult indicator above or below
export const BAR_W = 380, BAR_H = 240

/** Keeps a DOM element glued to a point in the scene, scaled by distance the way the game scales overhead bars. */
function Project({ el, at, anchor = 'center' }: { el: RefObject<HTMLElement | null>; at: [number, number, number]; anchor?: 'center' | 'left' }) {
  const v = useRef(new THREE.Vector3())
  const { camera, size } = useThree()
  useFrame(() => {
    const e = el.current
    if (!e) return
    // OrbitControls has already moved the camera this frame; refresh its matrices so the bar isn't a frame behind
    camera.updateMatrixWorld()
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
  return <OrbitControls makeDefault enabled={!aim} enablePan={false} target={[0, 1.25, 0]} minDistance={3.2} maxDistance={7.5} minPolarAngle={1.05} maxPolarAngle={1.56} minAzimuthAngle={-1.2} maxAzimuthAngle={1.2} enableDamping dampingFactor={0.08} rotateSpeed={0.6} />
}
