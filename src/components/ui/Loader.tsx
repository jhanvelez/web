import { useEffect, useState } from 'react'

interface Props {
  ready: boolean
}

const MIN_MS = 1800

/** Pantalla de carga: la finca amanece mientras se compila la escena 3D. */
export function Loader({ ready }: Props) {
  const [minElapsed, setMinElapsed] = useState(false)
  const [gone, setGone] = useState(false)
  const done = ready && minElapsed

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [done])

  if (gone) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#2a1a10] text-[#f6ecd8] transition-opacity duration-700 ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <svg viewBox="0 0 120 80" className="h-24 w-36" aria-hidden>
        <circle cx="86" cy="26" r="11" fill="#f2b632" className="animate-pulse" />
        <path d="M0 80 L38 22 L62 52 L78 38 L120 80 Z" fill="#2f6b3a" />
        <path d="M0 80 L38 22 L52 42 L30 80 Z" fill="#3f8a4a" />
        <rect x="52" y="52" width="16" height="12" fill="#fbf6ea" />
        <path d="M49 53 L60 44 L71 53 Z" fill="#b8472f" />
        <rect x="58" y="57" width="4" height="7" fill="#c0392b" />
      </svg>
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold tracking-tight">Subiendo a la finca…</p>
        <p className="mt-1 text-sm text-[#f6ecd8]/70">Calentando el tinto y cargando la montaña</p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15">
        <div className="loader-bar h-full w-1/3 rounded-full bg-[#f2b632]" />
      </div>
    </div>
  )
}
