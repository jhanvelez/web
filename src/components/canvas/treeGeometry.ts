import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../../lib/random'
import type { SpeciesId } from '../../lib/trees'

type Rng = ReturnType<typeof createRng>
const UP = new THREE.Vector3(0, 1, 0)

interface Spec {
  trunkH: number
  trunkR: number
  taper: number
  levels: number
  kids: [number, number]
  /** Apertura de cada rama respecto a la anterior (rad). */
  spread: number
  lenDecay: number
  upBias: number
  /** Ramas laterales a lo largo del tronco. */
  side?: number
  wood: [string, string]
  crown: 'blossom' | 'leaf' | 'rosette'
  palette: string[]
  /** Radio de cada racimo de flores / hoja / roseta. */
  blob: [number, number]
  perTip: number
  jitter: number
  /** Racimos verdes mezclados (follaje bajo las flores). */
  green?: number
}

/**
 * Dimensiones en unidades de mundo: el arriero mide ≈1.3, una casa de pueblo ≈3.1 de alto.
 * Árboles de 4–7 de alto y copas de 3–5 de ancho: grandes pero a escala de las casas.
 */
const SPECS: Record<Exclude<SpeciesId, 'pino'>, Spec> = {
  guayacan: {
    trunkH: 2.7, trunkR: 0.15, taper: 0.62, levels: 3, kids: [2, 3], spread: 0.62, lenDecay: 0.68, upBias: 0.3, side: 2,
    wood: ['#8a7c6e', '#5a4a3d'], crown: 'blossom', palette: ['#ffd21f', '#ffc400', '#ffe45c', '#f5b800'],
    blob: [0.2, 0.32], perTip: 6, jitter: 0.6,
  },
  rosado: {
    trunkH: 2.5, trunkR: 0.14, taper: 0.62, levels: 3, kids: [2, 3], spread: 0.8, lenDecay: 0.72, upBias: 0.25, side: 2,
    wood: ['#5b4a42', '#3d312b'], crown: 'blossom', palette: ['#f29bc2', '#ee7fb0', '#f7b6d2', '#e86aa3'],
    blob: [0.17, 0.27], perTip: 5, jitter: 0.7,
  },
  jacaranda: {
    trunkH: 2.0, trunkR: 0.19, taper: 0.62, levels: 3, kids: [2, 3], spread: 0.95, lenDecay: 0.74, upBias: 0.2, side: 2,
    wood: ['#6b5545', '#4a3a30'], crown: 'blossom', palette: ['#9b6fd8', '#8a5cd0', '#b48ae6', '#7b4cc2'],
    blob: [0.19, 0.3], perTip: 6, jitter: 0.7,
  },
  yarumo: {
    trunkH: 3.3, trunkR: 0.11, taper: 0.8, levels: 2, kids: [2, 3], spread: 0.5, lenDecay: 0.55, upBias: 0.4,
    wood: ['#9a9484', '#6f6a5d'], crown: 'leaf', palette: ['#f6f8f2', '#b9d3b0'],
    blob: [0.46, 0.58], perTip: 6, jitter: 0.5,
  },
  navajuelo: {
    trunkH: 1.5, trunkR: 0.2, taper: 0.62, levels: 3, kids: [3, 3], spread: 0.9, lenDecay: 0.72, upBias: 0.3, side: 1,
    wood: ['#6b5a4d', '#4a3d34'], crown: 'blossom', palette: ['#f06aa8', '#e8559a', '#f58cc0', '#d9468c'],
    blob: [0.23, 0.35], perTip: 7, jitter: 0.6,
  },
  mermelada: {
    trunkH: 1.8, trunkR: 0.17, taper: 0.62, levels: 3, kids: [2, 3], spread: 0.85, lenDecay: 0.72, upBias: 0.3, side: 1,
    wood: ['#6a5445', '#4a3a30'], crown: 'blossom', palette: ['#ff8a1f', '#ff6a13', '#ffa347', '#e85d0c'],
    blob: [0.2, 0.32], perTip: 6, jitter: 0.6,
  },
  nogal: {
    trunkH: 2.6, trunkR: 0.15, taper: 0.62, levels: 3, kids: [2, 3], spread: 0.7, lenDecay: 0.7, upBias: 0.35, side: 2,
    wood: ['#7a6a5a', '#54463a'], crown: 'blossom', palette: ['#fffaf0', '#f2efe2', '#ffffff', '#e8efd8'],
    blob: [0.18, 0.3], perTip: 6, jitter: 0.65, green: 3,
  },
  drago: {
    trunkH: 1.7, trunkR: 0.3, taper: 0.66, levels: 2, kids: [2, 2], spread: 0.78, lenDecay: 0.7, upBias: 0.2,
    wood: ['#7a6b5d', '#5d5047'], crown: 'rosette', palette: ['#4f7d4a', '#3d6b45', '#5f8c55'],
    blob: [0.85, 1.05], perTip: 16, jitter: 0.1,
  },
}

