import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PROFILE } from '../../data/profile'
import { NAME_CENTER, NAME_YAW } from '../../lib/layout'
import { live } from '../../lib/state'
import * as sfx from '../../lib/sfx'
import { terrainHeight } from '../../lib/terrain'

/* ───────────── Letras de molde, gruesas y redondeadas ───────────── */

const T = 0.25 // grosor del trazo (la letra mide 1 de alto)
const SIZE = 2.5 // alto final en unidades de mundo
const DEPTH = 0.42
const GAP = 0.2
const SPACE = 0.5

type Pt = [number, number]
const poly = (pts: Pt[]) => {
  const s = new THREE.Shape()
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  return s
}

interface Glyph {
  w: number
  shapes: THREE.Shape[]
}

function makeGlyph(ch: string): Glyph | null {
  switch (ch) {
    case 'H': {
      const w = 0.8
      return { w, shapes: [poly([[0, 0], [T, 0], [T, 0.5 - T / 2], [w - T, 0.5 - T / 2], [w - T, 0], [w, 0], [w, 1], [w - T, 1], [w - T, 0.5 + T / 2], [T, 0.5 + T / 2], [T, 1], [0, 1]])] }
    }
    case 'L': {
      const w = 0.62
      return { w, shapes: [poly([[0, 0], [w, 0], [w, T], [T, T], [T, 1], [0, 1]])] }
    }
    case 'E':
    case 'É': {
      const w = 0.64
      const shapes = [poly([[0, 0], [w, 0], [w, T], [T, T], [T, 0.5 - T / 2], [w - 0.08, 0.5 - T / 2], [w - 0.08, 0.5 + T / 2], [T, 0.5 + T / 2], [T, 1 - T], [w, 1 - T], [w, 1], [0, 1]])]
      if (ch === 'É') shapes.push(poly([[w * 0.38, 1.1], [w * 0.38 + 0.17, 1.1], [w * 0.38 + 0.33, 1.34], [w * 0.38 + 0.15, 1.34]]))
      return { w, shapes }
    }
    case 'Z': {
      const w = 0.74
      const k = T * 1.4
      return { w, shapes: [poly([[0, 1], [w, 1], [w, 1 - T], [k, T], [w, T], [w, 0], [0, 0], [0, T], [w - k, 1 - T], [0, 1 - T]])] }
    }
    case 'N': {
      const w = 0.82
      return { w, shapes: [poly([[0, 0], [T, 0], [T, 0.6], [w - T, 0], [w, 0], [w, 1], [w - T, 1], [w - T, 0.4], [T, 1], [0, 1]])] }
    }
    case 'V': {
      const w = 0.86
      const t1 = T * 1.1
      return { w, shapes: [poly([[0, 1], [t1, 1], [w / 2, 0.34], [w - t1, 1], [w, 1], [w / 2 + 0.18, 0], [w / 2 - 0.18, 0]])] }
    }
    case 'A': {
      const w = 0.86
      const a = T * 0.55
      const L = (y: number) => (w / 2 - a) * y
      const R = (y: number) => w - (w / 2 - a) * y
      const yb = 0.17
      const yt = 0.37
      const ym = (w - 2 * T) / (w - 2 * a)
      const outer = poly([[0, 0], [T, 0], [L(yb) + T, yb], [R(yb) - T, yb], [w - T, 0], [w, 0], [w / 2 + a, 1], [w / 2 - a, 1]])
      outer.holes.push(new THREE.Path([new THREE.Vector2(L(yt) + T, yt), new THREE.Vector2(R(yt) - T, yt), new THREE.Vector2(w / 2, ym)]))
      return { w, shapes: [outer] }
    }
    case 'J': {
      const w = 0.78
      const xc = w - T / 2
      const R = 0.2
      const ry = 0.33
      const cx = xc - R
      const ro = R + T / 2
      const ri = R - T / 2
      const s = new THREE.Shape()
      s.moveTo(xc + T / 2, 1)
      s.lineTo(xc + T / 2, ry)
      s.absarc(cx, ry, ro, 0, -Math.PI, true)
      s.lineTo(cx - ro, ry + 0.13)
      s.lineTo(cx - ri, ry + 0.13)
      s.lineTo(cx - ri, ry)
      s.absarc(cx, ry, ri, -Math.PI, 0, false)
      s.lineTo(xc - T / 2, 1)
      s.closePath()
      return { w, shapes: [s] }
    }
    default:
      return null
  }
}

/** Letra extruida con bisel redondeado y centrada sobre su base. */
function glyphGeometry(g: Glyph) {
  const parts = g.shapes.map((s) =>
    new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 3, curveSegments: 14 }),
  )
  const geo = parts.length > 1 ? mergeGeometries(parts, false) : parts[0]
  geo.scale(SIZE, SIZE, SIZE)
  geo.translate((-g.w * SIZE) / 2, 0, (-DEPTH * SIZE) / 2)
  geo.computeVertexNormals()
  return geo
}

interface Letter {
  ch: string
  index: number
  r: number
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

/**
 * Tu nombre en letras grandes y suaves, de pie en el centro del mundo.
 * Al chocarlas con el Jeep se caen, ruedan y suenan (golpe + una nota distinta por letra);
 * pasados unos segundos se levantan solas y vuelven a su lugar.
 */
export function NameLetters() {
  const name = PROFILE.name.toUpperCase()

  const { letters, geos } = useMemo(() => {
    const geos = new Map<string, THREE.BufferGeometry>()
    const items: { ch: string; w: number }[] = []
    for (const ch of name) {
      const g = makeGlyph(ch)
      if (g) {
        if (!geos.has(ch)) geos.set(ch, glyphGeometry(g))
        items.push({ ch, w: g.w * SIZE })
      } else {
        items.push({ ch: ' ', w: SPACE * SIZE })
      }
    }
    const total = items.reduce((s, it) => s + it.w, 0) + GAP * SIZE * (items.length - 1)
    const dx = Math.cos(NAME_YAW)
    const dz = -Math.sin(NAME_YAW)
    const letters: Letter[] = []
    let cursor = -total / 2
    let note = 0
    items.forEach((it) => {
      const mid = cursor + it.w / 2
      cursor += it.w + GAP * SIZE
      if (it.ch === ' ') return
      const hx = NAME_CENTER[0] + dx * mid
      const hz = NAME_CENTER[1] + dz * mid
      letters.push({ ch: it.ch, index: note++, r: Math.max(0.9, it.w / 2), home: [hx, hz], x: hx, z: hz, vx: 0, vz: 0, y: 0, vy: 0, tilt: 0, omega: 0, dir: 0, cooldown: 0, rest: 0, returning: 0 })
    })
    return { letters, geos }
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
          if (d < 1.15 + L.r) {
            const nx = dx / (d || 1)
            const nz = dz / (d || 1)
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
            L.omega = L.omega > 1.2 ? -L.omega * 0.22 : 0
          } else if (L.tilt <= 0) {
            L.tilt = 0
            L.omega = 0
          }
          if (L.tilt < 1.5 && L.omega > 0) L.omega += 4 * dt
        }
        if (L.tilt > 1.4 && Math.hypot(L.vx, L.vz) < 0.2) {
          L.rest += dt
          if (L.rest > 7) L.returning = 1
        }
      } else {
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
            <meshStandardMaterial color="#cfe3ee" emissive="#3a5f78" emissiveIntensity={0.18} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
