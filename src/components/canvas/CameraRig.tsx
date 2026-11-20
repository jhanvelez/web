import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CameraFocus, Vec3 } from '../../types/portfolio'

export const HOME: CameraFocus = { position: [15, 9.5, 17], target: [0, 2.4, 0] }

interface Props {
  focus: CameraFocus | null
}

/**
 * OrbitControls acotado + transiciones suaves (amortiguación exponencial) hacia cada hotspot.
 * Si el usuario toca los controles durante una transición, se cancela y manda el usuario.
 * Con el drawer abierto, desplaza el encuadre (view offset) para que el objeto quede visible.
 */
export function CameraRig({ focus }: Props) {
  const controls = useRef<ElementRef<typeof OrbitControls>>(null)
  const { camera, size } = useThree()
  const animating = useRef(true)
  const [touched, setTouched] = useState(false)
  const offset = useRef({ x: 0, y: 0 })

  const goal = focus ?? HOME
  const goalPos = useMemo(() => new THREE.Vector3(...(goal.position as Vec3)), [goal])
  const goalTarget = useMemo(() => new THREE.Vector3(...(goal.target as Vec3)), [goal])

  useEffect(() => {
    animating.current = true
  }, [goal])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 3.2)

    if (animating.current) {
      camera.position.lerp(goalPos, k)
      c.target.lerp(goalTarget, k)
      if (camera.position.distanceTo(goalPos) < 0.04 && c.target.distanceTo(goalTarget) < 0.04) {
        animating.current = false
      }
    }

    // Desplaza el encuadre cuando el drawer ocupa parte de la pantalla.
    const wide = size.width >= 768
    const tx = focus && wide ? Math.min(440, size.width * 0.45) / 2 : 0
    const ty = focus && !wide ? size.height * 0.22 : 0
    const o = offset.current
    o.x += (tx - o.x) * k
    o.y += (ty - o.y) * k
    if (Math.abs(o.x) + Math.abs(o.y) > 0.5 || tx + ty > 0) {
      ;(camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, o.x, o.y, size.width, size.height)
    } else if ((camera as THREE.PerspectiveCamera).view?.enabled) {
      ;(camera as THREE.PerspectiveCamera).clearViewOffset()
    }

    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      minDistance={2.5}
      maxDistance={34}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 2 - 0.05}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
      autoRotate={!focus && !touched}
      autoRotateSpeed={0.35}
      onStart={() => {
        animating.current = false
        setTouched(true)
      }}
    />
  )
}
