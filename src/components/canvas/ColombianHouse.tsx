import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Instanced, type InstanceItem } from './Instanced'

const W = 4.4 // ancho (x)
const D = 3.0 // fondo (z)
const FLOOR1 = 1.5
const FLOOR2 = 1.4

interface Palette {
  wall: string
  socle: string
  door: string
  frame: string
  /** Baranda y balaustres del balcón. */
  balcony: string
  shutter: string
}

/** Paletas inspiradas en los pueblos cafeteros: verde, azul/rojo, rojo/verde, amarillo y el clásico azul. */
export const PALETTES: readonly Palette[] = [
  { wall: '#F4FCFB', socle: '#5289AD', door: '#243C4C', frame: '#5289AD', balcony: '#243C4C', shutter: '#698696' },
  { wall: '#F4FCFB', socle: '#243C4C', door: '#5289AD', frame: '#243C4C', balcony: '#698696', shutter: '#5289AD' },
  { wall: '#F4FCFB', socle: '#698696', door: '#243C4C', frame: '#ACBCBF', balcony: '#5289AD', shutter: '#243C4C' },
]

const WOOD = '#5d6d76'
const WOOD_DARK = '#34444f'
const GLASS = '#7fa6b8'

function dims(floors: 1 | 2) {
  const wallTop = FLOOR1 + (floors === 2 ? FLOOR2 : 0)
  const slope = floors === 2 ? 0.45 : 0.5
  const overhang = floors === 2 ? 0.9 : 0.55
  const ridge = wallTop + slope * (D / 2)
  const eaveZ = D / 2 + overhang
  const eaveY = ridge - slope * eaveZ
  return {
    wallTop,
    ridge,
    eaveZ,
    eaveY,
    len: Math.hypot(eaveZ, ridge - eaveY),
    angle: Math.atan2(ridge - eaveY, eaveZ),
  }
}

let tileTex: THREE.CanvasTexture | null = null
/** Textura de teja de barro cocido (canvas), compartida por todas las casas. */
export function getTileTexture() {
  if (tileTex) return tileTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#698696'
  g.fillRect(0, 0, 128, 128)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      g.fillStyle = `hsl(${200 + ((row * 7 + col * 13) % 9)}, 14%, ${36 + ((row * 5 + col * 11) % 10)}%)`
      g.beginPath()
      g.roundRect(col * 16 + (row % 2) * 8 + 1, row * 16 + 1, 14, 14, [2, 2, 7, 7])
      g.fill()
    }
  }
  g.strokeStyle = 'rgba(20,36,46,0.4)'
  g.lineWidth = 1.5
  for (let row = 1; row <= 8; row++) {
    g.beginPath()
    g.moveTo(0, row * 16)
    g.lineTo(128, row * 16)
    g.stroke()
  }
  tileTex = new THREE.CanvasTexture(c)
  tileTex.colorSpace = THREE.SRGBColorSpace
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping
  tileTex.repeat.set(5, 2.6)
  tileTex.anisotropy = 4
  return tileTex
}

const gableCache = new Map<number, THREE.ExtrudeGeometry>()
function getGable(floors: 1 | 2) {
  let g = gableCache.get(floors)
  if (!g) {
    const d = dims(floors)
    const s = new THREE.Shape()
    s.moveTo(-D / 2, 0)
    s.lineTo(D / 2, 0)
    s.lineTo(0, d.ridge - d.wallTop)
    s.closePath()
    g = new THREE.ExtrudeGeometry(s, { depth: W - 0.02, bevelEnabled: false })
    gableCache.set(floors, g)
  }
  return g
}

type V3 = [number, number, number]

function Box({ size, position, color }: { size: V3; position: V3; color: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} flatShading />
    </mesh>
  )
}

function Window({ x, y, z, frame, shutter }: { x: number; y: number; z: number; frame: string; shutter?: string }) {
  return (
    <group position={[x, y, z]}>
      <Box size={[0.78, 0.68, 0.06]} position={[0, 0, 0]} color={frame} />
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.2} />
      </mesh>
      <Box size={[0.04, 0.5, 0.03]} position={[0, 0, 0.05]} color={frame} />
      <Box size={[0.6, 0.04, 0.03]} position={[0, 0, 0.05]} color={frame} />
      <Box size={[0.9, 0.05, 0.14]} position={[0, -0.38, 0.05]} color={WOOD} />
      {shutter && (
        <>
          <Box size={[0.3, 0.68, 0.04]} position={[-0.56, 0, 0.04]} color={shutter} />
          <Box size={[0.3, 0.68, 0.04]} position={[0.56, 0, 0.04]} color={shutter} />
        </>
      )}
    </group>
  )
}

