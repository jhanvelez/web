import { ArrowRight, Code2, GitBranch, Layers, Smartphone } from 'lucide-react'
import { PROFILE } from '../../data/profile'

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

/** Bienvenida: el arriero aparece grande, como mascota de la app, y esta tarjeta cuenta quién es y qué hace. */
export function IntroCard({ visible, onStart }: Props) {
  return (
    <section
      aria-hidden={!visible}
      className={`fixed z-40 w-[min(420px,calc(100vw-2rem))] rounded-3xl bg-[#fff1dc]/95 p-6 text-[#3b2417] shadow-2xl backdrop-blur-xl transition-all duration-700 ease-out
        left-4 top-24 max-[767px]:bottom-4 max-[767px]:left-1/2 max-[767px]:top-auto max-[767px]:-translate-x-1/2
        ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
    >
      <div className="mb-4 h-1.5 w-full rounded-full bg-[linear-gradient(90deg,#f2b632_50%,#1f5fa8_50%_75%,#c0392b_75%)]" />
      <p className="text-xs font-semibold uppercase tracking-wider text-[#b8472f]">¡Bienvenido a mi finca digital!</p>
      <h1 className="font-display mt-1 text-4xl font-extrabold leading-tight">Soy {PROFILE.name}</h1>
      <p className="mt-1 text-lg text-[#3b2417]/80">{PROFILE.role}</p>
      <p className="mt-3 text-sm leading-relaxed text-[#3b2417]/80">
        Construyo software de punta a punta. Este arriero eres tú: recorre las montañas y entra a cada casa para ver mis proyectos.
      </p>
      <ul className="mt-4 space-y-2">
        {SKILLS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#f2b632]/80 text-[#2a1018]">
              <Icon size={14} />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#3b2417] px-6 py-3 text-base font-semibold text-[#fff1dc] transition hover:bg-[#b8472f]"
      >
        Explorar el mundo <ArrowRight size={18} />
      </button>
      <p className="mt-3 text-center text-xs text-[#3b2417]/60">↑ ↓ ← → para caminar · o pulsa el botón</p>
    </section>
  )
}
