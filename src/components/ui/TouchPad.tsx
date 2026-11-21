import { useEffect, useRef, useState } from 'react'
import { Coffee, Megaphone, Zap } from 'lucide-react'
import { input } from '../../lib/input'

const SIZE = 148
const THUMB = 62

/** Palanca analógica tipo consola: el giro y la aceleración dependen de cuánto la inclines. */
function Stick() {
  const base = useRef<HTMLDivElement>(null)
  const active = useRef<number | null>(null)
  const [thumb, setThumb] = useState({ x: 0, y: 0 })

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    setThumb({ x: dx, y: dy })
    // Zona muerta pequeña y respuesta suave.
    const dz = (v: number) => (Math.abs(v) < 0.12 ? 0 : v)
    input.setAnalog(dz(dx), -dz(dy))
  }
  const release = () => {
    active.current = null
    setThumb({ x: 0, y: 0 })
    input.setAnalog(0, 0)
  }

  return (
    <div
      ref={base}
      role="application"
      aria-label="Palanca de conducción"
      onPointerDown={(e) => {
        active.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed bottom-28 left-4 z-30 touch-none select-none rounded-full border-2 border-white/15 bg-[#243C4C]/60 backdrop-blur-md"
      style={{ width: SIZE, height: SIZE }}
    >
      {/* Marcas de dirección */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] text-white/25">
        <span className="absolute top-2">▲</span>
        <span className="absolute bottom-2">▼</span>
        <span className="absolute left-3">◀</span>
        <span className="absolute right-3">▶</span>
      </div>
      <div
        className="pointer-events-none absolute rounded-full bg-[#5289AD] shadow-[0_0_20px_rgba(255,180,84,0.5)]"
        style={{
          width: THUMB,
          height: THUMB,
          left: SIZE / 2 - THUMB / 2 + thumb.x * (SIZE / 2 - THUMB / 2),
          top: SIZE / 2 - THUMB / 2 + thumb.y * (SIZE / 2 - THUMB / 2),
        }}
      />
    </div>
  )
}

interface Props {
  canInteract: boolean
  onInteract: () => void
}

/** Controles táctiles: palanca analógica a la izquierda; pito, turbo e interactuar a la derecha. */
export function TouchPad({ canInteract, onInteract }: Props) {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    setCoarse(window.matchMedia('(pointer: coarse)').matches)
  }, [])
  if (!coarse) return null

  const btn =
    'grid size-14 touch-none select-none place-items-center rounded-full bg-[#243C4C]/70 text-[#9CC6E0] backdrop-blur-md active:bg-[#5289AD] active:text-[#F4FCFB]'
  return (
    <>
      <Stick />
      <div className="fixed bottom-28 right-4 z-30 flex flex-col items-center gap-3">
        <button type="button" aria-label="Interactuar" onClick={onInteract} disabled={!canInteract} className="grid size-16 place-items-center rounded-full bg-[#5289AD] text-[#F4FCFB] shadow-lg transition disabled:opacity-30">
          <Coffee />
        </button>
        <div className="flex gap-3">
          <button type="button" aria-label="Pito" onPointerDown={() => input.pressJump()} className={btn}>
            <Megaphone size={22} />
          </button>
          <button
            type="button"
            aria-label="Turbo"
            onPointerDown={() => input.set('run', true)}
            onPointerUp={() => input.set('run', false)}
            onPointerLeave={() => input.set('run', false)}
            onPointerCancel={() => input.set('run', false)}
            className={btn}
          >
            <Zap size={22} />
          </button>
        </div>
      </div>
    </>
  )
}
