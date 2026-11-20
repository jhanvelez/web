import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Instanced, type InstanceItem } from './Instanced'

const W = 4.4 // ancho (x)
const D = 3.0 // fondo (z)
const FLOOR1 = 1.5
const FLOOR2 = 1.4
const WALL_TOP = FLOOR1 + FLOOR2 // 2.9
const SLOPE = 0.45
const RIDGE_Y = WALL_TOP + SLOPE * (D / 2)
const EAVE_Z = D / 2 + 0.9
const EAVE_Y = RIDGE_Y - SLOPE * EAVE_Z
const ROOF_RUN = EAVE_Z
const ROOF_LEN = Math.hypot(ROOF_RUN, RIDGE_Y - EAVE_Y)
const ROOF_ANGLE = Math.atan2(RIDGE_Y - EAVE_Y, ROOF_RUN)

const C = {
  wall: '#fbf6ea',
  socle: '#1f5fa8',
  door: '#c0392b',
  wood: '#8a5a33',
  woodDark: '#6b4423',
  frame: '#2f6fb8',
  glass: '#7fa6b8',
  shutter: '#2f8f5b',
  stone: '#b9ad98',
}

/** Textura de tejas de barro cocido, generada en canvas (sin archivos externos). */
function useTileTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#b4532f'
    g.fillRect(0, 0, 128, 128)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * 16 + (row % 2) * 8
        const y = row * 16
        g.fillStyle = `hsl(${14 + ((row * 7 + col * 13) % 9)}, 58%, ${40 + ((row * 5 + col * 11) % 10)}%)`
        g.beginPath()
        g.roundRect(x + 1, y + 1, 14, 14, [2, 2, 7, 7])
        g.fill()
      }
    }
    g.strokeStyle = 'rgba(60,20,10,0.35)'
    g.lineWidth = 1.5
    for (let row = 1; row <= 8; row++) {
      g.beginPath()
      g.moveTo(0, row * 16)
      g.lineTo(128, row * 16)
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(5, 2.6)
    t.anisotropy = 4
    return t
  }, [])
}

function useGableGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-D / 2, 0)
    s.lineTo(D / 2, 0)
    s.lineTo(0, RIDGE_Y - WALL_TOP)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: W - 0.02, bevelEnabled: false })
  }, [])
}

function Box({ size, position, color, rotation }: { size: [number, number, number]; position: [number, number, number]; color: string; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} flatShading />
    </mesh>
  )
}

function Window({ x, y, z, shutters = false }: { x: number; y: number; z: number; shutters?: boolean }) {
  return (
    <group position={[x, y, z]}>
      <Box size={[0.78, 0.68, 0.06]} position={[0, 0, 0]} color={C.frame} />
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color={C.glass} roughness={0.2} metalness={0.2} />
      </mesh>
      <Box size={[0.04, 0.5, 0.03]} position={[0, 0, 0.05]} color={C.frame} />
      <Box size={[0.6, 0.04, 0.03]} position={[0, 0, 0.05]} color={C.frame} />
      <Box size={[0.9, 0.05, 0.14]} position={[0, -0.38, 0.05]} color={C.wood} />
      {shutters && (
        <>
          <Box size={[0.3, 0.68, 0.04]} position={[-0.56, 0, 0.04]} color={C.shutter} />
          <Box size={[0.3, 0.68, 0.04]} position={[0.56, 0, 0.04]} color={C.shutter} />
        </>
      )}
    </group>
  )
}

