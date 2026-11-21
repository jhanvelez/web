import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { JEEP_COLOR } from '../../lib/theme'
import { GridBackdrop } from './GridBackdrop'

interface Props {
  visible: boolean
  onStarted: () => void
}

const OPEN_MS = 1100

/**
 * "Haz clic para empezar": el mundo se ve por un círculo luminoso con el Jeep (del color del azar) y el resto
 * es el piso de cruces. Al hacer clic el círculo se expande hasta revelar todo el mundo.
 */
export function StartScreen({ visible, onStarted }: Props) {
  const [open, setOpen] = useState(0) // 0 = cerrado, 1 = todo revelado
  const [finished, setFinished] = useState(false)
  const [size, setSize] = useState({ w: 1280, h: 800 })
  const opening = useRef(false)
  const done = useRef(false)

  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const start = () => {
    if (opening.current || !visible) return
    opening.current = true
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / OPEN_MS)
      setOpen(1 - Math.pow(1 - k, 3)) // ease-out
      if (k < 1) requestAnimationFrame(tick)
      else if (!done.current) {
        done.current = true
        setFinished(true)
        onStarted()
      }
    }
    requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (finished || (!visible && !opening.current)) return null

  const base = Math.min(size.w, size.h) * 0.34
  const rx = base * (1 + open * 4.2)
  const ry = rx * 0.62
  const cy = '52%'
  const mask = `radial-gradient(ellipse ${rx}px ${ry}px at 50% ${cy}, transparent 98.5%, #000 100%)`
  const label = Math.max(0, 1 - open * 3)

  return (
    <div className="fixed inset-0 z-40 cursor-pointer select-none" onClick={start} role="button" tabIndex={0} aria-label="Hacer clic para empezar">
      <div className="absolute inset-0" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <GridBackdrop />
      </div>

      {/* Aro de luz del color del Jeep */}
      <div
        className="pointer-events-none absolute left-1/2 rounded-[50%] border-[5px] border-white"
        style={{
          top: cy,
          width: rx * 2,
          height: ry * 2,
          transform: 'translate(-50%, -50%)',
          opacity: 1 - Math.max(0, open - 0.7) / 0.3,
          boxShadow: `0 0 28px 6px ${JEEP_COLOR}, 0 0 80px 14px ${JEEP_COLOR}66, inset 0 0 30px 4px ${JEEP_COLOR}aa`,
        }}
      />

      {/* "Haz clic para empezar" con flecha y bocina, en letra manuscrita */}
      <div className="pointer-events-none absolute text-white" style={{ left: `calc(50% + ${rx * 0.62}px)`, top: `calc(${cy} - ${ry * 1.12}px)`, opacity: label }}>
        <svg viewBox="0 0 110 60" className="absolute -left-20 top-5 w-24 -rotate-6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden>
          <path d="M100 8 C 70 -4, 30 8, 12 40" />
          <path d="M12 40 l4 -14 M12 40 l14 -5" />
        </svg>
        <p className="font-hand text-[clamp(2.4rem,6vw,4.6rem)] font-bold leading-[0.9] tracking-wide drop-shadow-[0_0_14px_rgba(255,255,255,0.35)]">
          HAZ CLIC
          <br />
          PARA EMPEZAR
        </p>
        <Volume2 className="mt-2 ml-2" size={34} strokeWidth={1.6} />
      </div>
    </div>
  )
}
