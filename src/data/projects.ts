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
    tagline: 'El letrero del camino: todo mi código abierto en GitHub.',
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
  {
    id: 'contacto',
    title: 'Tomemos un tinto',
    tagline: 'El rincón del café: conversemos de tu próximo proyecto.',
    description:
      'Estoy abierto a nuevos proyectos y colaboraciones. Escríbeme por LinkedIn o revisa mi código en GitHub y armamos algo bueno, con tinto de por medio.',
    category: 'contact',
    stack: [],
    repoUrl: PROFILE.githubUrl,
  },
]

/**
 * Cada hotspot se coloca en polares alrededor de una plaza (A, B, C = montañas, K = café).
 * Para A/B/C el ángulo es relativo al camino que baja al café (0° = justo sobre el camino).
 */
export const HOTSPOTS: readonly HotspotConfig[] = [
  {
    id: 'hs-casa',
    projectId: 'plataforma-fullstack',
    kind: 'house',
    label: 'Plataforma Full-Stack',
    place: { type: 'house' },
    rotationY: 0,
    standDistance: 3.4,
    markerHeight: 5.0,
  },
  {
    id: 'hs-jeep',
    projectId: 'microservicios',
    kind: 'jeep',
    label: 'Microservicios',
    place: { type: 'polar', around: 'B', radius: 4.2, angleDeg: 30 },
    rotationY: Math.PI - 0.6,
    standDistance: 2.4,
    markerHeight: 2.1,
  },
  {
    id: 'hs-costal',
    projectId: 'app-movil',
    kind: 'sack',
    label: 'App Móvil',
    place: { type: 'polar', around: 'A', radius: 5.4, angleDeg: -30 },
    rotationY: 0.5,
    standDistance: 1.8,
    markerHeight: 1.6,
  },
  {
    id: 'hs-letrero',
    projectId: 'open-source',
    kind: 'sign',
    label: 'Repositorios',
    place: { type: 'polar', around: 'K', radius: 9, angleDeg: 94 },
    rotationY: 0,
    standDistance: 1.8,
    markerHeight: 3.0,
  },
  {
    id: 'hs-mirador',
    projectId: 'analitica',
    kind: 'viewpoint',
    label: 'Dashboards',
    place: { type: 'polar', around: 'B', radius: 17, angleDeg: 110 },
    rotationY: Math.PI,
    standDistance: -2,
    markerHeight: 3.9,
  },
  {
    id: 'hs-cafe',
    projectId: 'contacto',
    kind: 'cafe',
    label: 'Café · Contacto',
    place: { type: 'polar', around: 'K', radius: 0, angleDeg: 0 },
    rotationY: 0,
    standDistance: 2.6,
    markerHeight: 3.6,
  },
]

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)
