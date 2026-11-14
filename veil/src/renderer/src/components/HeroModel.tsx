// The hero's model (GLB from the Deadlock API) in the pose the game shows on the hero select screen.
// Weapons and props (Abrams' gun and book, Apollo's sword) are skinned to the hero's skeleton, so without that
// pose the hero stands in its bind pose with everything it carries lying at its feet. The file's only clip
// is that one-frame pose; it is applied once, before the model is measured. Scaled to a fixed height with its
// feet at y=0, with a slight breathing motion on the spine on top of the pose.
import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

export const HERO_HEIGHT = 2

/** `overhead` is DOM content pinned just above the hero's head (the home page puts the Forge bar there). */
export function HeroModel({ url, onReady, overhead }: { url: string; onReady?: (fit: { top: number }) => void; overhead?: ReactNode }) {
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
    // size first, in the bind pose: every hero stands straight there, so all of them come out the same
    // height (posed, a crouching hero like Drifter would be scaled up)
    scene.updateMatrixWorld(true)
    const bindBox = new THREE.Box3().setFromObject(scene, true)
    const s = HERO_HEIGHT / Math.max(bindBox.max.y - bindBox.min.y, 0.0001)
    const pelvis = scene.getObjectByName('pelvis') ?? scene.getObjectByName('root')
    const bindQ = pelvis?.getWorldQuaternion(new THREE.Quaternion())

    // the one-frame hero select pose ('ui_pose', 'ui_hero_select'): puts weapons and props in the hands
    const clip = gltf.animations.find((a) => /ui_(pose|hero_select)/i.test(a.name)) ?? gltf.animations[0]
    if (clip) {
      const mixer = new THREE.AnimationMixer(scene)
      mixer.clipAction(clip).play()
      mixer.update(0)
    }
    scene.updateMatrixWorld(true)

    // the hero select scene turns some heroes away (Graves stands with her back to the camera): undo the
    // body's turn so every hero faces the viewer, as in the bind pose
    let yaw = 0
    if (pelvis && bindQ) {
      const delta = pelvis.getWorldQuaternion(new THREE.Quaternion()).multiply(bindQ.clone().invert())
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(delta)
      yaw = Math.atan2(fwd.x, fwd.z)
    }
    const turn = new THREE.Group()
    turn.rotation.y = -yaw
    turn.add(scene)
    turn.updateMatrixWorld(true)

    // centre and stand on the floor in the pose
    const box = new THREE.Box3().setFromObject(turn, true)
    const c = box.getCenter(new THREE.Vector3())
    const headBone = scene.getObjectByName('head')
    const headY = headBone ? headBone.getWorldPosition(new THREE.Vector3()).y : box.max.y
    return { scene: turn as THREE.Object3D, spine, head, fit: { s, x: -c.x * s, y: -box.min.y * s, z: -c.z * s, top: (headY - box.min.y) * s }, base: 0 }
  }, [gltf.scene, gltf.animations])

  // reports where the head is, so overhead bars sit on it whatever the pose
  useEffect(() => { onReady?.({ top: fit.top }) }, [scene, onReady])

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

  return (
    <group>
      <primitive object={scene} scale={fit.s} position={[fit.x, fit.y, fit.z]} />
      {overhead && <Html center position={[0, fit.top + 0.3, 0]} zIndexRange={[20, 0]}>{overhead}</Html>}
    </group>
  )
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
