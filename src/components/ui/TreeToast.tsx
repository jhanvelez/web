import { useEffect, useState } from 'react'
import { useTypedLines } from '../../hooks/useTypewriter'
import { live } from '../../lib/state'
import { CARDS } from '../../lib/cards'
import { Cursor } from './Cursor'

/** Ficha de especie estilo terminal: aparece al pasar junto a un árbol y se "escribe" sola. */
export function TreeToast() {
  const [id, setId] = useState<string | null>(null)
  // Se conserva la última especie para que el texto no desaparezca mientras la carta se desvanece.
  const [last, setLast] = useState<string | null>(null)
  useEffect(() => {
    const t = setInterval(() => {
      const cur = live.nearHorse ?? live.nearTree
      setId((prev) => (prev !== cur ? cur : prev))
      if (cur) setLast(cur)
    }, 250)
    return () => clearInterval(t)
  }, [])
  const sp = last ? CARDS[last] : null
  const visible = !!id

  const lines = sp ? [sp.name, sp.sci ?? '', sp.blurb] : ['', '', '']
  const { parts, active, done } = useTypedLines(lines, `${last}-${visible}`, { enabled: visible, cps: 52 })

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-4 top-24 z-20 w-[290px] overflow-hidden rounded-xl border border-[#ACBCBF]/25 bg-[#243C4C]/90 font-mono text-[#F4FCFB] shadow-[0_0_30px_rgba(172,188,191,0.08)] backdrop-blur-md transition-all duration-500 max-[767px]:top-auto max-[767px]:bottom-44 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-1.5">
        <span className="size-2.5 rounded-full bg-[#ff5f56]" />
        <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="size-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 truncate text-[11px] text-white/45">{sp?.file ?? 'arboles/colombia.txt'}</span>
      </div>
      {sp && (
        <div className="space-y-1 px-4 py-3 text-[13px] leading-snug">
          <p className="text-[11px] text-[#ACBCBF]">$ cat especie.txt</p>
          <p className="min-h-[1.5em] text-lg font-bold text-[#9CC6E0]">
            {parts[0]}
            {active === 0 && <Cursor />}
          </p>
          <p className="min-h-[1.2em] text-xs italic text-white/50">
            {parts[1]}
            {active === 1 && <Cursor />}
          </p>
          <p className="min-h-[3.6em] pt-1 text-[#F4FCFB]/85">
            {parts[2]}
            {(active === 2 || done) && <Cursor />}
          </p>
        </div>
      )}
    </div>
  )
}
