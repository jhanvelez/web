import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeLabelTexture } from '../../lib/labelTexture'
import { getTileTexture } from './ColombianHouse'
import { Instanced, type InstanceItem } from './Instanced'

type V3 = [number, number, number]

function Box({ size, position, color, rotation }: { size: V3; position: V3; color: string; rotation?: V3 }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading />
    </mesh>
  )
}

/** Vaho que sube de una taza. */
function Steam({ position }: { position: V3 }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const phase = useMemo(() => Math.random() * 3, [])
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.4 + phase + i / 3) % 1
      m.position.set(Math.sin(t * 6 + i) * 0.03, t * 0.4, 0)
      m.scale.setScalar(0.025 + t * 0.045)
      ;(m.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.55
    })
  })
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Cup({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.065, 0.05, 0.08, 10]} />
        <meshStandardMaterial color="#f7f2e8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.01, 10]} />
        <meshStandardMaterial color="#3b2010" roughness={0.3} />
      </mesh>
      <Steam position={[0, 0.06, 0]} />
    </group>
  )
}

function Table({ position, stools }: { position: V3; stools: string[] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 14]} />
        <meshStandardMaterial color="#6e7f88" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.72, 8]} />
        <meshStandardMaterial color="#34444f" roughness={0.9} flatShading />
      </mesh>
      <Cup position={[-0.15, 0.79, 0.05]} />
      <Cup position={[0.18, 0.79, -0.1]} />
      {/* Silletas de colores */}
      {stools.map((c, i) => {
        const a = (i / stools.length) * Math.PI * 2 + 0.6
        return (
          <mesh key={i} position={[Math.cos(a) * 0.85, 0.24, Math.sin(a) * 0.85]} castShadow>
            <cylinderGeometry args={[0.2, 0.17, 0.48, 9]} />
            <meshStandardMaterial color={c} roughness={0.8} flatShading />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Rincón del café: ramada de teja con mostrador y cafetera, mesas con silletas y tazas humeantes,
 * luces de bombillo, banderines tricolor y un tablero de "tinto". Frente = +Z.
 */
export function CoffeeCorner() {
  const tiles = getTileTexture()
  const board = useMemo(
    () => makeLabelTexture([{ text: 'TINTO', size: 70 }, { text: 'recién colado', size: 34 }, { text: '$ 2.000', size: 40 }], '#243C4C', '#F4FCFB', 256, 256),
    [],
  )

  // Banderines: catenaria entre los dos postes delanteros.
  const bunting = useMemo<InstanceItem[]>(() => {
    const colors = ['#F4FCFB', '#5289AD', '#ACBCBF']
    return Array.from({ length: 13 }, (_, i) => {
      const t = i / 12
      const x = -2.2 + t * 4.4
      return {
        position: [x, 2.05 - Math.sin(t * Math.PI) * 0.22, 0.75] as V3,
        rotation: [Math.PI, 0, 0] as V3,
        scale: 1,
        color: colors[i % 3],
      }
    })
  }, [])
  const bulbs = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      const t = i / 8
      return [-2.0 + t * 4.0, 2.0 - Math.sin(t * Math.PI) * 0.18 - 0.28, -0.5] as V3
    }),
    [],
  )

  const posts: V3[] = [[-2.1, 1.1, -2.2], [2.1, 1.1, -2.2], [-2.1, 1.1, 0.75], [2.1, 1.1, 0.75]]
  const ridgeY = 2.88
  const angle = Math.atan2(0.62, 1.7)
  const len = Math.hypot(1.7, 0.62)

  return (
    <group>
      {/* Estructura */}
      {posts.map((p, i) => (
        <Box key={i} size={[0.14, 2.2, 0.14]} position={p} color="#34444f" />
      ))}
      <Box size={[4.4, 0.12, 0.12]} position={[0, 2.2, 0.75]} color="#3c4c56" />
      <Box size={[4.4, 0.12, 0.12]} position={[0, 2.2, -2.2]} color="#3c4c56" />
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 2.55, -0.725 + s * 0.85]} rotation={[s * angle, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.9, 0.09, len + 0.1]} />
          <meshStandardMaterial map={tiles} roughness={0.85} flatShading />
        </mesh>
      ))}
      <Box size={[4.95, 0.1, 0.22]} position={[0, ridgeY - 0.02, -0.725]} color="#243C4C" />

      {/* Mostrador con cafetera */}
      <Box size={[3.4, 0.9, 0.55]} position={[0, 0.45, -1.95]} color="#5d6d76" />
      <Box size={[3.6, 0.07, 0.7]} position={[0, 0.93, -1.95]} color="#8fa0a8" />
      <mesh position={[-0.9, 1.25, -1.95]} castShadow>
        <cylinderGeometry args={[0.2, 0.26, 0.55, 12]} />
        <meshStandardMaterial color="#cfd3d6" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[-0.9, 1.58, -1.95]}>
        <coneGeometry args={[0.22, 0.14, 12]} />
        <meshStandardMaterial color="#b8472f" roughness={0.6} />
      </mesh>
      <Steam position={[-0.9, 1.7, -1.95]} />
      {[-0.2, 0.15, 0.5, 0.85].map((x) => (
        <Cup key={x} position={[x, 1.0, -1.95]} />
      ))}
      {/* Estante con costales */}
      <Box size={[0.9, 0.06, 0.4]} position={[1.1, 1.6, -2.1]} color="#3c4c56" />
      {[0.8, 1.4].map((x) => (
        <mesh key={x} position={[x, 1.25, -2.1]} scale={[0.17, 0.17, 0.15]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#c9a66b" roughness={1} flatShading />
        </mesh>
      ))}

      {/* Mesas y silletas al frente */}
      <Table position={[-1.2, 0, 1.6]} stools={['#5289AD', '#ACBCBF', '#243C4C']} />
      <Table position={[1.5, 0, 1.9]} stools={['#698696', '#5289AD', '#ACBCBF']} />

      {/* Luces y banderines */}
      <Instanced items={bunting} castShadow={false}>
        <coneGeometry args={[0.13, 0.28, 3]} />
        <meshStandardMaterial roughness={0.8} flatShading side={THREE.DoubleSide} />
      </Instanced>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#fff2c2" emissive="#ffc95e" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}

      {/* Tablero de tinto */}
      <group position={[3.0, 0, 0.3]} rotation={[0, -0.5, 0]}>
        <Box size={[0.07, 0.9, 0.07]} position={[-0.32, 0.45, 0]} color="#34444f" />
        <Box size={[0.07, 0.9, 0.07]} position={[0.32, 0.45, 0]} color="#34444f" />
        <Box size={[0.8, 0.8, 0.06]} position={[0, 0.85, 0]} color="#5d6d76" />
        <mesh position={[0, 0.85, 0.035]}>
          <planeGeometry args={[0.68, 0.68]} />
          <meshBasicMaterial map={board} />
        </mesh>
      </group>
    </group>
  )
}
