import type { HotspotConfig, Project } from '../types/portfolio'
import { PROFILE } from './profile'

const REPOS = `${PROFILE.githubUrl}?tab=repositories`

/**
 * TODO: contenido de ejemplo. Reemplaza título, descripción, stack y URLs por tus proyectos reales.
 * Si pones `repoName` (nombre exacto del repo en GitHub), el drawer muestra estrellas,
 * lenguaje y último push en vivo, y `repoUrl` puede apuntar directo al repo.
 */
export const PROJECTS: readonly Project[] = [
  {
    id: 'plataforma-fullstack',
    title: 'Plataforma Full-Stack',
    tagline: 'La casa grande: producto web de punta a punta.',
    description:
      'Plataforma web completa: interfaz React, API REST, autenticación, base de datos relacional y despliegue automatizado. Reemplaza este texto con el problema que resolvió y tu rol.',
    highlights: ['Autenticación y roles', 'API REST documentada', 'CI/CD y despliegue en la nube'],
    category: 'fullstack',
    stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    repoUrl: REPOS,
  },
  {
    id: 'microservicios',
    title: 'Arquitectura de Microservicios',
    tagline: 'El Willys que mueve la carga: servicios pequeños, desacoplados.',
    description:
      'Sistema distribuido con servicios independientes, comunicación por eventos y un API gateway. Reemplaza este texto con tu caso real.',
    highlights: ['API Gateway', 'Mensajería asíncrona', 'Contenedores y observabilidad'],
    category: 'microservices',
    stack: ['Node.js', 'Docker', 'RabbitMQ', 'Redis', 'PostgreSQL'],
    repoUrl: REPOS,
  },
  {
    id: 'app-movil',
    title: 'App Móvil',
    tagline: 'El costal de café: una app lista para llevar en el bolsillo.',
    description:
      'Aplicación móvil multiplataforma con modo offline y sincronización. Reemplaza este texto con tu app real.',
    highlights: ['Modo offline', 'Notificaciones push', 'Publicada en tiendas'],
    category: 'mobile',
    stack: ['React Native', 'TypeScript', 'Expo', 'REST'],
    repoUrl: REPOS,
  },
  {
    id: 'open-source',
    title: 'Repositorios destacados',
    tagline: 'El letrero de la finca: todo mi código abierto en GitHub.',
    description: 'Una muestra de mis repositorios públicos, cargados en vivo desde la API de GitHub.',
    category: 'oss',
    stack: ['Git', 'GitHub Actions', 'Open Source'],
    repoUrl: PROFILE.githubUrl,
  },
  {
    id: 'analitica',
    title: 'Dashboards y Analítica',
    tagline: 'Desde el mirador: los datos a la vista.',
    description:
      'Paneles de métricas y reportes para tomar decisiones. Reemplaza este texto con tu proyecto de datos.',
    highlights: ['Visualización interactiva', 'Reportes programados'],
    category: 'data',
    stack: ['React', 'D3', 'Python', 'SQL'],
    repoUrl: REPOS,
  },
]

/** Coordenadas (x, z) sobre el terreno. Las cámaras son offsets relativos al ancla del objeto. */
export const HOTSPOTS: readonly HotspotConfig[] = [
  {
    id: 'hs-casa',
    projectId: 'plataforma-fullstack',
    kind: 'house',
    label: 'Plataforma Full-Stack',
    position: [0, 0],
    rotationY: 0,
    markerHeight: 5.9,
    cameraOffset: [6.8, 4.6, 14],
    targetOffset: [0, 2.6, 0],
  },
  {
    id: 'hs-jeep',
    projectId: 'microservicios',
    kind: 'jeep',
    label: 'Microservicios',
    position: [-5.6, 4.6],
    rotationY: 0.8,
    markerHeight: 2.1,
    cameraOffset: [3.6, 1.9, 3.9],
    targetOffset: [0, 0.6, 0],
  },
  {
    id: 'hs-costal',
    projectId: 'app-movil',
    kind: 'sack',
    label: 'App Móvil',
    position: [-4.5, 1.6],
    rotationY: 0.5,
    markerHeight: 1.6,
    cameraOffset: [3.3, 2.0, 4.4],
    targetOffset: [0, 0.4, 0],
  },
  {
    id: 'hs-letrero',
    projectId: 'open-source',
    kind: 'sign',
    label: 'Repositorios',
    position: [5.0, 5.4],
    rotationY: 0.6,
    markerHeight: 3.0,
    cameraOffset: [2.2, 1.4, 3.6],
    targetOffset: [0, 1.1, 0],
  },
  {
    id: 'hs-mirador',
    projectId: 'analitica',
    kind: 'viewpoint',
    label: 'Dashboards',
    position: [-6.2, -3.8],
    rotationY: 0.6,
    markerHeight: 3.9,
    cameraOffset: [-4.2, 3.0, 5.2],
    targetOffset: [0, 1.4, 0],
  },
]

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)
