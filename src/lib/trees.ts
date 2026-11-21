import { isClear, NETWORK } from './layout'
import { createRng } from './random'
import { terrainHeight } from './terrain'
import { WATER_LEVEL, WORLD_RADIUS } from './world'

export type SpeciesId =
  | 'guayacan'
  | 'rosado'
  | 'jacaranda'
  | 'yarumo'
  | 'navajuelo'
  | 'mermelada'
  | 'nogal'
  | 'drago'
  | 'pino'

export interface SpeciesInfo {
  id: SpeciesId
  name: string
  sci?: string
  blurb: string
  /** Colores de los pétalos u hojas que caen (vacío = no sueltan). */
  petals: string[]
  /** Tamaño de cada pétalo en el mundo (≈ la mitad de una cabeza de arriero). */
  petalSize: number
  /** Cuánto cae respecto a las demás especies. */
  fall: number
  /** Deja alfombra de pétalos en el suelo. */
  carpet: boolean
  /** Frecuencia en el bosque. */
  weight: number
}

export const SPECIES: Record<SpeciesId, SpeciesInfo> = {
  guayacan: {
    id: 'guayacan',
    name: 'Guayacán amarillo',
    sci: 'Handroanthus chrysanthus',
    blurb: 'Florece de golpe y cubre el suelo de amarillo: una alfombra de pétalos.',
    petals: ['#ffd21f', '#ffe45c', '#f5b800', '#ffcc2e'],
    petalSize: 0.11,
    fall: 3.2,
    carpet: true,
    weight: 15,
  },
  rosado: {
    id: 'rosado',
    name: 'Guayacán rosado',
    sci: 'Tabebuia rosea',
    blurb: 'Su floración rosada pinta de flores las ramas desnudas.',
    petals: ['#f29bc2', '#ee7fb0', '#f7b6d2'],
    petalSize: 0.1,
    fall: 2.2,
    carpet: true,
    weight: 14,
  },
  jacaranda: {
    id: 'jacaranda',
    name: 'Jacaranda',
    sci: 'Jacaranda mimosifolia',
    blurb: 'Sus flores lilas tapizan calles y parques.',
    petals: ['#9b6fd8', '#b48ae6', '#8a5cd0'],
    petalSize: 0.1,
    fall: 2.6,
    carpet: true,
    weight: 14,
  },
  yarumo: {
    id: 'yarumo',
    name: 'Yarumo blanco',
    sci: 'Cecropia peltata',
    blurb: 'Hojas grandes de envés plateado; árbol pionero que ayuda a rehacer el bosque.',
    petals: ['#e9f0e2', '#cfe0c2', '#dfe9d4'],
    petalSize: 0.2,
    fall: 1.2,
    carpet: false,
    weight: 30,
  },
  navajuelo: {
    id: 'navajuelo',
    name: 'Navajuelo',
    blurb: 'Copa redonda cargada de flores rosadas.',
    petals: ['#f06aa8', '#f58cc0', '#e8559a'],
    petalSize: 0.1,
    fall: 1.4,
    carpet: false,
    weight: 8,
  },
  mermelada: {
    id: 'mermelada',
    name: 'Mermelada',
    blurb: 'Floración naranja intensa que enciende el paisaje.',
    petals: ['#ff8a1f', '#ffa347', '#ff6a13'],
    petalSize: 0.1,
    fall: 1.4,
    carpet: false,
    weight: 8,
  },
  nogal: {
    id: 'nogal',
    name: 'Nogal cafetero',
    blurb: 'Sombra y madera noble de las fincas cafeteras; florece en blanco.',
    petals: ['#fffaf0', '#f2efe2', '#ffffff'],
    petalSize: 0.09,
    fall: 1.3,
    carpet: false,
    weight: 10,
  },
  drago: {
    id: 'drago',
    name: 'Drago',
    blurb: 'Tronco robusto y copa en sombrilla; uno de los árboles que cuidan el ecosistema.',
    petals: [],
    petalSize: 0,
    fall: 0,
    carpet: false,
    weight: 6,
  },
  pino: {
    id: 'pino',
    name: 'Pino romerón',
    blurb: 'Conífera nativa de los Andes colombianos: esbelta y verde todo el año.',
    petals: [],
    petalSize: 0,
    fall: 0,
    carpet: false,
    weight: 18,
  },
}
export const SPECIES_LIST = Object.values(SPECIES)
export const VARIANTS = 3

export interface TreeInst {
  id: number
  species: SpeciesId
  variant: number
  x: number
  y: number
  z: number
  rot: number
  scale: number
}

/**
 * Bosque: avenidas de guayacán/jacaranda/rosado flanqueando las troncales de piedra (como una calle
 * de guayacanes) más un bosque disperso con todas las especies. Determinista.
 */
function buildTrees(): TreeInst[] {
  const rng = createRng(808)
  const out: TreeInst[] = []
  const free = (x: number, z: number, minDist: number) =>
    Math.hypot(x, z) < WORLD_RADIUS - 3 &&
    terrainHeight(x, z) > WATER_LEVEL + 0.6 &&
    isClear(x, z, 0.2) &&
    out.every((t) => Math.hypot(t.x - x, t.z - z) > minDist)
  const add = (species: SpeciesId, x: number, z: number, s: [number, number] = [0.88, 1.12]) => {
    out.push({
      id: out.length,
      species,
      variant: Math.floor(rng.next() * VARIANTS),
      x,
      y: terrainHeight(x, z),
      z,
      rot: rng.range(0, Math.PI * 2),
      scale: rng.range(s[0], s[1]),
    })
  }

  // Avenidas a ambos lados de las troncales (montaña → café).
  const avenue: SpeciesId[] = ['guayacan', 'jacaranda', 'guayacan', 'rosado']
  let k = 0
  for (const e of NETWORK.edges.filter((ed) => ed.a.startsWith('P-'))) {
    let acc = 0
    for (let i = 1; i < e.points.length; i++) {
      const [x0, z0] = e.points[i - 1]
      const [x1, z1] = e.points[i]
      const seg = Math.hypot(x1 - x0, z1 - z0)
      acc += seg
      if (acc < 8) continue
      acc = 0
      const nx = -(z1 - z0) / seg
      const nz = (x1 - x0) / seg
      for (const side of [-1, 1]) {
        const x = x1 + nx * side * 2.7
        const z = z1 + nz * side * 2.7
        if (free(x, z, 2.2)) add(avenue[k++ % avenue.length], x, z, [0.95, 1.12])
      }
    }
  }

  // Bosque disperso.
  const bag = SPECIES_LIST.flatMap((s) => Array<SpeciesId>(s.weight).fill(s.id))
  for (let n = 0; n < 1800 && out.length < 120; n++) {
    const a = rng.next() * Math.PI * 2
    const r = Math.sqrt(rng.next()) * (WORLD_RADIUS - 3)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const species = bag[Math.floor(rng.next() * bag.length)]
    if (free(x, z, species === 'pino' ? 1.9 : 2.5)) add(species, x, z)
  }
  // Bosque ligero y despejado: se quita 1 de cada 4 y además 1 de cada 6 de lo que queda.
  return out.filter((_, i) => i % 4 !== 3).filter((_, i) => i % 6 !== 5).map((t, i) => ({ ...t, id: i }))
}

export const TREES: readonly TreeInst[] = buildTrees()
