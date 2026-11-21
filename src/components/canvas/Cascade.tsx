import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRng } from '../../lib/random'
import { terrainHeight } from '../../lib/terrain'
import { CASCADE, WATER_LEVEL } from '../../lib/world'
import { Instanced, type InstanceItem } from './Instanced'
import { Particles, type ParticleBuffers } from './Particles'

const SEG = 30

/** Cinta de agua que baja por la cara de la loma y se hunde en la laguna. */
function useRibbon() {
  return useMemo(() => {
    const { from, to } = CASCADE
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    let rows = 0
    let end: [number, number] = [to[0], to[1]]
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG
      const x = from[0] + (to[0] - from[0]) * t
      const zc = from[1] + (to[1] - from[1]) * t + Math.sin(t * 5) * 0.22
      const w = 0.55 + 0.7 * t // se abre al caer
      const yc = terrainHeight(x, zc)
      if (yc < WATER_LEVEL + 0.12 && i > 2) break
      end = [x, zc]
      for (const s of [-1, 1]) {
        const z = zc + s * w
        pos.push(x, terrainHeight(x, z) + 0.1, z)
        uv.push(s, t * 3)
      }
      if (rows > 0) {
        const a = (rows - 1) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
      rows++
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    return { geo: g, end }
  }, [])
}

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`
const frag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(1.0, 0.55, abs(vUv.x));
    float flow = sin(vUv.y * 22.0 - uTime * 5.0 + sin(vUv.x * 9.0) * 1.6);
    float flow2 = sin(vUv.y * 41.0 - uTime * 7.5 + vUv.x * 6.0);
    float foam = smoothstep(0.55, 1.0, flow) * 0.8 + smoothstep(0.7, 1.0, flow2) * 0.5;
    vec3 col = mix(vec3(0.32, 0.54, 0.68), vec3(1.5, 1.6, 1.7), clamp(foam, 0.0, 1.0));
    gl_FragColor = vec4(col, edge * 0.92);
    #include <colorspace_fragment>
  }`

/**
 * Cascada sencilla: una loma de roca junto a la laguna con una cinta de agua que baja corriendo,
 * rocas a los lados y bruma que sube al caer.
 */
export function Waterfall() {
  const { geo, end } = useRibbon()
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const mat = useRef<THREE.ShaderMaterial>(null)

  const rocks = useMemo<InstanceItem[]>(() => {
    const rng = createRng(77)
    const { from, to } = CASCADE
    const items: InstanceItem[] = []
    for (let i = 0; i < 26; i++) {
      const t = rng.next()
      const side = rng.next() < 0.5 ? -1 : 1
      const x = from[0] + (to[0] - from[0]) * t + rng.range(-0.4, 0.4)
      const z = from[1] + (to[1] - from[1]) * t + side * rng.range(1.2, 2.6)
      const s = rng.range(0.25, 0.65)
      items.push({
        position: [x, terrainHeight(x, z) + s * 0.25, z],
        rotation: [rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)],
        scale: [s * 1.2, s * 0.8, s],
        color: rng.pick(['#8c9aa0', '#a3b0b5', '#6f7e86', '#b4c0c4']),
      })
    }
    return items
  }, [])

  // Bruma: gotas que suben desde la base y se desvanecen.
  const MIST = 40
  const mist = useMemo(() => ({ life: new Float32Array(MIST).fill(0).map(() => Math.random()), vel: new Float32Array(MIST * 3), rng: createRng(5) }), [])
  const updateMist = (b: ParticleBuffers, dt: number) => {
    for (let i = 0; i < MIST; i++) {
      mist.life[i] -= dt * 0.5
      if (mist.life[i] <= 0) {
        mist.life[i] = 1
        b.pos[i * 3] = end[0] + mist.rng.range(-0.9, 0.9)
        b.pos[i * 3 + 1] = WATER_LEVEL + 0.15
        b.pos[i * 3 + 2] = end[1] + mist.rng.range(-1.1, 1.1)
        mist.vel[i * 3] = mist.rng.range(-0.15, 0.25)
        mist.vel[i * 3 + 1] = mist.rng.range(0.35, 0.9)
        mist.vel[i * 3 + 2] = mist.rng.range(-0.2, 0.2)
      }
      b.pos[i * 3] += mist.vel[i * 3] * dt
      b.pos[i * 3 + 1] += mist.vel[i * 3 + 1] * dt
      b.pos[i * 3 + 2] += mist.vel[i * 3 + 2] * dt
      const l = mist.life[i]
      b.alpha[i] = Math.sin(Math.min(1, l) * Math.PI) * 0.4
      b.size[i] = 0.7 + (1 - l) * 1.6
    }
  }

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
    void mat.current
  })

  return (
    <group>
      <mesh geometry={geo} renderOrder={3}>
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <Instanced items={rocks}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={1} />
      </Instanced>
      {/* Espuma en la base */}
      <mesh position={[end[0], WATER_LEVEL + 0.04, end[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.6, 28]} />
        <meshBasicMaterial color="#e9fbff" transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </mesh>
      <Particles count={MIST} color="#eaf8ff" update={updateMist} />
    </group>
  )
}
