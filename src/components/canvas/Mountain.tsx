import { useMemo } from 'react'
import * as THREE from 'three'
import { createRng } from '../../lib/random'
import { isClear, PATHS } from '../../lib/layout'
import { PLATEAU_RADIUS, TERRAIN_RADIUS, smoothstep, terrainHeight } from '../../lib/terrain'
import { Instanced, type InstanceItem } from './Instanced'

const RINGS = 30
const SEGMENTS = 72

/** Terreno orgánico low-poly en coordenadas polares, con color por cara. */
function buildTerrainGeometry(): THREE.BufferGeometry {
  const rng = createRng(7)
  const pos: number[] = []
  const idx: number[] = []
  const vtx = (i: number, j: number) => (i === 0 ? 0 : 1 + (i - 1) * SEGMENTS + (j % SEGMENTS))

  pos.push(0, terrainHeight(0, 0), 0)
  for (let i = 1; i <= RINGS; i++) {
    const r = (i / RINGS) * TERRAIN_RADIUS
    for (let j = 0; j < SEGMENTS; j++) {
      // Pequeño desfase por anillo para romper la simetría radial.
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
  const colors = new Float32Array(p.count * 3)
  const top = new THREE.Color('#9acb4a')
  const mid = new THREE.Color('#5fa046')
  const low = new THREE.Color('#2f7a3c')
  const soil = new THREE.Color('#9b6b3f')
  const c = new THREE.Color()
  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3
    const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3
    const cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3
    const r = Math.hypot(cx, cz)
    const t = Math.min(1, Math.max(0, (r - PLATEAU_RADIUS) / (TERRAIN_RADIUS - PLATEAU_RADIUS)))
    c.copy(top).lerp(mid, smoothstep(0, 0.45, t)).lerp(low, smoothstep(0.4, 0.95, t))
    c.lerp(soil, smoothstep(0.9, 1, t) * 0.8)
    // Parches de tierra y variación por cara.
    c.offsetHSL((rng.next() - 0.5) * 0.02, 0, (rng.next() - 0.5) * 0.07)
    if (cy > 0.2 && Math.sin(cx * 1.9) * Math.cos(cz * 2.3) > 0.82) c.lerp(soil, 0.35)
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (f + k) * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

/** Base rocosa del diorama (cono invertido con vértices desplazados). */
function buildRockBase(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(TERRAIN_RADIUS * 0.995, 8, 11, 4, true)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    // Ruido determinista por posición para que las costuras coincidan.
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    const n = h - Math.floor(h)
    const k = y < 3.9 ? 0.45 : 0 // no mover el borde superior
    p.setXYZ(i, x + (n - 0.5) * k, y + (n - 0.5) * k * 0.6, z + (n - 0.5) * k)
  }
  geo.computeVertexNormals()
  return geo
}

const WAX_TRUNK = ['#d8cdb4', '#cfc4aa', '#e0d6bf']
const WAX_LEAF = ['#3f8a36', '#4a9a3c', '#357a30']
const TREE_LEAF = ['#2f8a44', '#3f9b4a', '#27783a', '#5aa63c']
const FLOWERS = ['#e5483f', '#f6c445', '#f08ac0', '#ffffff', '#e87b2c']

function useScatter() {
  return useMemo(() => {
    const rng = createRng(2024)
    const place = (rMin: number, rMax: number, clear: number, tries = 40) => {
      for (let i = 0; i < tries; i++) {
        const a = rng.next() * Math.PI * 2
        const r = rMin + Math.sqrt(rng.next()) * (rMax - rMin)
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        if (isClear(x, z, clear)) return { x, z, y: terrainHeight(x, z) }
      }
      return null
    }

    // Palmas de cera: tronco esbelto + corona de hojas.
    const palmTrunks: InstanceItem[] = []
    const palmLeaves: InstanceItem[] = []
    const palms: { x: number; y: number; z: number; h: number }[] = []
    for (let n = 0; n < 24; n++) {
      const p = place(5.8, 11.2, 0.6)
      if (!p) continue
      const h = rng.range(3.6, 6)
      palms.push({ ...p, h })
      palmTrunks.push({
        position: [p.x, p.y + h / 2 - 0.1, p.z],
        rotation: [rng.range(-0.04, 0.04), 0, rng.range(-0.04, 0.04)],
        scale: [rng.range(0.1, 0.14), h, rng.range(0.1, 0.14)],
        color: rng.pick(WAX_TRUNK),
      })
      const nl = 9
      const leafColor = rng.pick(WAX_LEAF)
      for (let l = 0; l < nl; l++) {
        palmLeaves.push({
          position: [p.x, p.y + h - 0.05, p.z],
          rotation: [rng.range(0.7, 1.45), (l / nl) * Math.PI * 2 + rng.range(-0.2, 0.2), 0],
          scale: [1, rng.range(0.9, 1.25), 1],
          color: leafColor,
        })
      }
      palmLeaves.push({ position: [p.x, p.y + h - 0.1, p.z], rotation: [0.15, rng.range(0, 6), 0], scale: [1, 0.8, 1], color: leafColor })
    }

    // Árboles de sombrío (guamos, nogales…).
    const treeTrunks: InstanceItem[] = []
    const treeCanopies: InstanceItem[] = []
    for (let n = 0; n < 30; n++) {
      const p = place(5.2, 11.6, 0.7)
      if (!p) continue
      const s = rng.range(0.8, 1.5)
      const th = 0.9 * s
      treeTrunks.push({ position: [p.x, p.y + th / 2 - 0.1, p.z], scale: [0.16 * s, th, 0.16 * s] })
      const col = rng.pick(TREE_LEAF)
      treeCanopies.push({ position: [p.x, p.y + th + 0.45 * s, p.z], rotation: [0, rng.range(0, 6), 0], scale: [0.75 * s, 0.6 * s, 0.75 * s], color: col })
      treeCanopies.push({ position: [p.x + rng.range(-0.2, 0.2), p.y + th + 0.95 * s, p.z + rng.range(-0.2, 0.2)], rotation: [0, rng.range(0, 6), 0], scale: [0.5 * s, 0.45 * s, 0.5 * s], color: col })
    }

    // Cafetales: hileras en curvas de nivel, en la ladera trasera-izquierda.
    const bushes: InstanceItem[] = []
    const cherries: InstanceItem[] = []
    for (const r of [7.0, 8.0, 9.0, 10.0]) {
      const a0 = Math.PI * 1.02
      const a1 = Math.PI * 1.72
      const step = 0.62 / r
      for (let a = a0; a < a1; a += step) {
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        if (!isClear(x, z, 0.1)) continue
        const y = terrainHeight(x, z)
        const s = rng.range(0.85, 1.15)
        bushes.push({ position: [x, y + 0.2 * s, z], rotation: [0, rng.range(0, 6), 0], scale: [0.34 * s, 0.28 * s, 0.34 * s], color: rng.pick(['#2c6e3a', '#347a3d', '#3a8444']) })
        for (let k = 0; k < 3; k++) {
          const b = rng.range(0, Math.PI * 2)
          cherries.push({ position: [x + Math.cos(b) * 0.3 * s, y + 0.22 * s + rng.range(-0.05, 0.12), z + Math.sin(b) * 0.3 * s], scale: 0.05 })
        }
      }
    }

    // Piedras.
    const rocks: InstanceItem[] = []
    for (let n = 0; n < 22; n++) {
      const p = place(4.4, 12, 0.5)
      if (!p) continue
      const s = rng.range(0.18, 0.55)
      rocks.push({
        position: [p.x, p.y + s * 0.3, p.z],
        rotation: [rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)],
        scale: [s * rng.range(0.9, 1.5), s * rng.range(0.6, 1), s * rng.range(0.9, 1.4)],
        color: rng.pick(['#8c8a82', '#a29f94', '#77756e']),
      })
    }

    // Flores silvestres.
    const flowers: InstanceItem[] = []
    for (let n = 0; n < 90; n++) {
      const p = place(3.6, 11.4, 0.3, 12)
      if (!p) continue
      flowers.push({ position: [p.x, p.y + 0.06, p.z], scale: rng.range(0.04, 0.07), color: rng.pick(FLOWERS) })
    }

    // Piedras del camino.
    const stepping: InstanceItem[] = []
    for (const path of PATHS) {
      path.forEach(([x, z], i) => {
        if (i === 0) return
        for (let k = 0; k < 2; k++) {
          const px = x + rng.range(-0.28, 0.28)
          const pz = z + rng.range(-0.28, 0.28)
          stepping.push({ position: [px, terrainHeight(px, pz) + 0.015, pz], scale: [rng.range(0.22, 0.34), 0.03, rng.range(0.2, 0.3)], rotation: [0, rng.range(0, 3), 0], color: rng.pick(['#b9ad98', '#a89c86', '#c8bda8']) })
        }
      })
    }

    return { palmTrunks, palmLeaves, treeTrunks, treeCanopies, bushes, cherries, rocks, flowers, stepping }
  }, [])
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
      <mesh geometry={base} position={[0, -4, 0]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#6f5238" flatShading roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Palmas de cera */}
      <Instanced items={s.palmTrunks}>
        <cylinderGeometry args={[0.5, 0.75, 1, 7]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </Instanced>
      <Instanced items={s.palmLeaves}>
        <PalmLeafGeometry />
        <meshStandardMaterial flatShading roughness={0.8} side={THREE.DoubleSide} />
      </Instanced>

      {/* Árboles */}
      <Instanced items={s.treeTrunks}>
        <cylinderGeometry args={[0.7, 1, 1, 6]} />
        <meshStandardMaterial color="#6b4a2e" flatShading roughness={1} />
      </Instanced>
      <Instanced items={s.treeCanopies}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </Instanced>

      {/* Cafetales */}
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
      <Instanced items={s.stepping} castShadow={false}>
        <cylinderGeometry args={[1, 1, 1, 7]} />
        <meshStandardMaterial flatShading roughness={1} />
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
