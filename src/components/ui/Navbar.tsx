import { Github, Linkedin } from './BrandIcons'
import { PROFILE } from '../../data/profile'
import { HOTSPOTS } from '../../data/projects'

interface Props {
  selectedId: string | null
  onSelect: (hotspotId: string | null) => void
}

export function Navbar({ selectedId, onSelect }: Props) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4 md:p-6">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="pointer-events-auto rounded-2xl bg-[#243C4C]/70 px-4 py-2 text-left text-[#F4FCFB] shadow-lg backdrop-blur-md transition hover:bg-[#243C4C]/85"
        aria-label="Volver a la vista general"
      >
        <span className="font-display block text-lg font-extrabold leading-tight">{PROFILE.name}</span>
        <span className="block text-xs text-[#F4FCFB]/70">{PROFILE.role}</span>
      </button>

      <nav className="pointer-events-auto hidden items-center gap-1 rounded-full bg-[#243C4C]/70 p-1 shadow-lg backdrop-blur-md lg:flex" aria-label="Proyectos">
        {HOTSPOTS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelect(h.id)}
            aria-current={selectedId === h.id}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              selectedId === h.id ? 'bg-[#5289AD] font-semibold text-[#F4FCFB]' : 'text-[#F4FCFB]/85 hover:bg-white/10'
            }`}
          >
            {h.label}
          </button>
        ))}
      </nav>

      <div className="pointer-events-auto flex gap-2">
        <a
          href={PROFILE.githubUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="grid size-10 place-items-center rounded-full bg-[#243C4C]/70 text-[#F4FCFB] shadow-lg backdrop-blur-md transition hover:bg-[#5289AD] hover:text-[#F4FCFB]"
        >
          <Github size={18} />
        </a>
        <a
          href={PROFILE.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          className="grid size-10 place-items-center rounded-full bg-[#243C4C]/70 text-[#F4FCFB] shadow-lg backdrop-blur-md transition hover:bg-[#5289AD] hover:text-[#F4FCFB]"
        >
          <Linkedin size={18} />
        </a>
      </div>
    </header>
  )
}
