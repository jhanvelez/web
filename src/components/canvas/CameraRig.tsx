import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'

const ELEVATION = 0.74 // rad (~42°): ángulo fijo, como en un diorama
const DIST_DEFAULT = 42
const DIST_MIN = 15
const DIST_MAX = 85
const DIST_FOCUS = 20
const DIST_INTRO = 13
const INTRO_DIST = 160

interface Props {
  /** Pantalla de bienvenida: la cámara se acerca al arriero como a una mascota. */
  intro: boolean
  /** Con un proyecto abierto la cámara se acerca y desplaza el encuadre hacia el lado libre. */
  focused: boolean
}

/**
 * Cámara fija con seguimiento: ángulo constante detrás del arriero, amortiguada.
 * Rueda del mouse = zoom; Q / E = girar 45° (el movimiento del arriero es relativo a la pantalla).
 * Arranca muy lejos y se acerca en una entrada suave.
 */
export function CameraRig({ focused, intro }: Props) {
  const { camera, size, gl } = useThree()
  const az = useRef({ cur: Math.PI / 4, goal: Math.PI / 4 })
  const dist = useRef({ cur: INTRO_DIST, goal: DIST_DEFAULT })
  const focus = useRef(new THREE.Vector3(0, 2, 0))
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      dist.current.goal = THREE.MathUtils.clamp(dist.current.goal * (1 + Math.sign(e.deltaY) * 0.08), DIST_MIN, DIST_MAX)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') az.current.goal += Math.PI / 4
      if (e.key === 'e' || e.key === 'E') az.current.goal -= Math.PI / 4
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const a = az.current
    const d = dist.current
    a.cur = THREE.MathUtils.damp(a.cur, a.goal, 5, dt)
    const goal = intro ? DIST_INTRO : focused ? Math.min(d.goal, DIST_FOCUS) : d.goal
    d.cur = THREE.MathUtils.damp(d.cur, goal, d.cur > 60 ? 1.6 : 2.6, dt)
    live.camDist = d.cur
    live.camAz = a.cur

    const p = live.player
    const target = new THREE.Vector3(p.x, terrainHeight(p.x, p.z) + 1, p.z)
    focus.current.lerp(target, 1 - Math.exp(-dt * 4.5))

    const horizontal = Math.cos(ELEVATION) * d.cur
    camera.position.set(
      focus.current.x + Math.sin(a.cur) * horizontal,
      focus.current.y + Math.sin(ELEVATION) * d.cur,
      focus.current.z + Math.cos(a.cur) * horizontal,
    )
    camera.lookAt(focus.current)

    // Con el panel abierto, el arriero queda en la parte libre de la pantalla.
    const cam = camera as THREE.PerspectiveCamera
    const wide = size.width >= 768
    // Panel a la derecha → el arriero va a la izquierda; tarjeta de bienvenida a la izquierda → va a la derecha.
    const tx = intro && wide ? -Math.min(420, size.width * 0.36) / 2 : focused && wide ? Math.min(440, size.width * 0.45) / 2 : 0
    const ty = (focused || intro) && !wide ? size.height * 0.2 : 0
    const o = offset.current
    const k = 1 - Math.exp(-dt * 5)
    o.x += (tx - o.x) * k
    o.y += (ty - o.y) * k
    if (Math.abs(o.x) + Math.abs(o.y) > 0.5) cam.setViewOffset(size.width, size.height, o.x, o.y, size.width, size.height)
    else if (cam.view?.enabled) cam.clearViewOffset()
  })

  return null
}
