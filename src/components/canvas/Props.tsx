import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeLabelTexture } from '../../lib/labelTexture'
import { createRng } from '../../lib/random'
import { PROFILE } from '../../data/profile'
import { Instanced, type InstanceItem } from './Instanced'

type V3 = [number, number, number]

function Box({ size, position, color, rotation, rough = 0.85 }: { size: V3; position: V3; color: string; rotation?: V3; rough?: number }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} flatShading />
    </mesh>
  )
}

function Cyl({ r, h, position, color, rotation, seg = 10 }: { r: number; h: number; position: V3; color: string; rotation?: V3; seg?: number }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={color} roughness={0.8} flatShading />
    </mesh>
  )
}

/* ───────────── Jeep Willys ───────────── */

const JEEP_BASE = { body: '#1f9a8a', trim: '#f2e8cf', dark: '#2a2a2a', chrome: '#cfd3d6' }

export interface JeepRig {
  /** Ángulo de giro de las ruedas (rad). */
  roll: number
  /** Rebote vertical de cada rueda: [del. der., del. izq., tras. der., tras. izq.]. */
  bounce: [number, number, number, number]
  /** Giro del volante (rad, + = izquierda): gira las llantas delanteras. */
  steer: number
}
const STATIC_RIG: JeepRig = { roll: 0, bounce: [0, 0, 0, 0], steer: 0 }

function Wheel({ position, index, rig }: { position: V3; index: number; rig: JeepRig }) {
  const outer = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  useFrame(() => {
    if (outer.current) {
      outer.current.position.y = position[1] + rig.bounce[index]
      outer.current.rotation.y = index < 2 ? rig.steer : 0
    }
    if (spin.current) spin.current.rotation.y = -rig.roll
  })
  return (
    <group ref={outer} position={position}>
     <group rotation={[0, 0, Math.PI / 2]}>
      <group ref={spin}>
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 14]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.95} flatShading />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 10]} />
          <meshStandardMaterial color={JEEP_BASE.trim} roughness={0.5} flatShading />
        </mesh>
        {/* Tacos del neumático: se nota que gira */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]} position={[Math.sin((i / 8) * Math.PI * 2) * 0.2, 0, Math.cos((i / 8) * Math.PI * 2) * 0.2]}>
            <boxGeometry args={[0.05, 0.17, 0.05]} />
            <meshStandardMaterial color="#111" roughness={1} flatShading />
          </mesh>
        ))}
      </group>
     </group>
    </group>
  )
}