export interface TreeModel {
  wood: THREE.BufferGeometry
  crown: THREE.BufferGeometry
  /** Centro y radio de la copa (para soltar pétalos desde ella), en espacio del árbol. */
  crownCenter: THREE.Vector3
  crownRadius: number
}

function paint(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}
function prep(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g
  n.deleteAttribute('uv')
  return n
}
const jitterColor = (base: string, rng: Rng, amt = 0.05) => new THREE.Color(base).offsetHSL(rng.range(-0.01, 0.01), 0, rng.range(-amt, amt))

function limb(from: THREE.Vector3, dir: THREE.Vector3, len: number, r0: number, r1: number, color: THREE.Color) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 5, 1)
  g.translate(0, len / 2, 0)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir))
  g.translate(from.x, from.y, from.z)
  return paint(prep(g), color)
}

/** Hoja palmeada del yarumo: abanico de 9 lóbulos, ligeramente cóncava, con el envés plateado. */
function palmateLeaf(R: number, center: string, edge: string) {
  const lobes = 9
  const pos: number[] = []
  const col: number[] = []
  const cC = new THREE.Color(center)
  const cE = new THREE.Color(edge)
  const ring = (k: number): [number, number, number] => {
    const a = (k / (lobes * 2)) * Math.PI * 2
    const r = k % 2 === 0 ? R : R * 0.5
    return [Math.cos(a) * r, 0.18 * (r / R) ** 2 * R, Math.sin(a) * r]
  }
  for (let k = 0; k < lobes * 2; k++) {
    const a = ring(k)
    const b = ring(k + 1)
    pos.push(0, -0.01, 0, ...b, ...a)
    col.push(cC.r, cC.g, cC.b, cE.r, cE.g, cE.b, cE.r, cE.g, cE.b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

function grow(spec: Spec, rng: Rng) {
  const wood: THREE.BufferGeometry[] = []
  const tips: { p: THREE.Vector3; d: THREE.Vector3 }[] = []
  const mids: THREE.Vector3[] = []
  const c0 = new THREE.Color(spec.wood[0])
  const c1 = new THREE.Color(spec.wood[1])

  const rec = (p: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, maxDepth: number) => {
    const r1 = r * spec.taper
    wood.push(limb(p, dir, len, r, r1, c0.clone().lerp(c1, depth / (spec.levels + 0.5))))
    const end = p.clone().addScaledVector(dir, len)
    if (depth >= 2 && depth < maxDepth) mids.push(end.clone())
    if (depth >= maxDepth) {
      tips.push({ p: end, d: dir.clone() })
      return
    }
    const n = Math.round(rng.range(spec.kids[0], spec.kids[1]))
    const az0 = rng.range(0, Math.PI * 2)
    const perp = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(dir).normalize() : new THREE.Vector3(1, 0, 0)
    for (let i = 0; i < n; i++) {
      const az = az0 + (i * Math.PI * 2) / n + rng.range(-0.4, 0.4)
      const axis = perp.clone().applyAxisAngle(dir, az)
      const cd = dir.clone().applyAxisAngle(axis, spec.spread * rng.range(0.8, 1.2))
      cd.y += spec.upBias * 0.4
      cd.normalize()
      rec(end, cd, len * spec.lenDecay * rng.range(0.85, 1.1), r1 * 0.85, depth + 1, maxDepth)
    }
  }

  const dir0 = new THREE.Vector3(rng.range(-0.05, 0.05), 1, rng.range(-0.05, 0.05)).normalize()
  const origin = new THREE.Vector3()
  // Tronco + ramas laterales a lo largo de su tercio superior (copa más natural).
  const topR = spec.trunkR * spec.taper
  wood.push(limb(origin, dir0, spec.trunkH, spec.trunkR, topR, c0))
  const top = origin.clone().addScaledVector(dir0, spec.trunkH)
  for (let s = 0; s < (spec.side ?? 0); s++) {
    const at = origin.clone().addScaledVector(dir0, spec.trunkH * (0.62 + 0.14 * s))
    const az = rng.range(0, Math.PI * 2)
    const out = new THREE.Vector3(Math.cos(az), 1.1, Math.sin(az)).normalize()
    rec(at, out, spec.trunkH * 0.5, spec.trunkR * 0.55, 2, spec.levels)
  }
  // Ramificación principal desde la punta del tronco.
  const n = Math.round(rng.range(spec.kids[0], spec.kids[1]))
  const az0 = rng.range(0, Math.PI * 2)
  for (let i = 0; i < n; i++) {
    const az = az0 + (i * Math.PI * 2) / n + rng.range(-0.3, 0.3)
    const axis = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).cross(UP).normalize()
    const cd = dir0.clone().applyAxisAngle(axis, spec.spread * rng.range(0.8, 1.2))
    cd.y += spec.upBias * 0.4
    cd.normalize()
    rec(top, cd, spec.trunkH * spec.lenDecay * 1.0, topR, 1, spec.levels)
  }
  return { wood, tips, mids }
}

function buildPine(rng: Rng): TreeModel {
  const wood = [limb(new THREE.Vector3(), UP.clone(), 1.6, 0.16, 0.12, new THREE.Color('#5a4636'))]
  const crown: THREE.BufferGeometry[] = []
  const tiers = 7
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1)
    const R = 1.45 * (1 - t) + 0.28
    const h = 1.35 - t * 0.35
    for (let layer = 0; layer < 2; layer++) {
      const g = new THREE.ConeGeometry(R * (layer ? 0.78 : 1), h, 9, 1)
      g.rotateY(rng.range(0, 6.28))
      g.translate(rng.range(-0.05, 0.05), 1.0 + i * 0.78 + layer * 0.34 + h / 2, rng.range(-0.05, 0.05))
      crown.push(paint(prep(g), jitterColor(layer ? '#3f7a45' : '#2f5a38', rng, 0.04)))
    }
  }
  const g = mergeGeometries(crown, false)
  g.computeBoundingSphere()
  return {
    wood: mergeGeometries(wood, false),
    crown: g,
    crownCenter: new THREE.Vector3(0, 4.2, 0),
    crownRadius: 1.2,
  }
}

