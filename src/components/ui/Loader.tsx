import { useEffect, useRef, useState } from 'react'
import { JEEP_COLOR } from '../../lib/theme'
import { GridBackdrop } from './GridBackdrop'

interface Props {
  ready: boolean
  /** Se llama una vez, cuando la carga llega al 100 %. */
  onDone: () => void
}

const MIN_MS = 2200
const CX = 200
const CY = 120
const RX = 170
const RY = 95
const START = 130 // grados: el arco arranca abajo a la izquierda y gira en sentido horario

const pt = (deg: number): [number, number] => [CX + RX * Math.cos((deg * Math.PI) / 180), CY + RY * Math.sin((deg * Math.PI) / 180)]
const [x0, y0] = pt(START)
const [x1, y1] = pt(START + 180)
const ARC = `M${x0} ${y0} A${RX} ${RY} 0 1 1 ${x1} ${y1} A${RX} ${RY} 0 1 1 ${x0} ${y0}`

/**
 * Carga: piso de cruces en perspectiva y un arco luminoso que se dibuja con el progreso.
 * El brillo toma el color (aleatorio) del Jeep que verás al empezar.
 */
export function Loader({ ready, onDone }: Props) {
  const [p, setP] = useState(0)
  const [gone, setGone] = useState(false)
  const t0 = useRef(performance.now())
  const readyRef = useRef(ready)
  readyRef.current = ready
  const fired = useRef(false)
  const done = p >= 0.999

  useEffect(() => {
    let raf = 0
    let cur = 0
    const tick = () => {
      const el = performance.now() - t0.current
      const finished = readyRef.current && el > MIN_MS
      const target = finished ? 1 : 0.92 * (1 - Math.exp(-el / 1400))
      cur += (target - cur) * (finished ? 0.14 : 0.06)
      if (finished && cur > 0.995) cur = 1
      setP(cur)
      if (cur < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!done) return
    if (!fired.current) {
      fired.current = true
      onDone()
    }
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [done, onDone])

  if (gone) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className={`fixed inset-0 z-50 text-white transition-opacity duration-700 ${done ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <GridBackdrop />
      <div className="absolute inset-0 grid place-items-center">
        <svg viewBox="0 0 400 240" className="w-[min(72vw,640px)] overflow-visible" aria-hidden>
          <defs>
            <filter id="arc-glow" x="-30%" y="-60%" width="160%" height="220%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Arco de luz del color del Jeep */}
          <path d={ARC} pathLength={100} fill="none" stroke={JEEP_COLOR} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${p * 100} 200`} opacity="0.55" filter="url(#arc-glow)" />
          <path d={ARC} pathLength={100} fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeDasharray={`${p * 100} 200`} />
        </svg>
        <p className="absolute bottom-[18%] font-mono text-xs tracking-[0.3em] text-white/55">CARGANDO · {Math.round(p * 100)}%</p>
      </div>
    </div>
  )
}
