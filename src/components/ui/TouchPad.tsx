import { useEffect, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsUp, Coffee } from 'lucide-react'
import { input } from '../../lib/input'

type Dir = 'up' | 'down' | 'left' | 'right'

function Btn({ dir, children, className }: { dir: Dir; children: React.ReactNode; className: string }) {
  const on = (v: boolean) => () => input.set(dir, v)
  return (
    <button
      type="button"
      aria-label={dir}
      onPointerDown={on(true)}
      onPointerUp={on(false)}
      onPointerLeave={on(false)}
      onPointerCancel={on(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute grid size-14 touch-none select-none place-items-center rounded-2xl bg-[#2a1018]/70 text-[#ffd36a] backdrop-blur-md active:bg-[#f2b632] active:text-[#2a1018] ${className}`}
    >
      {children}
    </button>
  )
}

interface Props {
  canInteract: boolean
  onInteract: () => void
}

/** Cruceta y botones para pantallas táctiles (el arriero también se mueve sin teclado). */
export function TouchPad({ canInteract, onInteract }: Props) {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    setCoarse(window.matchMedia('(pointer: coarse)').matches)
  }, [])
  if (!coarse) return null

  return (
    <>
      <div className="fixed bottom-32 left-3 z-30 size-44">
        <Btn dir="up" className="left-1/2 top-0 -translate-x-1/2"><ArrowUp /></Btn>
        <Btn dir="down" className="bottom-0 left-1/2 -translate-x-1/2"><ArrowDown /></Btn>
        <Btn dir="left" className="left-0 top-1/2 -translate-y-1/2"><ArrowLeft /></Btn>
        <Btn dir="right" className="right-0 top-1/2 -translate-y-1/2"><ArrowRight /></Btn>
      </div>
      <div className="fixed bottom-44 right-3 z-30 flex flex-col gap-3">
        <button
          type="button"
          onPointerDown={() => input.pressJump()}
          aria-label="Saltar"
          className="grid size-14 touch-none place-items-center rounded-full bg-[#2a1018]/70 text-[#ffd36a] backdrop-blur-md active:bg-[#f2b632] active:text-[#2a1018]"
        >
          <ChevronsUp />
        </button>
        <button
          type="button"
          onClick={onInteract}
          disabled={!canInteract}
          aria-label="Interactuar"
          className="grid size-14 place-items-center rounded-full bg-[#f2b632] text-[#2a1018] shadow-lg transition disabled:opacity-30"
        >
          <Coffee />
        </button>
      </div>
    </>
  )
}
