import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type V3 = [number, number, number]

export interface HorseLook {
  coat: string
  mane: string
  hoof?: string
  /** Medias blancas en las patas. */
  socks?: boolean
  /** Lucero en la frente. */
  blaze?: boolean
  halter?: boolean
}

export interface RiderLook {
  jacket: string
  hat: string
  jeans?: string
}

/** Estado animable del caballo (lo escribe quien lo controla; el modelo solo lo lee). */
export interface HorseRig {
  /** 0 = quieto, 1 = andando. */
  walk: number
  /** Fase de la marcha en ciclos (se incrementa con la distancia recorrida). */
  phase: number
  /** 0 = cabeza en alto, 1 = pastando. */
  graze: number
}
export const makeRig = (): HorseRig => ({ walk: 0, phase: 0, graze: 0 })

const SADDLE = '#5a3a22'
const HALTER = '#b98a52'
const damp = THREE.MathUtils.damp

function P({ size, position, color, rotation, rough = 0.8 }: { size: V3; position: V3; color: string; rotation?: V3; rough?: number }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} flatShading />
    </mesh>
  )
}

// Orden de las patas en la marcha lateral de cuatro tiempos del paso fino.
const LEGS = [
  { x: 0.15, z: 0.38, off: 0.25, front: true },
  { x: -0.15, z: 0.38, off: 0.75, front: true },
  { x: 0.15, z: -0.46, off: 0.5, front: false },
  { x: -0.15, z: -0.46, off: 0, front: false },
] as const

/**
 * Caballo de paso fino colombiano, low-poly. Altura a la cruz = 1 (se escala desde afuera).
 * Cuello arqueado, crin y cola largas, patas articuladas; baja la cabeza a pastar.
 * Frente = +Z; el origen está en el suelo, entre las patas.
 */
