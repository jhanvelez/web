import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAMPS } from '../../lib/layout'
import { live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import { Particles, type ParticleBuffers } from './Particles'

const FLIES = 150
const SPREAD = 22

/** Luciérnagas: nubes de luz dorada que flotan alrededor del arriero y lo acompañan por el mundo. */
export function Fireflies() {
  const seeds = useMemo(
    () =>
      Array.from({ length: FLIES }, () => ({
        ox: (Math.random() * 2 - 1) * SPREAD,
        oz: (Math.random() * 2 - 1) * SPREAD,
        h: 0.4 + Math.random() * 2.4,
        sp: 0.3 + Math.random() * 0.7,
        ph: Math.random() * 100,
        sz: 0.07 + Math.random() * 0.12,
      })),
    [],
  )
  const update = (b: ParticleBuffers, _dt: number, t: number) => {
    const p = live.player
    for (let i = 0; i < FLIES; i++) {
      const s = seeds[i]
      // El campo se desplaza con el jugador y "envuelve", así siempre hay luciérnagas cerca.
      const wrap = (o: number, c: number) => ((((o - c + SPREAD) % (SPREAD * 2)) + SPREAD * 2) % (SPREAD * 2)) - SPREAD + c
      const x = wrap(s.ox + Math.sin(t * s.sp + s.ph) * 1.4, p.x)
      const z = wrap(s.oz + Math.cos(t * s.sp * 0.8 + s.ph) * 1.4, p.z)
      b.pos[i * 3] = x
      b.pos[i * 3 + 1] = terrainHeight(x, z) + s.h + Math.sin(t * s.sp * 2 + s.ph) * 0.3
      b.pos[i * 3 + 2] = z
      b.size[i] = s.sz
      const edge = 1 - Math.min(1, Math.hypot(x - p.x, z - p.z) / SPREAD)
      b.alpha[i] = (0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 * s.sp + s.ph * 3))) * Math.min(1, edge * 2.2)
    }
  }
  return <Particles count={FLIES} color="#cfe9f5" additive update={update} />
}

function Lamp({ x, z }: { x: number; z: number }) {
  const bulb = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const y = terrainHeight(x, z)
  const phase = useMemo(() => Math.random() * 6, [])
  useFrame(({ clock }) => {
    const f = 1 + Math.sin(clock.elapsedTime * 7 + phase) * 0.04 + Math.sin(clock.elapsedTime * 13 + phase) * 0.03
    if (bulb.current) bulb.current.emissiveIntensity = 2.2 * f
    if (light.current) light.current.intensity = 9 * f
  })
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.2, 6]} />
        <meshStandardMaterial color="#0e0e12" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.42]} />
        <meshStandardMaterial color="#0e0e12" flatShading />
      </mesh>
      <mesh position={[0, 2.12, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial ref={bulb} color="#ffe2a0" emissive="#ffa83a" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.93, 0]}>
        <boxGeometry args={[0.36, 0.06, 0.36]} />
        <meshStandardMaterial color="#0e0e12" flatShading />
      </mesh>
      <pointLight ref={light} position={[0, 2.1, 0]} color="#ffa94d" intensity={9} distance={11} decay={2} />
    </group>
  )
}

/** Farolas de cada plaza: aportan el brillo cálido del atardecer. */
export function Lamps() {
  return (
    <>
      {LAMPS.map(([x, z], i) => (
        <Lamp key={i} x={x} z={z} />
      ))}
    </>
  )
}
