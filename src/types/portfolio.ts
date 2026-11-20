export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]

export type HotspotKind = 'house' | 'jeep' | 'sack' | 'sign' | 'viewpoint'

export type ProjectCategory = 'fullstack' | 'microservices' | 'mobile' | 'oss' | 'data'

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
 * Un punto interactivo de la escena. Se enlaza a un proyecto vía `projectId`.
 * La altura (y) del ancla se calcula sobre el terreno, así que solo se define (x, z).
 */
export interface HotspotConfig {
  id: string
  projectId: Project['id']
  kind: HotspotKind
  label: string
  /** Posición (x, z) sobre el terreno. */
  position: Vec2
  /** Rotación del objeto en Y (radianes). */
  rotationY: number
  /** Altura del marcador sobre el ancla. */
  markerHeight: number
  /** Posición de la cámara, relativa al ancla. */
  cameraOffset: Vec3
  /** Punto observado por la cámara, relativo al ancla. */
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
