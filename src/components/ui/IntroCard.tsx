import { ArrowRight, Code2, GitBranch, Layers, Smartphone } from 'lucide-react'
import { PROFILE } from '../../data/profile'
import { useTypedLines } from '../../hooks/useTypewriter'
import { Cursor } from './Cursor'

interface Props {
  visible: boolean
  onStart: () => void
}

// TODO: ajusta estos puntos a lo que realmente haces.
const SKILLS = [
  { icon: Layers, text: 'Plataformas web completas: React, Node y bases de datos' },
  { icon: Code2, text: 'APIs y microservicios desacoplados' },
  { icon: Smartphone, text: 'Apps móviles multiplataforma' },
  { icon: GitBranch, text: 'Código abierto y despliegue automatizado' },
]

const INTRO_LINES = [
  `Soy ${PROFILE.name}`,
  PROFILE.role,
  'Construyo software de punta a punta. Este arriero eres tú: maneja su Jeep por las montañas, choca mi nombre si te atreves y entra a cada casa para ver mis proyectos.',
]

/** Bienvenida estilo terminal: el arriero aparece grande como mascota y la carta se escribe sola. */
export function IntroCard({ visible, onStart }: Props) {
  const { parts, active, done } = useTypedLines(INTRO_LINES, 'intro', { enabled: visible, cps: 55, startDelay: 500 })

  return (
    <section
      aria-hidden={!visible}
      className={`fixed z-40 w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#7dffb2]/25 bg-[#0b0d10]/92 font-mono text-[#d8e2d2] shadow-[0_0_50px_rgba(125,255,178,0.1)] backdrop-blur-xl transition-all duration-700 ease-out
        left-4 top-24 max-[767px]:bottom-4 max-[767px]:left-1/2 max-[767px]:top-auto max-[767px]:-translate-x-1/2
        ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f56]" />
        <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="size-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-[11px] text-white/45">bienvenida.sh</span>
      </div>
      <div className="p-5">
        <div className="mb-3 h-1 w-full rounded-full bg-[linear-gradient(90deg,#f2b632_50%,#1f5fa8_50%_75%,#c0392b_75%)]" />
        <p className="text-[11px] text-[#7dffb2]">$ ./bienvenido --finca-digital</p>
        <h1 className="mt-2 min-h-[1.3em] text-3xl font-extrabold leading-tight text-[#ffb454]">
          {parts[0]}
          {active === 0 && <Cursor />}
        </h1>
        <p className="mt-1 min-h-[1.4em] text-base text-white/75">
          {parts[1]}
          {active === 1 && <Cursor />}
        </p>
        <p className="mt-3 min-h-[5.2em] text-[13px] leading-relaxed text-[#d8e2d2]/80">
          {parts[2]}
          {(active === 2 || done) && <Cursor />}
        </p>
        <ul className={`mt-3 space-y-2 transition-opacity duration-700 ${done ? 'opacity-100' : 'opacity-0'}`}>
          {SKILLS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-[13px]">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-[#ffb454]/15 text-[#ffb454]">
                <Icon size={13} />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onStart}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ffb454] px-6 py-3 text-sm font-bold text-[#0b0d10] transition hover:bg-[#ffd36a]"
        >
          Explorar el mundo <ArrowRight size={18} />
        </button>
        <p className="mt-3 text-center text-[11px] text-white/45">↑ acelerar · ↓ frenar · ← → girar · o pulsa el botón</p>
      </div>
    </section>
  )
}
