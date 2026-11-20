import { useEffect, useRef, useState } from 'react'

interface Props {
  ready: boolean
}

const MIN_MS = 2800
const BEAN = 'M100 22 C150 22 172 78 172 132 C172 192 142 238 100 238 C58 238 28 192 28 132 C28 78 50 22 100 22 Z'
const CREASE = 'M100 30 C70 80 130 120 98 160 C74 190 118 214 100 232'

/**
 * Pantalla de carga: un grano de café que se llena de luz de atardecer (oro → naranja → carmesí → magenta)
 * sobre un cielo rojo con la silueta de un poste y sus cables.
 */
export function Loader({ ready }: Props) {
  const [p, setP] = useState(0)
  const [gone, setGone] = useState(false)
  const t0 = useRef(performance.now())
  const readyRef = useRef(ready)
  readyRef.current = ready
  const done = p >= 0.999

  useEffect(() => {
    let raf = 0
    let cur = 0
    const tick = () => {
      const el = performance.now() - t0.current
      const finished = readyRef.current && el > MIN_MS
      const target = finished ? 1 : 0.92 * (1 - Math.exp(-el / 1500))
      cur += (target - cur) * (finished ? 0.12 : 0.06)
      if (finished && cur > 0.995) cur = 1
      setP(cur)
      if (cur < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setGone(true), 1100)
    return () => clearTimeout(t)
  }, [done])

  if (gone) return null

  const fillY = 250 - p * 236

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden text-[#fff1dc] transition-opacity duration-1000 ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(180deg,#3b1747 0%,#a8243a 34%,#f0602a 64%,#ffb13b 88%,#3a1218 100%)' }}
    >
      {/* Resplandor del sol detrás del grano */}
      <div
        className="absolute left-1/2 top-[56%] size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, rgba(255,214,120,${0.25 + p * 0.55}) 0%, rgba(255,120,60,0) 70%)` }}
      />

      {/* Poste y cables contra el cielo, como en la foto del atardecer */}
      <svg className="absolute inset-x-0 bottom-0 h-[34vh] w-full opacity-80" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden>
        <g stroke="#2a0f18" fill="none" strokeWidth="1.6">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M0 ${60 + i * 14} Q 250 ${110 + i * 22} 500 ${70 + i * 14} T 1000 ${50 + i * 16}`} />
          ))}
          <path d="M0 250 L1000 250" strokeWidth="26" />
        </g>
        <g fill="#2a0f18">
          <rect x="196" y="40" width="9" height="230" />
          <rect x="178" y="58" width="46" height="5" />
          <rect x="780" y="64" width="9" height="206" />
          <rect x="762" y="80" width="46" height="5" />
        </g>
      </svg>

      <svg viewBox="0 0 200 260" className="relative h-[42vmin] min-h-[220px] drop-shadow-[0_0_28px_rgba(255,160,70,0.65)]" aria-hidden>
        <defs>
          <clipPath id="bean-clip">
            <path d={BEAN} />
          </clipPath>
          <linearGradient id="bean-glow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd35a" />
            <stop offset="0.35" stopColor="#ff8a2f" />
            <stop offset="0.7" stopColor="#d6283a" />
            <stop offset="1" stopColor="#8a2a78" />
          </linearGradient>
        </defs>
        <g transform="rotate(-18 100 130)">
          {/* Grano vacío */}
          <path d={BEAN} fill="rgba(40,14,20,0.55)" />
          {/* Luz que sube */}
          <g clipPath="url(#bean-clip)">
            <g style={{ transform: `translateY(${fillY}px)`, transition: 'none' }}>
              <rect x="0" y="0" width="200" height="300" fill="url(#bean-glow)" />
              <path className="bean-wave" d="M-100 0 Q-75 -9 -50 0 T0 0 T50 0 T100 0 T150 0 T200 0 T250 0 T300 0 V-14 H-100 Z" fill="#ffe9a8" opacity="0.85" />
            </g>
          </g>
          {/* Contorno y pliegue del grano */}
          <path d={BEAN} fill="none" stroke="#fff1dc" strokeOpacity="0.9" strokeWidth="3" />
          <path d={CREASE} fill="none" stroke="#2a0f18" strokeOpacity="0.85" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>

      <div className="relative mt-8 text-center">
        <p className="font-display text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_12px_rgba(60,10,20,0.6)]">
          Tostando la luz del atardecer…
        </p>
        <p className="mt-1 text-sm text-[#fff1dc]/80">{Math.round(p * 100)}% · subiendo a la finca</p>
      </div>
    </div>
  )
}
