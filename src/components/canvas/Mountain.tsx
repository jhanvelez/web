import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRng } from '../../lib/random'
import { GRASS_AVOID, isClear, NETWORK } from '../../lib/layout'
import { smoothstep, terrainHeight } from '../../lib/terrain'
import { TREES } from '../../lib/trees'
import { PLAZAS, PLAZA_LIST, PONDS, WATER_LEVEL, WORLD_RADIUS } from '../../lib/world'
import { Instanced, type InstanceItem } from './Instanced'

const RINGS = 120
const SEGMENTS = 260

/** Terreno orgánico low-poly en polares, con color por cara (pradera, ladera, roca, tierra). */
function buildTerrainGeometry(): THREE.BufferGeometry {
  const rng = createRng(7)
  const pos: number[] = []
  const idx: number[] = []
  const vtx = (i: number, j: number) => (i === 0 ? 0 : 1 + (i - 1) * SEGMENTS + (j % SEGMENTS))

  pos.push(0, terrainHeight(0, 0), 0)
  for (let i = 1; i <= RINGS; i++) {
    const r = (i / RINGS) * WORLD_RADIUS
    for (let j = 0; j < SEGMENTS; j++) {
      const a = ((j + (i % 2) * 0.5) / SEGMENTS) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      pos.push(x, terrainHeight(x, z), z)
    }
  }
  for (let j = 0; j < SEGMENTS; j++) idx.push(0, vtx(1, j + 1), vtx(1, j))
  for (let i = 1; i < RINGS; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = vtx(i, j), b = vtx(i, j + 1), c = vtx(i + 1, j), d = vtx(i + 1, j + 1)
      idx.push(a, b, c, b, d, c)
    }
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  indexed.setIndex(idx)
  const geo = indexed.toNonIndexed()
  geo.computeVertexNormals()

  const p = geo.attributes.position
  const n = geo.attributes.normal
  const colors = new Float32Array(p.count * 3)
  const low = new THREE.Color('#15321f')
  const mid = new THREE.Color('#2c5a2a')
  const high = new THREE.Color('#5d8a32')
  const rock = new THREE.Color('#2e2823')
  const soil = new THREE.Color('#9b6b3f')
  const sand = new THREE.Color('#e0b873')
  const shallow = new THREE.Color('#5fd0c4')
  const bed = new THREE.Color('#2a7a80')
  const c = new THREE.Color()
  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3
    const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3
    const cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3
    const r = Math.hypot(cx, cz)
    const slope = 1 - n.getY(f)
    c.copy(low).lerp(mid, smoothstep(0.6, 2.0, cy)).lerp(high, smoothstep(2.0, 4.2, cy))
    c.lerp(rock, smoothstep(0.22, 0.5, slope) * 0.75)
    c.lerp(soil, smoothstep(WORLD_RADIUS - 1.3, WORLD_RADIUS, r) * 0.85)
    if (cy < WATER_LEVEL + 0.7) c.lerp(sand, smoothstep(WATER_LEVEL + 0.7, WATER_LEVEL + 0.15, cy))
    if (cy < WATER_LEVEL + 0.1) c.lerp(shallow, smoothstep(WATER_LEVEL + 0.1, WATER_LEVEL - 0.3, cy) * 0.7)
    if (cy < WATER_LEVEL - 0.4) c.lerp(bed, 0.8)
    c.offsetHSL((rng.next() - 0.5) * 0.02, 0, (rng.next() - 0.5) * 0.07)
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (f + k) * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

/** Base rocosa del diorama (cono invertido con vértices desplazados). */
function buildRockBase(): THREE.BufferGeometry {
  const H = 16
  const geo = new THREE.ConeGeometry(WORLD_RADIUS * 0.995, H, 14, 5, true)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    const nn = h - Math.floor(h)
    const k = y < H / 2 - 0.1 ? 0.9 : 0
    p.setXYZ(i, x + (nn - 0.5) * k, y + (nn - 0.5) * k * 0.6, z + (nn - 0.5) * k)
  }
  geo.computeVertexNormals()
  return geo
}

const WAX_TRUNK = ['#d8cdb4', '#cfc4aa', '#e0d6bf']
const WAX_LEAF = ['#3f8a36', '#4a9a3c', '#357a30']
const FLOWERS = ['#e5483f', '#f6c445', '#f08ac0', '#ffffff', '#e87b2c']
const COBBLES = ['#6d5a47', '#7a6652', '#4f4236', '#8a7660', '#5d544a', '#6f6456', '#2f2a26']