function buildDeciduous(species: Exclude<SpeciesId, 'pino'>, rng: Rng): TreeModel {
  const spec = SPECS[species]
  const { wood, tips, mids } = grow(spec, rng)
  const crown: THREE.BufferGeometry[] = []

  for (const t of tips) {
    if (spec.crown === 'blossom') {
      for (let k = 0; k < spec.perTip; k++) {
        const r = rng.range(spec.blob[0], spec.blob[1])
        const g = new THREE.IcosahedronGeometry(r, 0)
        g.rotateX(rng.range(0, 3))
        g.rotateY(rng.range(0, 3))
        g.translate(
          t.p.x + rng.range(-1, 1) * spec.jitter,
          t.p.y + rng.range(-0.7, 0.9) * spec.jitter,
          t.p.z + rng.range(-1, 1) * spec.jitter,
        )
        crown.push(paint(prep(g), jitterColor(rng.pick(spec.palette), rng)))
      }
      for (let k = 0; k < (spec.green ?? 0); k++) {
        const g = new THREE.IcosahedronGeometry(rng.range(0.22, 0.34), 0)
        g.translate(t.p.x + rng.range(-1, 1) * spec.jitter * 0.8, t.p.y - 0.25 + rng.range(-0.4, 0.4), t.p.z + rng.range(-1, 1) * spec.jitter * 0.8)
        crown.push(paint(prep(g), jitterColor('#4f8a45', rng)))
      }
    } else if (spec.crown === 'leaf') {
      for (let k = 0; k < spec.perTip; k++) {
        const g = palmateLeaf(rng.range(spec.blob[0], spec.blob[1]), spec.palette[1], spec.palette[0])
        const normal = new THREE.Vector3(rng.range(-0.35, 0.35), 1, rng.range(-0.35, 0.35)).normalize()
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, normal))
        g.rotateY(rng.range(0, 6.28))
        const a = (k / spec.perTip) * Math.PI * 2 + rng.range(-0.4, 0.4)
        g.translate(t.p.x + Math.cos(a) * 0.45, t.p.y + 0.12 + rng.range(0, 0.25), t.p.z + Math.sin(a) * 0.45)
        crown.push(prep(g))
      }
    } else {
      // Roseta de hojas largas (drago).
      for (let k = 0; k < spec.perTip; k++) {
        const len = rng.range(spec.blob[0], spec.blob[1])
        const g = new THREE.ConeGeometry(0.07, len, 4)
        g.translate(0, len / 2, 0)
        const polar = rng.range(0.55, 1.35)
        const az = (k / spec.perTip) * Math.PI * 2 + rng.range(-0.15, 0.15)
        g.rotateZ(polar)
        g.rotateY(az)
        g.translate(t.p.x, t.p.y, t.p.z)
        crown.push(paint(prep(g), jitterColor(rng.pick(spec.palette), rng)))
      }
    }
  }

  // Racimos intermedios: rellenan la copa para una silueta más redonda y definida.
  if (spec.crown === 'blossom') {
    for (const m of mids) {
      for (let k = 0; k < Math.ceil(spec.perTip / 2); k++) {
        const r = rng.range(spec.blob[0], spec.blob[1]) * 0.95
        const gm = new THREE.IcosahedronGeometry(r, 0)
        gm.rotateX(rng.range(0, 3))
        gm.rotateY(rng.range(0, 3))
        gm.translate(m.x + rng.range(-1, 1) * spec.jitter * 0.8, m.y + rng.range(-0.3, 0.6) * spec.jitter, m.z + rng.range(-1, 1) * spec.jitter * 0.8)
        crown.push(paint(prep(gm), jitterColor(rng.pick(spec.palette), rng)))
      }
    }
  }

  const crownGeo = mergeGeometries(crown, false)
  crownGeo.computeBoundingSphere()
  const bs = crownGeo.boundingSphere!
  return {
    wood: mergeGeometries(wood, false),
    crown: crownGeo,
    crownCenter: bs.center.clone(),
    crownRadius: bs.radius,
  }
}

const cache = new Map<string, TreeModel>()
/** Modelo de una especie (3 variantes por especie, deterministas). */
export function getTreeModel(species: SpeciesId, variant: number): TreeModel {
  const key = `${species}-${variant}`
  let m = cache.get(key)
  if (!m) {
    const rng = createRng(1000 + variant * 97 + species.length * 13 + species.charCodeAt(0))
    m = species === 'pino' ? buildPine(rng) : buildDeciduous(species, rng)
    cache.set(key, m)
  }
  return m
}
