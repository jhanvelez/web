import { useRef, useState, type ReactNode } from 'react'
import { Html, useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Briefcase, Coffee, Eye, Home, Smartphone, type LucideIcon } from 'lucide-react'
import { Github } from '../ui/BrandIcons'
import type { HotspotKind, Vec3 } from '../../types/portfolio'

type IconComp = LucideIcon | typeof Github
const ICONS: Record<HotspotKind, IconComp> = {
  house: Home,
  jeep: Briefcase,
  sack: Smartphone,
  sign: Github,
  viewpoint: Eye,
  cafe: Coffee,
}

interface Props {
  kind: HotspotKind
  label: string
  position: Vec3
  rotationY?: number
  markerHeight: number
  active: boolean
  /** El arriero está cerca: se muestra la etiqueta con la tecla F. */
  near?: boolean
  onSelect: () => void
  children: ReactNode
}

/**
 * Envuelve un objeto de la escena y lo vuelve interactivo:
 * hover → cursor pointer + resalte + etiqueta; clic → onSelect. El marcador es un <button>
 * HTML (accesible por teclado) anclado sobre el objeto.
 */
export function Hotspot({ kind, label, position, rotationY = 0, markerHeight, active, near = false, onSelect, children }: Props) {
  const [hovered, setHovered] = useState(false)
  const body = useRef<THREE.Group>(null)
  const marker = useRef<THREE.Group>(null)
  const phase = useRef(Math.random() * 6)
  useCursor(hovered && !active)
  const Icon = ICONS[kind]

  useFrame(({ clock }, dt) => {
    if (body.current) {
      const target = hovered && !active ? 1.045 : 1
      body.current.scale.setScalar(THREE.MathUtils.damp(body.current.scale.x, target, 10, dt))
    }
    if (marker.current) marker.current.position.y = markerHeight + Math.sin(clock.elapsedTime * 2 + phase.current) * 0.07
  })

  return (
    <group position={position as unknown as THREE.Vector3Tuple} rotation={[0, rotationY, 0]}>
      <group
        ref={body}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {children}
      </group>

      <group ref={marker} position={[0, markerHeight, 0]} rotation={[0, -rotationY, 0]}>
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: active ? 'none' : 'auto' }}>
          <button
            type="button"
            className={`hotspot-btn ${hovered ? 'is-hovered' : ''} ${active ? 'is-active' : ''} ${near ? 'is-near' : ''}`}
            aria-label={`Ver proyecto: ${label}`}
            onClick={onSelect}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            <span className="hotspot-pulse" />
            <span className="hotspot-core">
              <Icon size={16} strokeWidth={2.4} />
            </span>
            <span className="hotspot-label">{label}{near && <kbd className="hotspot-key">F</kbd>}</span>
          </button>
        </Html>
      </group>
    </group>
  )
}