function useScatter() {
  return useMemo(() => {
    const rng = createRng(2024)
    const place = (rMin: number, rMax: number, clear: number, tries = 40) => {
      for (let i = 0; i < tries; i++) {
        const a = rng.next() * Math.PI * 2
        const r = rMin + Math.sqrt(rng.next()) * (rMax - rMin)
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const y = terrainHeight(x, z)
        if (y > WATER_LEVEL + 0.6 && isClear(x, z, clear)) return { x, z, y }
      }
      return null
    }
    const maxR = WORLD_RADIUS - 2.5

    // Palmas de cera
    const palmTrunks: InstanceItem[] = []
    const palmLeaves: InstanceItem[] = []
    for (let n = 0; n < 150; n++) {
      const p = place(0, maxR, 0.6)
      if (!p || TREES.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 2.2)) continue
      const h = rng.range(3.6, 6.2)
      palmTrunks.push({
        position: [p.x, p.y + h / 2 - 0.1, p.z],
        rotation: [rng.range(-0.04, 0.04), 0, rng.range(-0.04, 0.04)],
        scale: [rng.range(0.1, 0.14), h, rng.range(0.1, 0.14)],
        color: rng.pick(WAX_TRUNK),
      })
      const leafColor = rng.pick(WAX_LEAF)
      for (let l = 0; l < 9; l++) {
        palmLeaves.push({
          position: [p.x, p.y + h - 0.05, p.z],
          rotation: [rng.range(0.7, 1.45), (l / 9) * Math.PI * 2 + rng.range(-0.2, 0.2), 0],
          scale: [1, rng.range(0.9, 1.25), 1],
          color: leafColor,
        })
      }
      palmLeaves.push({ position: [p.x, p.y + h - 0.1, p.z], rotation: [0.15, rng.range(0, 6), 0], scale: [1, 0.8, 1], color: leafColor })
    }

    // Cafetales: hileras en curva de nivel sobre las laderas de A y B (fuera del sector del camino).
    const bushes: InstanceItem[] = []
    const cherries: InstanceItem[] = []
    for (const id of ['A', 'B'] as const) {
      const pl = PLAZAS[id]
      const toK = Math.atan2(PLAZAS.K.z - pl.z, PLAZAS.K.x - pl.x)
      for (const d of [15, 16.3, 17.6]) {
        const step = 0.62 / d
        const a0 = toK + (50 * Math.PI) / 180
        const a1 = toK + (310 * Math.PI) / 180
        for (let a = a0; a < a1; a += step) {
          const x = pl.x + Math.cos(a) * d
          const z = pl.z + Math.sin(a) * d
          if (Math.hypot(x, z) > maxR - 1 || !isClear(x, z, 0.1)) continue
          const y = terrainHeight(x, z)
          const s = rng.range(0.85, 1.15)
          bushes.push({ position: [x, y + 0.2 * s, z], rotation: [0, rng.range(0, 6), 0], scale: [0.34 * s, 0.28 * s, 0.34 * s], color: rng.pick(['#2c6e3a', '#347a3d', '#3a8444']) })
          for (let k = 0; k < 2; k++) {
            const b = rng.range(0, Math.PI * 2)
            cherries.push({ position: [x + Math.cos(b) * 0.3 * s, y + 0.22 * s + rng.range(-0.05, 0.12), z + Math.sin(b) * 0.3 * s], scale: 0.05 })
          }
        }
      }
    }

    // Piedras sueltas y flores
    const rocks: InstanceItem[] = []
    for (let n = 0; n < 150; n++) {
      const p = place(0, maxR, 0.5)
      if (!p) continue
      const s = rng.range(0.18, 0.6)
      rocks.push({
        position: [p.x, p.y + s * 0.3, p.z],
        rotation: [rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)],
        scale: [s * rng.range(0.9, 1.5), s * rng.range(0.6, 1), s * rng.range(0.9, 1.4)],
        color: rng.pick(['#4a4844', '#5a5750', '#34322f']),
      })
    }
    const flowers: InstanceItem[] = []
    for (let n = 0; n < 650; n++) {
      const p = place(0, maxR, 0.3, 12)
      if (!p) continue
      flowers.push({ position: [p.x, p.y + 0.06, p.z], scale: rng.range(0.04, 0.07), color: rng.pick(FLOWERS) })
    }

    // Empedrado de río: caminos (árbol) y plazas. Piedras redondeadas, densas, como en una calle colonial.
    const cobbles: InstanceItem[] = []
    const addCobble = (x: number, z: number, big = 1) => {
      const s = rng.range(0.17, 0.27) * big
      cobbles.push({
        position: [x, terrainHeight(x, z) + 0.01, z],
        rotation: [rng.range(-0.15, 0.15), rng.range(0, 3), rng.range(-0.15, 0.15)],
        scale: [s * rng.range(0.9, 1.3), s * 0.45, s * rng.range(0.8, 1.2)],
        color: rng.pick(COBBLES),
      })
    }
    for (const e of NETWORK.edges) {
      const width = e.a.startsWith('H-') ? 0.75 : 0.95
      e.points.forEach(([x, z], i, arr) => {
        const nx = arr[Math.min(i + 1, arr.length - 1)]
        const pv = arr[Math.max(i - 1, 0)]
        const dx = nx[0] - pv[0]
        const dz = nx[1] - pv[1]
        const l = Math.hypot(dx, dz) || 1
        const px = -dz / l
        const pz = dx / l
        for (let k = -4; k <= 4; k++) {
          const lat = (k / 4) * width + rng.range(-0.09, 0.09)
          addCobble(x + px * lat + rng.range(-0.12, 0.12) * (dx / l), z + pz * lat + rng.range(-0.12, 0.12) * (dz / l))
        }
      })
    }
    for (const pl of PLAZA_LIST) {
      const step = 0.32
      for (let x = -pl.cobble; x <= pl.cobble; x += step) {
        for (let z = -pl.cobble; z <= pl.cobble; z += step) {
          const jx = x + rng.range(-0.1, 0.1)
          const jz = z + rng.range(-0.1, 0.1)
          if (Math.hypot(jx, jz) < pl.cobble) addCobble(pl.x + jx, pl.z + jz, 1.05)
        }
      }
    }

    // Pasto en mechones dorados (como en los prados de la referencia).
    const grass: InstanceItem[] = []
    const GRASS = ['#8a7a2c', '#6f8a30', '#9a8a36', '#55742c', '#a08436']
    for (let n = 0; n < 60000 && grass.length < 28000; n++) {
      const a = rng.next() * Math.PI * 2
      const r = Math.sqrt(rng.next()) * maxR
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const y = terrainHeight(x, z)
      if (y < WATER_LEVEL + 0.45) continue
      if (!GRASS_AVOID.every((c) => Math.hypot(x - c.x, z - c.z) > c.r)) continue
      const s = rng.range(0.7, 1.2)
      grass.push({
        position: [x, y + 0.02, z],
        rotation: [rng.range(-0.25, 0.25), rng.range(0, 6), rng.range(-0.25, 0.25)],
        scale: [s, s * rng.range(0.8, 1.3), s],
        color: rng.pick(GRASS),
      })
    }

    return { palmTrunks, palmLeaves, bushes, cherries, rocks, flowers, cobbles, grass }
  }, [])
}

