import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface ParticleBuffers {
  pos: Float32Array
  size: Float32Array
  alpha: Float32Array
  /** RGB por partícula (solo si `perColor`). */
  color: Float32Array
}

interface Props {
  count: number
  color: string
  additive?: boolean
  /** Usa el color de cada partícula en vez del color único. */
  perColor?: boolean
  /** Se llama cada frame: aquí se mueven y desvanecen las partículas. */
  update: (b: ParticleBuffers, dt: number, t: number) => void
}

const vertex = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute vec3 pcolor;
  varying float vA;
  varying vec3 vC;
  void main() {
    vA = alpha;
    vC = pcolor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * 700.0 / max(1.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`

const fragment = /* glsl */ `
  uniform vec3 color;
  uniform float uPer;
  varying float vA;
  varying vec3 vC;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uPer > 0.5 ? vC : color, a);
  }`

/** Puntos suaves con tamaño y opacidad por partícula (polvo, luciérnagas…). */
export function Particles({ count, color, additive = false, perColor = false, update }: Props) {
  const geo = useRef<THREE.BufferGeometry>(null)
  const buffers = useMemo<ParticleBuffers>(
    () => ({ pos: new Float32Array(count * 3), size: new Float32Array(count), alpha: new Float32Array(count), color: new Float32Array(count * 3) }),
    [count],
  )
  const uniforms = useMemo(() => ({ color: { value: new THREE.Color(color) }, uPer: { value: perColor ? 1 : 0 } }), [color, perColor])

  useFrame(({ clock }, dt) => {
    update(buffers, Math.min(dt, 0.05), clock.elapsedTime)
    const g = geo.current
    if (!g) return
    g.attributes.position.needsUpdate = true
    g.attributes.size.needsUpdate = true
    g.attributes.alpha.needsUpdate = true
    if (perColor) g.attributes.pcolor.needsUpdate = true
  })

  return (
    <points frustumCulled={false} renderOrder={5}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[buffers.pos, 3]} />
        <bufferAttribute attach="attributes-size" args={[buffers.size, 1]} />
        <bufferAttribute attach="attributes-alpha" args={[buffers.alpha, 1]} />
        <bufferAttribute attach="attributes-pcolor" args={[buffers.color, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  )
}