export function Horse({ look, rig, rider }: { look: HorseLook; rig: MutableRefObject<HorseRig>; rider?: RiderLook }) {
  const body = useRef<THREE.Group>(null)
  const neck = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const mane = useRef<THREE.Group>(null)
  const tail = useRef<(THREE.Group | null)[]>([])
  const up = useRef<(THREE.Group | null)[]>([])
  const lo = useRef<(THREE.Group | null)[]>([])
  const riderRef = useRef<THREE.Group>(null)
  const hoof = look.hoof ?? '#0d0b0a'

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { walk: w, phase: ph, graze: g } = rig.current
    const a = ph * Math.PI * 2
    const chew = g > 0.5 ? Math.sin(t * 7) * 0.035 : 0

    if (body.current) body.current.position.y = Math.abs(Math.sin(a * 2)) * 0.022 * w
    if (riderRef.current) {
      riderRef.current.position.y = Math.sin(a * 2 + 0.6) * 0.018 * w
      riderRef.current.rotation.z = Math.sin(a) * 0.03 * w
    }
    if (neck.current) neck.current.rotation.x = damp(neck.current.rotation.x, THREE.MathUtils.lerp(0.62 + Math.sin(a * 2) * 0.05 * w, 2.5, g), 8, 1 / 60)
    if (head.current) head.current.rotation.x = THREE.MathUtils.lerp(1.45 + Math.sin(a * 2 + 1) * 0.06 * w, 0.5, g) + chew
    if (mane.current) mane.current.rotation.z = Math.sin(t * 1.6) * 0.05 + Math.sin(a) * 0.08 * w

    // Cola: péndulo de tres tramos que espanta moscas.
    const flick = Math.max(0, Math.sin(t * 0.6)) ** 6
    tail.current.forEach((seg, i) => {
      if (!seg) return
      seg.rotation.z = Math.sin(t * (1.8 + i * 0.3) - i * 0.9) * (0.12 + i * 0.07 + flick * 0.5) + Math.sin(a - i * 0.7) * 0.14 * w
      seg.rotation.x = i === 0 ? 0.5 + w * 0.12 : 0.1 + Math.sin(t * 1.3 + i) * 0.05
    })

    LEGS.forEach((leg, i) => {
      const s = Math.sin(a + leg.off * Math.PI * 2)
      const c = Math.cos(a + leg.off * Math.PI * 2)
      const u = up.current[i]
      const l = lo.current[i]
      if (u) u.rotation.x = -s * 0.5 * w + (leg.front ? 0 : -0.12)
      if (l) l.rotation.x = Math.max(0, c) * 0.95 * w + (leg.front ? 0 : 0.28)
    })
  })

  const sockColor = look.socks ? '#efe9de' : look.coat

  return (
    <group>
      <group ref={body}>
        {/* Tronco, pecho y grupa */}
        <mesh position={[0, 0.78, 0]} scale={[0.3, 0.32, 0.62]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={look.coat} roughness={0.45} metalness={0.08} flatShading />
        </mesh>
        <mesh position={[0, 0.8, 0.38]} scale={[0.29, 0.33, 0.3]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={look.coat} roughness={0.45} metalness={0.08} flatShading />
        </mesh>
        <mesh position={[0, 0.84, -0.42]} scale={[0.3, 0.31, 0.36]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={look.coat} roughness={0.45} metalness={0.08} flatShading />
        </mesh>

        {/* Cuello → cabeza (pivotes para pastar) */}
        <group ref={neck} position={[0, 0.98, 0.42]} rotation={[0.62, 0, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.14, 0.62, 7]} />
            <meshStandardMaterial color={look.coat} roughness={0.45} metalness={0.08} flatShading />
          </mesh>
          {/* Crin larga a un costado */}
          <group ref={mane} position={[0, 0, -0.08]}>
            {Array.from({ length: 7 }, (_, i) => (
              <P key={i} size={[0.03, 0.2, 0.055]} position={[-0.075, 0.08 + i * 0.075, 0]} color={look.mane} rotation={[0, 0, 0.18]} />
            ))}
          </group>
          <group ref={head} position={[0, 0.62, 0]} rotation={[1.45, 0, 0]}>
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.095, 0.42, 7]} />
              <meshStandardMaterial color={look.coat} roughness={0.45} metalness={0.08} flatShading />
            </mesh>
            <P size={[0.1, 0.1, 0.11]} position={[0, 0.4, 0.02]} color={look.coat} />
            {look.blaze && <P size={[0.03, 0.3, 0.02]} position={[0, 0.2, 0.09]} color="#efe9de" />}
            {/* Orejas */}
            {[-0.05, 0.05].map((x) => (
              <mesh key={x} position={[x, -0.02, -0.04]} rotation={[-0.3, 0, 0]} castShadow>
                <coneGeometry args={[0.03, 0.12, 4]} />
                <meshStandardMaterial color={look.coat} flatShading />
              </mesh>
            ))}
            {/* Ojos */}
            {[-0.07, 0.07].map((x) => (
              <mesh key={x} position={[x, 0.1, 0.04]}>
                <sphereGeometry args={[0.018, 6, 4]} />
                <meshStandardMaterial color="#1a0f0a" roughness={0.2} />
              </mesh>
            ))}
            <P size={[0.03, 0.06, 0.1]} position={[0, 0.0, 0.06]} color={look.mane} />
            {look.halter && (
              <>
                <P size={[0.115, 0.03, 0.13]} position={[0, 0.34, 0.02]} color={HALTER} />
                <P size={[0.12, 0.025, 0.14]} position={[0, 0.1, 0.02]} color={HALTER} />
              </>
            )}
          </group>
        </group>

        {/* Cola larga */}
        <group position={[0, 0.98, -0.66]}>
          <group ref={(el) => { tail.current[0] = el }} rotation={[0.5, 0, 0]}>
            <P size={[0.09, 0.3, 0.08]} position={[0, -0.15, 0]} color={look.mane} />
            <group ref={(el) => { tail.current[1] = el }} position={[0, -0.3, 0]}>
              <P size={[0.085, 0.3, 0.07]} position={[0, -0.15, 0]} color={look.mane} />
              <group ref={(el) => { tail.current[2] = el }} position={[0, -0.3, 0]}>
                <P size={[0.07, 0.3, 0.06]} position={[0, -0.15, 0]} color={look.mane} />
              </group>
            </group>
          </group>
        </group>

        {/* Patas: muslo → rodilla → casco */}
        {LEGS.map((leg, i) => (
          <group key={i} ref={(el) => { up.current[i] = el }} position={[leg.x, 0.66, leg.z]}>
            <mesh position={[0, -0.17, 0]} castShadow>
              <cylinderGeometry args={[0.065, 0.05, 0.36, 6]} />
              <meshStandardMaterial color={look.coat} roughness={0.45} metalness={0.08} flatShading />
            </mesh>
            <group ref={(el) => { lo.current[i] = el }} position={[0, -0.34, 0]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <cylinderGeometry args={[0.042, 0.04, 0.3, 6]} />
                <meshStandardMaterial color={sockColor} roughness={0.5} flatShading />
              </mesh>
              <P size={[0.085, 0.07, 0.1]} position={[0, -0.31, 0.01]} color={hoof} rough={0.4} />
            </group>
          </group>
        ))}

        {/* Silla y jinete (chalán) */}
        {rider && (
          <group ref={riderRef}>
            <P size={[0.36, 0.07, 0.44]} position={[0, 0.99, -0.04]} color={SADDLE} rough={0.6} />
            <P size={[0.1, 0.09, 0.06]} position={[0, 1.04, 0.14]} color={SADDLE} rough={0.6} />
            <P size={[0.34, 0.025, 0.4]} position={[0, 0.955, -0.04]} color="#2a1c14" />
            <Chalan look={rider} />
          </group>
        )}
        {rider && (
          // Riendas
          <P size={[0.012, 0.012, 0.5]} position={[0, 1.15, 0.38]} color="#1a1210" rotation={[0.55, 0, 0]} />
        )}
      </group>
    </group>
  )
}

/**
 * Chalán sentado a caballo: sombrero claro, chaqueta oscura, jeans y botas, manos en las riendas.
 * (Se arma sobre el sistema del caballo: el origen es el centro de la silla.)
 */
function Chalan({ look }: { look: RiderLook }) {
  const jeans = look.jeans ?? '#3a5f8f'
  const SKIN = '#c98a5e'
  return (
    <group position={[0, 1.02, -0.06]}>
      {/* Torso y chaqueta */}
      <P size={[0.3, 0.4, 0.2]} position={[0, 0.24, 0]} color={look.jacket} />
      <P size={[0.32, 0.06, 0.22]} position={[0, 0.04, 0]} color={look.jacket} />
      {/* Cabeza, sombrero y cuello */}
      <mesh position={[0, 0.54, 0.01]} castShadow>
        <icosahedronGeometry args={[0.095, 1]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} flatShading />
      </mesh>
      <P size={[0.1, 0.05, 0.1]} position={[0, 0.46, 0]} color={SKIN} />
      <mesh position={[0, 0.62, 0.02]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 14]} />
        <meshStandardMaterial color={look.hat} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.68, 0.0]} castShadow>
        <cylinderGeometry args={[0.085, 0.105, 0.12, 10]} />
        <meshStandardMaterial color={look.hat} roughness={0.9} flatShading />
      </mesh>
      <P size={[0.03, 0.025, 0.2]} position={[0, 0.745, 0]} color={look.hat} />
      <mesh position={[0, 0.645, 0]}>
        <cylinderGeometry args={[0.108, 0.108, 0.03, 10]} />
        <meshStandardMaterial color="#2a1c14" roughness={0.8} flatShading />
      </mesh>

      {/* Brazos hacia las riendas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.18, 0.4, 0]} rotation={[-0.75, 0, s * 0.12]}>
          <P size={[0.075, 0.24, 0.075]} position={[0, -0.12, 0]} color={look.jacket} />
          <group position={[0, -0.24, 0]} rotation={[-0.7, 0, 0]}>
            <P size={[0.07, 0.22, 0.07]} position={[0, -0.11, 0]} color={look.jacket} />
            <P size={[0.07, 0.07, 0.07]} position={[0, -0.25, 0]} color={SKIN} />
          </group>
        </group>
      ))}

      {/* Piernas: jean sobre la silla, bota en el estribo */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.13, 0.02, 0.02]} rotation={[-0.35, 0, s * 0.35]}>
          <P size={[0.13, 0.36, 0.15]} position={[0, -0.17, 0]} color={jeans} />
          <group position={[0, -0.34, 0]} rotation={[0.6, 0, 0]}>
            <P size={[0.11, 0.34, 0.12]} position={[0, -0.16, 0.0]} color={jeans} />
            <P size={[0.115, 0.1, 0.2]} position={[0, -0.36, 0.04]} color="#1a1512" rough={0.5} />
          </group>
        </group>
      ))}
    </group>
  )
}