/** Estanque con brillo turquesa y una leve respiración de luz. */
function Water({ x, z, r }: { x: number; z: number; r: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 1.3 + x) * 0.15
  })
  return (
    <mesh position={[x, WATER_LEVEL, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[r * 1.1, 40]} />
      <meshStandardMaterial ref={mat} color="#2fb3c4" emissive="#1c93a6" emissiveIntensity={0.55} transparent opacity={0.82} roughness={0.15} metalness={0.2} />
    </mesh>
  )
}

export function Mountain() {
  const terrain = useMemo(buildTerrainGeometry, [])
  const base = useMemo(buildRockBase, [])
  const s = useScatter()

  return (
    <group>
      <mesh geometry={terrain} receiveShadow castShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      <mesh geometry={base} position={[0, -6, 0]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#6f5238" flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {PONDS.map((p, i) => (
        <Water key={i} x={p.x} z={p.z} r={p.r} />
      ))}
      <Instanced items={s.grass} castShadow={false}>
        <GrassBladeGeometry />
        <meshStandardMaterial flatShading roughness={0.9} />
      </Instanced>
      <Instanced items={s.cobbles} castShadow={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={0.95} />
      </Instanced>

      <Instanced items={s.palmTrunks}>
        <cylinderGeometry args={[0.5, 0.75, 1, 7]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </Instanced>
      <Instanced items={s.palmLeaves}>
        <PalmLeafGeometry />
        <meshStandardMaterial flatShading roughness={0.8} side={THREE.DoubleSide} />
      </Instanced>

      <Instanced items={s.bushes}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </Instanced>
      <Instanced items={s.cherries} castShadow={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#c8232c" flatShading roughness={0.6} />
      </Instanced>

      <Instanced items={s.rocks}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={1} />
      </Instanced>
      <Instanced items={s.flowers} castShadow={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={0.7} />
      </Instanced>
    </group>
  )
}

/** Hoja de palma: cono aplanado con la base en el origen apuntando a +Y. */
function PalmLeafGeometry() {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.11, 1.5, 4)
    g.translate(0, 0.75, 0)
    g.scale(1, 1, 0.22)
    return g
  }, [])
  return <primitive object={geo} attach="geometry" />
}

/** Mechón: cono fino con la base en el origen. */
function GrassBladeGeometry() {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.035, 0.36, 4)
    g.translate(0, 0.18, 0)
    return g
  }, [])
  return <primitive object={geo} attach="geometry" />
}