function Flower({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow>
      <icosahedronGeometry args={[0.065, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={0.7} />
    </mesh>
  )
}

/** Humo del fogón: esferas que suben y se desvanecen. */
function Smoke({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.25 + i / 5) % 1
      m.position.set(Math.sin(t * 4 + i) * 0.12 + t * 0.35, t * 1.7, Math.cos(t * 3 + i) * 0.08)
      m.scale.setScalar(0.1 + t * 0.32)
      ;(m.material as THREE.MeshStandardMaterial).opacity = (1 - t) * 0.5
    })
  })
  return (
    <group position={position}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#f2eee6" transparent depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** Casa campesina colombiana: zócalo azul, puerta roja, balcón de madera, teja de barro y flores. */
export function ColombianHouse() {
  const tiles = useTileTexture()
  const gable = useGableGeometry()

  const balusters = useMemo<InstanceItem[]>(() => {
    const items: InstanceItem[] = []
    const zf = D / 2 + 0.95
    for (let x = -2.2; x <= 2.21; x += 0.22) items.push({ position: [x, 1.9, zf], scale: [0.04, 0.62, 0.04] })
    for (const sx of [-2.3, 2.3])
      for (let z = D / 2 + 0.1; z < zf; z += 0.2) items.push({ position: [sx, 1.9, z], scale: [0.04, 0.62, 0.04] })
    return items
  }, [])

  const garden = useMemo(() => {
    const colors = ['#e5483f', '#f6c445', '#f08ac0', '#e87b2c', '#ffffff']
    const out: { p: [number, number, number]; c: string }[] = []
    for (let i = 0; i < 9; i++) {
      out.push({ p: [-2.6 - (i % 3) * 0.2, 0.12 + (i % 2) * 0.05, -0.9 + i * 0.28], c: colors[i % 5] })
      out.push({ p: [2.6 + (i % 3) * 0.2, 0.12 + (i % 2) * 0.05, -0.9 + i * 0.28], c: colors[(i + 2) % 5] })
    }
    return out
  }, [])

  return (
    <group scale={1.3}>
      {/* Cimiento y paredes */}
      <Box size={[W + 0.2, 0.12, D + 0.2]} position={[0, 0.02, 0]} color="#8d8577" />
      <Box size={[W, FLOOR1, D]} position={[0, FLOOR1 / 2, 0]} color={C.wall} />
      <Box size={[W + 0.05, 0.45, D + 0.05]} position={[0, 0.3, 0]} color={C.socle} />
      <Box size={[W, FLOOR2, D]} position={[0, FLOOR1 + FLOOR2 / 2, 0]} color={C.wall} />
      <Box size={[W + 0.1, 0.1, D + 0.1]} position={[0, FLOOR1, 0]} color={C.woodDark} />

      {/* Frontones triangulares */}
      <mesh geometry={gable} position={[-(W - 0.02) / 2, WALL_TOP, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.wall} roughness={0.9} flatShading />
      </mesh>

      {/* Techo de teja de barro */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, (RIDGE_Y + EAVE_Y) / 2 + 0.05, (s * ROOF_RUN) / 2]} rotation={[s * ROOF_ANGLE, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + 0.9, 0.1, ROOF_LEN + 0.05]} />
          <meshStandardMaterial map={tiles} roughness={0.85} flatShading />
        </mesh>
      ))}
      <Box size={[W + 0.95, 0.12, 0.26]} position={[0, RIDGE_Y + 0.1, 0]} color="#8f3a22" />

      {/* Chimenea y humo */}
      <Box size={[0.4, 1.0, 0.4]} position={[1.4, RIDGE_Y - 0.1, -0.5]} color="#e9dfcb" />
      <Box size={[0.5, 0.08, 0.5]} position={[1.4, RIDGE_Y + 0.42, -0.5]} color="#8f3a22" />
      <Smoke position={[1.4, RIDGE_Y + 0.5, -0.5]} />

      {/* Puerta principal y ventanas (planta baja) */}
      <Box size={[0.95, 1.25, 0.08]} position={[0, 0.7, D / 2 + 0.02]} color={C.wood} />
      <Box size={[0.8, 1.15, 0.1]} position={[0, 0.65, D / 2 + 0.04]} color={C.door} />
      <mesh position={[0, 1.0, D / 2 + 0.1]}>
        <boxGeometry args={[0.4, 0.3, 0.02]} />
        <meshStandardMaterial color={C.glass} roughness={0.2} />
      </mesh>
      <mesh position={[0.28, 0.62, D / 2 + 0.11]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#e8c35a" metalness={0.6} roughness={0.3} />
      </mesh>
      <Window x={-1.4} y={0.95} z={D / 2 + 0.02} />
      <Window x={1.4} y={0.95} z={D / 2 + 0.02} />

      {/* Planta alta: puerta al balcón y ventanas con postigos */}
      <Box size={[1.0, 1.15, 0.08]} position={[0, 2.18, D / 2 + 0.02]} color={C.frame} />
      <Box size={[0.4, 1.0, 0.04]} position={[-0.23, 2.18, D / 2 + 0.07]} color={C.door} />
      <Box size={[0.4, 1.0, 0.04]} position={[0.23, 2.18, D / 2 + 0.07]} color={C.door} />
      <Window x={-1.5} y={2.2} z={D / 2 + 0.02} shutters />
      <Window x={1.5} y={2.2} z={D / 2 + 0.02} shutters />
      {/* Ventanas laterales */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 + 0.02), 0.95, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
          <Window x={0} y={0} z={0} />
          <Window x={0} y={1.25} z={0} shutters />
        </group>
      ))}

      {/* Balcón de madera */}
      <Box size={[W + 0.4, 0.1, 1.05]} position={[0, FLOOR1 + 0.1, D / 2 + 0.5]} color={C.wood} />
      <Box size={[W + 0.4, 0.07, 0.09]} position={[0, 2.23, D / 2 + 0.95]} color={C.woodDark} />
      {[-2.3, 2.3].map((x) => (
        <Box key={x} size={[0.09, 0.07, 0.95]} position={[x, 2.23, D / 2 + 0.52]} color={C.woodDark} />
      ))}
      <Instanced items={balusters}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={C.wood} roughness={0.9} flatShading />
      </Instanced>
      {[-2.1, -0.7, 0.7, 2.1].map((x) => (
        <Box key={x} size={[0.13, 1.6, 0.13]} position={[x, 0.78, D / 2 + 0.95]} color={C.woodDark} />
      ))}
      {/* Macetas colgantes del balcón */}
      {[-1.8, -1.0, -0.2, 0.6, 1.4, 2.0].map((x, i) => (
        <group key={x} position={[x, 2.3, D / 2 + 1.03]}>
          <Box size={[0.26, 0.16, 0.16]} position={[0, 0, 0]} color="#b35a38" />
          <Flower position={[-0.05, 0.16, 0]} color={['#e5483f', '#f08ac0', '#f6c445'][i % 3]} />
          <Flower position={[0.07, 0.2, 0.02]} color={['#f08ac0', '#e5483f', '#ffffff'][i % 3]} />
        </group>
      ))}

      {/* Banca bajo el corredor */}
      <Box size={[1.2, 0.08, 0.32]} position={[-1.4, 0.42, D / 2 + 0.55]} color={C.wood} />
      <Box size={[0.08, 0.4, 0.28]} position={[-1.9, 0.2, D / 2 + 0.55]} color={C.woodDark} />
      <Box size={[0.08, 0.4, 0.28]} position={[-0.9, 0.2, D / 2 + 0.55]} color={C.woodDark} />

      {/* Jardín */}
      {garden.map((f, i) => (
        <Flower key={i} position={f.p} color={f.c} />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.9, 0.12, 2.8]} position={[s * 2.9, 0.06, 0.2]} color="#6b4a2e" />
      ))}
    </group>
  )
}
