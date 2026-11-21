import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PROFILE } from '../../data/profile'
import { NAME_CENTER, NAME_YAW } from '../../lib/layout'
import { live } from '../../lib/state'
import * as sfx from '../../lib/sfx'
import { terrainHeight } from '../../lib/terrain'

/** Fuente de bloques 5×7 (solo las letras del nombre). Un "#" es un cubo. */
const FONT: Record<string, string[]> = {
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  É: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
}
const PX = 0.3 // tamaño de cada cubo: letra de ≈1.5 × 2.1 × 0.34, a escala del Jeep
const SPACING = 2.05
const COLORS = ['#fcd116', '#2f6bd8', '#ce1126'] // amarillo, azul y rojo de la bandera

function glyphGeometry(ch: string) {
  const rows = FONT[ch]
  const parts: THREE.BufferGeometry[] = []
  rows.forEach((row, r) => {
    for (let c = 0; c < 5; c++) {
      if (row[c] !== '#') continue
      const b = new THREE.BoxGeometry(PX * 0.94, PX * 0.94, PX * 1.1)
      b.translate((c - 2) * PX, (6 - r) * PX + PX / 2, 0)
      parts.push(b)
    }
  })
  if (ch === 'É') {
    const tick = new THREE.BoxGeometry(PX * 0.94, PX * 0.94, PX * 1.1)
    tick.rotateZ(-0.5)
    tick.translate(0.5 * PX, 7 * PX + PX * 0.9, 0)
    parts.push(tick)
  }
  return mergeGeometries(parts, false)
}

interface Letter {
  ch: string
  index: number
  home: [number, number]
  x: number
  z: number
  vx: number
  vz: number
  y: number
  vy: number
  tilt: number
  omega: number
  dir: number
  cooldown: number
  rest: number
  returning: number
}

const RADIUS = 0.85

/**
 * "JHAN VÉLEZ" en letras de bloques de colores de la bandera, de pie en el centro del mundo.
 * Al chocarlas con el Jeep se caen, ruedan y suenan (golpe + una nota distinta por letra);
 * pasados unos segundos se levantan solas y vuelven a su lugar.
 */
export function NameLetters() {
  const name = PROFILE.name.toUpperCase()
  const geos = useMemo(() => {
    const m = new Map<string, THREE.BufferGeometry>()
    for (const ch of name) if (FONT[ch] && !m.has(ch)) m.set(ch, glyphGeometry(ch))
    return m
  }, [name])

  const letters = useMemo<Letter[]>(() => {
    const dx = Math.cos(NAME_YAW)
    const dz = -Math.sin(NAME_YAW)
    const chars = [...name]
    const out: Letter[] = []
    let note = 0
    chars.forEach((ch, i) => {
      if (!FONT[ch]) return
      const o = (i - (chars.length - 1) / 2) * SPACING
      const hx = NAME_CENTER[0] + dx * o
      const hz = NAME_CENTER[1] + dz * o
      out.push({ ch, index: note++, home: [hx, hz], x: hx, z: hz, vx: 0, vz: 0, y: 0, vy: 0, tilt: 0, omega: 0, dir: 0, cooldown: 0, rest: 0, returning: 0 })
    })
    return out
  }, [name])

  const refs = useRef<(THREE.Group | null)[]>([])
  const qYaw = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), NAME_YAW), [])
  const qTilt = useMemo(() => new THREE.Quaternion(), [])
  const axis = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const p = live.player
    const sn = Math.sin(p.yaw)
    const cs = Math.cos(p.yaw)
    const speed = Math.abs(p.speed)

    letters.forEach((L, i) => {
      const g = refs.current[i]
      if (!g) return
      L.cooldown -= dt

      // Choque con el Jeep: dos círculos (centro y morro).
      if (L.cooldown <= 0 && speed > 0.8 && L.returning === 0) {
        const fwd = Math.sign(p.speed)
        for (const reach of [0, 1.5 * fwd]) {
          const jx = p.x + sn * reach
          const jz = p.z + cs * reach
          const dx = L.x - jx
          const dz = L.z - jz
          const d = Math.hypot(dx, dz)
          if (d < 1.15 + RADIUS) {
            const nx = dx / (d || 1)
            const nz = dz / (d || 1)
            // Empuje: mezcla la dirección del Jeep con la normal del choque.
            const px = nx * 0.5 + (p.vx / (speed || 1)) * 0.5
            const pz = nz * 0.5 + (p.vz / (speed || 1)) * 0.5
            const m = Math.hypot(px, pz) || 1
            L.vx = (px / m) * speed * 0.85
            L.vz = (pz / m) * speed * 0.85
            L.vy = 2.2 + speed * 0.25
            L.omega = 2.5 + speed * 0.55
            L.dir = Math.atan2(px, pz)
            L.cooldown = 0.35
            L.rest = 0
            sfx.letterHit(L.index, speed / 10)
            live.hitSlow = 0.9
            break
          }
        }
      }

      // Física sencilla: vuelo, fricción y vuelco hasta quedar tumbada.
      if (L.returning === 0) {
        L.x += L.vx * dt
        L.z += L.vz * dt
        const f = Math.exp(-2.2 * dt)
        L.vx *= f
        L.vz *= f
        L.vy -= 15 * dt
        L.y = Math.max(0, L.y + L.vy * dt)
        if (L.y === 0 && L.vy < 0) L.vy = 0
        if (L.omega !== 0 || L.tilt > 0) {
          L.tilt += L.omega * dt
          if (L.tilt >= 1.5) {
            L.tilt = 1.5
            L.omega = L.omega > 1.2 ? -L.omega * 0.22 : 0 // un rebote y se queda
          } else if (L.tilt <= 0) {
            L.tilt = 0
            L.omega = 0
          }
          if (L.tilt < 1.5 && L.omega > 0) L.omega += 4 * dt // la gravedad la tumba
        }
        if (L.tilt > 1.4 && Math.hypot(L.vx, L.vz) < 0.2) {
          L.rest += dt
          if (L.rest > 7) L.returning = 1
        }
      } else {
        // Se levanta y vuelve a su sitio.
        const k = 1 - Math.exp(-dt * 3)
        L.x += (L.home[0] - L.x) * k
        L.z += (L.home[1] - L.z) * k
        L.tilt *= 1 - k
        L.y = Math.max(0, L.y * (1 - k))
        if (Math.hypot(L.x - L.home[0], L.z - L.home[1]) < 0.03 && L.tilt < 0.02) {
          L.x = L.home[0]
          L.z = L.home[1]
          L.tilt = 0
          L.returning = 0
          L.rest = 0
        }
      }

      g.position.set(L.x, terrainHeight(L.x, L.z) + L.y, L.z)
      axis.set(Math.cos(L.dir), 0, -Math.sin(L.dir))
      qTilt.setFromAxisAngle(axis, L.tilt)
      g.quaternion.copy(qTilt).multiply(qYaw)
    })
  })

  return (
    <group>
      {letters.map((L, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} position={[L.x, terrainHeight(L.x, L.z), L.z]} quaternion={qYaw}>
          <mesh geometry={geos.get(L.ch)} castShadow receiveShadow>
            <meshStandardMaterial color={COLORS[i % 3]} emissive={COLORS[i % 3]} emissiveIntensity={0.12} roughness={0.55} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}
