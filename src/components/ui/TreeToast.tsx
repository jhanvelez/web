import { useEffect, useState } from 'react'
import { Leaf } from 'lucide-react'
import { live } from '../../lib/state'
import { SPECIES, type SpeciesId } from '../../lib/trees'

/** Cartel de especie: aparece al pasar junto a un árbol (como la ficha de árboles nativos). */
export function TreeToast() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    const t = setInterval(() => setId((cur) => (live.nearTree !== cur ? live.nearTree : cur)), 250)
    return () => clearInterval(t)
  }, [])
  const sp = id ? SPECIES[id as SpeciesId] : null

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-4 top-24 z-20 w-[260px] rounded-2xl bg-[#fff1dc]/92 p-4 text-[#3b2417] shadow-xl backdrop-blur-md transition-all duration-500 max-[767px]:top-auto max-[767px]:bottom-44 ${
        sp ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      {sp && (
        <>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2f6b3a]">
            <Leaf size={13} /> Árbol de Colombia
          </p>
          <p className="font-display mt-1 text-xl font-extrabold leading-tight">{sp.name}</p>
          {sp.sci && <p className="text-xs italic text-[#3b2417]/60">{sp.sci}</p>}
          <p className="mt-2 text-sm leading-snug text-[#3b2417]/85">{sp.blurb}</p>
        </>
      )}
    </div>
  )
}