/** Willys clásico estilo "yipao" cafetero, con carga de café en el techo. Frente hacia +Z. */
export function JeepWillys({ rig = STATIC_RIG, body = JEEP_BASE.body }: { rig?: JeepRig; body?: string }) {
  const JEEP = { ...JEEP_BASE, body }
  return (
    <group>
      <Box size={[0.8, 0.1, 1.75]} position={[0, 0.3, 0]} color={JEEP.dark} />
      {/* Capó y cabina */}
      <Box size={[0.7, 0.3, 0.58]} position={[0, 0.5, 0.58]} color={JEEP.body} />
      <Box size={[0.78, 0.34, 0.9]} position={[0, 0.52, -0.3]} color={JEEP.body} />
      <Box size={[0.8, 0.05, 0.92]} position={[0, 0.36, -0.3]} color={JEEP.trim} />
      {/* Franja decorativa */}
      <Box size={[0.805, 0.05, 1.5]} position={[0, 0.52, 0.05]} color="#e8453c" />
      {/* Guardabarros */}
      {[-0.4, 0.4].map((x) => (
        <Box key={x} size={[0.16, 0.05, 0.5]} position={[x, 0.46, 0.62]} color={JEEP.body} />
      ))}
      {/* Parrilla */}
      <Box size={[0.62, 0.28, 0.04]} position={[0, 0.5, 0.89]} color={JEEP.dark} />
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
        <Box key={x} size={[0.04, 0.24, 0.03]} position={[x, 0.5, 0.915]} color={JEEP.chrome} />
      ))}
      {/* Faros */}
      {[-0.27, 0.27].map((x) => (
        <mesh key={x} position={[x, 0.6, 0.9]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color="#fff2c2" emissive="#ffd678" emissiveIntensity={0.9} />
        </mesh>
      ))}
      <Box size={[0.84, 0.07, 0.07]} position={[0, 0.32, 0.93]} color={JEEP.chrome} />
      <Box size={[0.84, 0.07, 0.07]} position={[0, 0.32, -0.9]} color={JEEP.chrome} />
      {/* Parabrisas */}
      <Box size={[0.7, 0.28, 0.025]} position={[0, 0.84, 0.17]} color="#9ccad0" rough={0.2} />
      {[-0.35, 0.35].map((x) => (
        <Box key={x} size={[0.04, 0.3, 0.04]} position={[x, 0.84, 0.17]} color={JEEP.dark} />
      ))}
      {/* Asientos */}
      <Box size={[0.6, 0.1, 0.28]} position={[0, 0.74, -0.1]} color="#8a3b2a" />
      <Box size={[0.6, 0.28, 0.07]} position={[0, 0.88, -0.28]} color="#8a3b2a" />
      {/* Barras antivuelco y parrilla de techo */}
      {[-0.36, 0.36].map((x) => (
        <Box key={x} size={[0.04, 0.5, 0.04]} position={[x, 1.0, -0.62]} color={JEEP.dark} />
      ))}
      <Box size={[0.8, 0.04, 0.04]} position={[0, 1.24, -0.62]} color={JEEP.dark} />
      <Box size={[0.76, 0.04, 0.9]} position={[0, 1.26, -0.2]} color={JEEP.dark} />
      {/* Carga: costales de café */}
      {[-0.17, 0.17].map((x, i) => (
        <mesh key={x} position={[x, 1.42, -0.2 + i * 0.1]} scale={[0.2, 0.17, 0.3]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#c9a66b" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.4, -0.5]} scale={[0.18, 0.14, 0.2]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#b8955a" roughness={1} flatShading />
      </mesh>
      {/* Llanta de repuesto */}
      <group position={[0, 0.6, -0.98]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 14]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.02, 10]} />
          <meshStandardMaterial color={JEEP.body} flatShading />
        </mesh>
      </group>
      <Wheel position={[0.42, 0.2, 0.62]} index={0} rig={rig} />
      <Wheel position={[-0.42, 0.2, 0.62]} index={1} rig={rig} />
      <Wheel position={[0.42, 0.2, -0.5]} index={2} rig={rig} />
      <Wheel position={[-0.42, 0.2, -0.5]} index={3} rig={rig} />
    </group>
  )
}

/* ───────────── Letrero de finca ───────────── */

export function FincaSign() {
  const tex = useMemo(
    () =>
      makeLabelTexture(
        [
          { text: 'FINCA', size: 44 },
          { text: PROFILE.name, size: 62 },
          { text: 'Café · Código · Cultura', size: 30 },
        ],
        null,
        '#fbe9c2',
        512,
        256,
      ),
    [],
  )
  const gh = useMemo(() => makeLabelTexture([{ text: 'GitHub →', size: 62 }], null, '#2a1608', 256, 96), [])
  return (
    <group>
      {[-0.82, 0.82].map((x) => (
        <Box key={x} size={[0.12, 1.5, 0.12]} position={[x, 0.65, 0]} color="#5c3a21" />
      ))}
      <Box size={[1.9, 0.95, 0.09]} position={[0, 1.25, 0]} color="#8a5a33" />
      <Box size={[2.0, 0.07, 0.12]} position={[0, 1.76, 0]} color="#5c3a21" />
      <Box size={[2.0, 0.07, 0.12]} position={[0, 0.74, 0]} color="#5c3a21" />
      <mesh position={[0, 1.25, 0.05]}>
        <planeGeometry args={[1.8, 0.9]} />
        <meshStandardMaterial map={tex} transparent roughness={0.8} />
      </mesh>
      {/* Tablita colgante */}
      <Box size={[0.8, 0.3, 0.06]} position={[0, 0.5, 0.02]} color="#a06b3c" />
      <mesh position={[0, 0.5, 0.055]}>
        <planeGeometry args={[0.7, 0.24]} />
        <meshBasicMaterial map={gh} transparent />
      </mesh>
      {/* Farol de cuerda */}
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} position={[x, 1.62, 0.06]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#ffd678" emissive="#ffb347" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────────── Costal de café ───────────── */

export function CoffeeSack() {
  const label = useMemo(
    () => makeLabelTexture([{ text: 'CAFÉ', size: 78 }, { text: 'de Colombia', size: 34 }], null, '#5a2d14', 256, 220),
    [],
  )
  const beans = useMemo<InstanceItem[]>(() => {
    const rng = createRng(11)
    return Array.from({ length: 36 }, () => {
      const a = rng.range(0, Math.PI * 2)
      const r = Math.sqrt(rng.next()) * 0.45
      return {
        position: [0.55 + Math.cos(a) * r, 0.025, 0.2 + Math.sin(a) * r] as V3,
        rotation: [rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)] as V3,
        scale: [0.035, 0.022, 0.025] as V3,
        color: rng.pick(['#4a2a14', '#5c3319', '#3b2010']),
      }
    })
  }, [])

  const Sack = ({ position, rot = 0, color = '#cfae72', showLabel = false }: { position: V3; rot?: number; color?: string; showLabel?: boolean }) => (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.3, 0]} scale={[0.3, 0.34, 0.24]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <coneGeometry args={[0.13, 0.14, 7]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <torusGeometry args={[0.1, 0.018, 5, 10]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
      </mesh>
      {showLabel && (
        <mesh position={[0, 0.33, 0.235]}>
          <planeGeometry args={[0.38, 0.33]} />
          <meshBasicMaterial map={label} transparent />
        </mesh>
      )}
    </group>
  )

  return (
    <group>
      <Box size={[1.5, 0.07, 1.0]} position={[0, 0.035, 0]} color="#8a5a33" />
      <Sack position={[-0.35, 0.07, 0.1]} showLabel />
      <Sack position={[0.12, 0.07, -0.15]} rot={0.6} color="#c4a265" />
      <Sack position={[-0.1, 0.52, -0.05]} rot={-0.4} color="#d3b57e" />
      {/* Café derramado */}
      <Instanced items={beans} castShadow={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={0.6} />
      </Instanced>
      {/* Canasto */}
      <mesh position={[0.55, 0.12, 0.2]}>
        <cylinderGeometry args={[0.22, 0.17, 0.22, 10, 1, true]} />
        <meshStandardMaterial color="#b88a4a" side={THREE.DoubleSide} flatShading roughness={1} />
      </mesh>
    </group>
  )
}

/* ───────────── Mirador ───────────── */

function Flag() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 2.2) * 0.22
  })
  return (
    <group position={[0, 2.5, 0]}>
      <Cyl r={0.025} h={1.4} position={[0, 0, 0]} color="#d8d2c4" seg={6} />
      <group ref={ref} position={[0, 0.45, 0]}>
        <Box size={[0.62, 0.12, 0.015]} position={[0.33, 0.06, 0]} color="#fcd116" />
        <Box size={[0.62, 0.06, 0.015]} position={[0.33, -0.03, 0]} color="#003893" />
        <Box size={[0.62, 0.06, 0.015]} position={[0.33, -0.09, 0]} color="#ce1126" />
      </group>
    </group>
  )
}

