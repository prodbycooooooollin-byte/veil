// The hero's model (GLB from the Deadlock API) in its rest pose: standing straight, arms down, which reads far
// better for customising than the dramatic hero-select pose the file also carries (that clip is not played).
// Scaled to a fixed height with its feet at y=0, with a slight breathing motion on the spine.
import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

export const HERO_HEIGHT = 2

export function HeroModel({ url, onReady }: { url: string; onReady?: () => void }) {
  const gltf = useGLTF(url)

  const { scene, fit, spine, head } = useMemo(() => {
    const scene = cloneSkinned(gltf.scene) as THREE.Object3D
    let spine: THREE.Bone | undefined, head: THREE.Bone | undefined
    scene.traverse((o) => {
      const b = o as THREE.Bone
      if (b.isBone && b.name === 'spine_2') spine = b
      if (b.isBone && b.name === 'head') head = b
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.frustumCulled = false
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        for (const mat of mats) if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.9
      }
    })
    scene.updateMatrixWorld(true)
    // precise: skinned vertices with bone transforms applied
    const box = new THREE.Box3().setFromObject(scene, true)
    const size = box.getSize(new THREE.Vector3())
    const s = HERO_HEIGHT / Math.max(size.y, 0.0001)
    const c = box.getCenter(new THREE.Vector3())
    return { scene, spine, head, fit: { s, x: -c.x * s, y: -box.min.y * s, z: -c.z * s }, base: 0 }
  }, [gltf.scene])

  useEffect(() => { onReady?.() }, [scene, onReady])

  const rest = useRef<{ spine?: THREE.Euler; head?: THREE.Euler }>({})
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (spine) {
      rest.current.spine ??= spine.rotation.clone()
      spine.rotation.x = rest.current.spine.x + Math.sin(t * 1.4) * 0.012
    }
    if (head) {
      rest.current.head ??= head.rotation.clone()
      head.rotation.y = rest.current.head.y + Math.sin(t * 0.45) * 0.04
    }
  })

  return <primitive object={scene} scale={fit.s} position={[fit.x, fit.y, fit.z]} />
}

/** Turns the group slightly towards the pointer. */
export function Parallax({ children, amount = 0.25 }: { children: ReactNode; amount?: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ pointer }) => {
    if (!g.current) return
    g.current.rotation.y += (pointer.x * amount - g.current.rotation.y) * 0.05
  })
  return <group ref={g}>{children}</group>
}

export class Boundary extends Component<{ fallback: ReactNode; children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