function Flower({ position, color }: { position: V3; color: string }) {
  return (
    <mesh position={position} castShadow>
      <icosahedronGeometry args={[0.065, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={0.7} />
    </mesh>
  )
}

/** Humo del fogón: esferas que suben y se desvanecen. */
function Smoke({ position }: { position: V3 }) {
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

interface Props {
  palette?: number
  floors?: 1 | 2
  /** 'lite' omite flores, macetas, balaustres, banca y humo (para las casas de relleno). */
  detail?: 'full' | 'lite'
  scale?: number
}

/**
 * Casa colonial cafetera: paredes blancas, zócalo y puertas de colores, balcón de madera,
 * teja de barro. Una o dos plantas; el frente es +Z.
 */
export function ColombianHouse({ palette = 4, floors = 2, detail = 'full', scale = 1 }: Props) {
  const pal = PALETTES[palette % PALETTES.length]
  const tiles = getTileTexture()
  const d = dims(floors)
  const gable = getGable(floors)
  const full = detail === 'full'
  const two = floors === 2

  const balusters = useMemo<InstanceItem[]>(() => {
    if (!full || !two) return []
    const items: InstanceItem[] = []
    const zf = D / 2 + 0.95
    for (let x = -2.2; x <= 2.21; x += 0.22) items.push({ position: [x, 1.9, zf], scale: [0.04, 0.62, 0.04] })
    for (const sx of [-2.3, 2.3])
      for (let z = D / 2 + 0.1; z < zf; z += 0.2) items.push({ position: [sx, 1.9, z], scale: [0.04, 0.62, 0.04] })
    return items
  }, [full, two])

  const garden = useMemo(() => {
    if (!full) return []
    const colors = ['#9CC6E0', '#ACBCBF', '#F4FCFB', '#cfe0e8', '#ffffff']
    const out: { p: V3; c: string }[] = []
    for (let i = 0; i < 9; i++) {
      out.push({ p: [-2.6 - (i % 3) * 0.2, 0.12 + (i % 2) * 0.05, -0.9 + i * 0.28], c: colors[i % 5] })
      out.push({ p: [2.6 + (i % 3) * 0.2, 0.12 + (i % 2) * 0.05, -0.9 + i * 0.28], c: colors[(i + 2) % 5] })
    }
    return out
  }, [full])

  return (
    <group scale={scale}>
      {/* Cimiento y paredes */}
      <Box size={[W + 0.2, 0.12, D + 0.2]} position={[0, 0.02, 0]} color="#8ea0a8" />
      <Box size={[W, FLOOR1, D]} position={[0, FLOOR1 / 2, 0]} color={pal.wall} />
      <Box size={[W + 0.05, 0.45, D + 0.05]} position={[0, 0.3, 0]} color={pal.socle} />
      {two && <Box size={[W, FLOOR2, D]} position={[0, FLOOR1 + FLOOR2 / 2, 0]} color={pal.wall} />}
      {two && <Box size={[W + 0.1, 0.1, D + 0.1]} position={[0, FLOOR1, 0]} color={WOOD_DARK} />}

      {/* Frontones y techo de teja */}
      <mesh geometry={gable} position={[-(W - 0.02) / 2, d.wallTop, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={pal.wall} roughness={0.9} flatShading />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, (d.ridge + d.eaveY) / 2 + 0.05, (s * d.eaveZ) / 2]} rotation={[s * d.angle, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + 0.9, 0.1, d.len + 0.05]} />
          <meshStandardMaterial map={tiles} color="#ffffff" roughness={0.85} flatShading />
        </mesh>
      ))}
      <Box size={[W + 0.95, 0.12, 0.26]} position={[0, d.ridge + 0.1, 0]} color="#243C4C" />

      {/* Chimenea */}
      <Box size={[0.4, 1.0, 0.4]} position={[1.4, d.ridge - 0.1, -0.5]} color="#ACBCBF" />
      <Box size={[0.5, 0.08, 0.5]} position={[1.4, d.ridge + 0.42, -0.5]} color="#243C4C" />
      {full && <Smoke position={[1.4, d.ridge + 0.5, -0.5]} />}

      {/* Puerta principal y ventanas (planta baja) */}
      <Box size={[0.95, 1.25, 0.08]} position={[0, 0.7, D / 2 + 0.02]} color={pal.frame} />
      <Box size={[0.8, 1.15, 0.1]} position={[0, 0.65, D / 2 + 0.04]} color={pal.door} />
      <mesh position={[0, 1.0, D / 2 + 0.1]}>
        <boxGeometry args={[0.4, 0.3, 0.02]} />
        <meshStandardMaterial color={GLASS} roughness={0.2} />
      </mesh>
      <Window x={-1.4} y={0.95} z={D / 2 + 0.02} frame={pal.frame} />
      <Window x={1.4} y={0.95} z={D / 2 + 0.02} frame={pal.frame} />

      {/* Planta alta: puerta doble al balcón y ventanas con postigos */}
      {two && (
        <>
          <Box size={[1.0, 1.15, 0.08]} position={[0, 2.18, D / 2 + 0.02]} color={pal.frame} />
          <Box size={[0.4, 1.0, 0.04]} position={[-0.23, 2.18, D / 2 + 0.07]} color={pal.door} />
          <Box size={[0.4, 1.0, 0.04]} position={[0.23, 2.18, D / 2 + 0.07]} color={pal.door} />
          <Window x={-1.5} y={2.2} z={D / 2 + 0.02} frame={pal.frame} shutter={pal.shutter} />
          <Window x={1.5} y={2.2} z={D / 2 + 0.02} frame={pal.frame} shutter={pal.shutter} />
        </>
      )}
      {full &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (W / 2 + 0.02), 0.95, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <Window x={0} y={0} z={0} frame={pal.frame} />
            {two && <Window x={0} y={1.25} z={0} frame={pal.frame} shutter={pal.shutter} />}
          </group>
        ))}

      {/* Balcón de madera */}
      {two && (
        <>
          <Box size={[W + 0.4, 0.1, 1.05]} position={[0, FLOOR1 + 0.1, D / 2 + 0.5]} color={WOOD} />
          <Box size={[W + 0.4, 0.07, 0.09]} position={[0, 2.23, D / 2 + 0.95]} color={pal.balcony} />
          {[-2.3, 2.3].map((x) => (
            <Box key={x} size={[0.09, 0.07, 0.95]} position={[x, 2.23, D / 2 + 0.52]} color={pal.balcony} />
          ))}
          {!full && <Box size={[W + 0.3, 0.5, 0.04]} position={[0, 1.95, D / 2 + 0.95]} color={pal.balcony} />}
          <Instanced items={balusters}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={pal.balcony} roughness={0.9} flatShading />
          </Instanced>
          {[-2.1, -0.7, 0.7, 2.1].map((x) => (
            <Box key={x} size={[0.13, 1.6, 0.13]} position={[x, 0.78, D / 2 + 0.95]} color={WOOD_DARK} />
          ))}
        </>
      )}
      {full &&
        two &&
        [-1.8, -1.0, -0.2, 0.6, 1.4, 2.0].map((x, i) => (
          <group key={x} position={[x, 2.3, D / 2 + 1.03]}>
            <Box size={[0.26, 0.16, 0.16]} position={[0, 0, 0]} color="#698696" />
            <Flower position={[-0.05, 0.16, 0]} color={['#9CC6E0', '#F4FCFB', '#ACBCBF'][i % 3]} />
            <Flower position={[0.07, 0.2, 0.02]} color={['#F4FCFB', '#9CC6E0', '#ffffff'][i % 3]} />
          </group>
        ))}

      {/* Banca y jardín (solo la casa principal) */}
      {full && (
        <>
          <Box size={[1.2, 0.08, 0.32]} position={[-1.4, 0.42, D / 2 + 0.55]} color={WOOD} />
          <Box size={[0.08, 0.4, 0.28]} position={[-1.9, 0.2, D / 2 + 0.55]} color={WOOD_DARK} />
          <Box size={[0.08, 0.4, 0.28]} position={[-0.9, 0.2, D / 2 + 0.55]} color={WOOD_DARK} />
          {garden.map((f, i) => (
            <Flower key={i} position={f.p} color={f.c} />
          ))}
          {/* Escalones, macetas grandes y farol junto a la puerta */}
          <Box size={[1.5, 0.1, 0.55]} position={[0, 0.06, D / 2 + 0.3]} color="#9fb0b6" />
          <Box size={[1.2, 0.1, 0.38]} position={[0, 0.16, D / 2 + 0.22]} color="#b0c0c5" />
          {[-1.0, 1.0].map((x) => (
            <group key={x} position={[x, 0, D / 2 + 0.5]}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.15, 0.4, 8]} />
                <meshStandardMaterial color="#698696" flatShading />
              </mesh>
              <mesh position={[0, 0.6, 0]} castShadow>
                <icosahedronGeometry args={[0.28, 0]} />
                <meshStandardMaterial color="#4f8a7a" flatShading />
              </mesh>
              <Flower position={[0.1, 0.82, 0.05]} color={x < 0 ? '#9CC6E0' : '#ACBCBF'} />
            </group>
          ))}
          <mesh position={[0.72, 1.2, D / 2 + 0.12]}>
            <boxGeometry args={[0.12, 0.2, 0.12]} />
            <meshStandardMaterial color="#ffe2a0" emissive="#ffa83a" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.9, 0.12, 2.8]} position={[s * 2.9, 0.06, 0.2]} color="#4a5a63" />
          ))}
        </>
      )}
    </group>
  )
}
