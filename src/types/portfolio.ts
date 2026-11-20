export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]

export type HotspotKind = 'house' | 'jeep' | 'sack' | 'sign' | 'viewpoint' | 'cafe'

/** Plazas del mundo: tres montañas (A, B, C) y el café (K) en el valle central. */
export type PlazaId = 'A' | 'B' | 'C' | 'K'

export type Place =
  | { type: 'house' }
  /** Polares alrededor de una plaza. El ángulo es relativo a la dirección hacia el café (absoluto para 'K'). */
  | { type: 'polar'; around: PlazaId; radius: number; angleDeg: number }

export type ProjectCategory = 'fullstack' | 'microservices' | 'mobile' | 'oss' | 'data' | 'contact'

export interface Project {
  id: string
  title: string
  tagline: string
  description: string
  highlights?: readonly string[]
  category: ProjectCategory
  stack: readonly string[]
  repoUrl: string
  demoUrl?: string
  /** Nombre del repo en GitHub; si existe, el drawer se enriquece con datos en vivo. */
  repoName?: string
}

/**
 * Un punto interactivo de la escena, enlazado a un proyecto vía `projectId`.
 * La altura (y) se calcula sobre el terreno. Cámara y offsets están en el espacio LOCAL
 * del objeto (+z = frente), así que funcionan sin importar hacia dónde mire.
 */
export interface HotspotConfig {
  id: string
  projectId: Project['id']
  kind: HotspotKind
  label: string
  place: Place
  /** Giro extra en Y (radianes) sobre la orientación por defecto (mirando al centro de la plaza). */
  rotationY: number
  /** Distancia frente al objeto donde se para el arriero (negativa = detrás). */
  standDistance: number
  /** Altura del marcador sobre el ancla. */
  markerHeight: number
  /** Posición de la cámara, relativa al ancla y rotada con el objeto. */
  cameraOffset: Vec3
  /** Punto observado por la cámara, relativo al ancla y rotado con el objeto. */
  targetOffset: Vec3
}

export interface CameraFocus {
  position: Vec3
  target: Vec3
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  topics?: string[]
  fork: boolean
  archived: boolean
  pushed_at: string
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'