/** Mirador de madera con techo de teja, telescopio y bandera de Colombia. */
export function Viewpoint() {
  const rails = useMemo<InstanceItem[]>(() => {
    const out: InstanceItem[] = []
    for (let i = -0.9; i <= 0.91; i += 0.3) {
      out.push({ position: [i, 0.98, 0.95], scale: [0.035, 0.45, 0.035] })
      out.push({ position: [i, 0.98, -0.95], scale: [0.035, 0.45, 0.035] })
      out.push({ position: [0.95, 0.98, i], scale: [0.035, 0.45, 0.035] })
      out.push({ position: [-0.95, 0.98, i], scale: [0.035, 0.45, 0.035] })
    }
    return out
  }, [])
  return (
    <group>
      {/* Pilotes largos que bajan hasta la ladera */}
      {[-0.9, 0.9].flatMap((x) => [-0.9, 0.9].map((z) => (
        <Box key={`${x}${z}`} size={[0.14, 2.6, 0.14]} position={[x, 0.2, z]} color="#5c3a21" />
      )))}
      <Box size={[2.1, 0.1, 2.1]} position={[0, 0.74, 0]} color="#9a6a3a" />
      {[-0.6, 0, 0.6].map((x) => (
        <Box key={x} size={[0.02, 0.012, 2.1]} position={[x * 1.0 + 0.3, 0.8, 0]} color="#6b4423" />
      ))}
      {/* Baranda */}
      {[0.95, -0.95].map((z) => (
        <Box key={z} size={[2.0, 0.06, 0.06]} position={[0, 1.22, z]} color="#5c3a21" />
      ))}
      {[0.95, -0.95].map((x) => (
        <Box key={x} size={[0.06, 0.06, 2.0]} position={[x, 1.22, 0]} color="#5c3a21" />
      ))}
      <Instanced items={rails}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8a5a33" roughness={0.9} flatShading />
      </Instanced>
      {/* Techo de teja sobre el mirador (parte trasera) */}
      {[-0.9, 0.9].map((x) => (
        <Box key={x} size={[0.1, 1.5, 0.1]} position={[x, 1.55, -0.9]} color="#5c3a21" />
      ))}
      <mesh position={[0, 2.45, -0.5]} rotation={[0.28, 0, 0]} castShadow>
        <boxGeometry args={[2.3, 0.08, 1.7]} />
        <meshStandardMaterial color="#b4532f" roughness={0.85} flatShading />
      </mesh>
      {/* Telescopio */}
      <group position={[0.45, 0.8, 0.4]}>
        {[0, 2.1, 4.2].map((a) => (
          <Box key={a} size={[0.03, 0.55, 0.03]} position={[Math.cos(a) * 0.1, 0.27, Math.sin(a) * 0.1]} rotation={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]} color="#2a2a2a" />
        ))}
        <Cyl r={0.05} h={0.5} position={[0, 0.65, 0]} color="#c9a227" rotation={[0, 0, 1.0]} />
      </group>
      <Flag />
    </group>
  )
}
