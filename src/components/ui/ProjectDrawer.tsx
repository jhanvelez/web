import { useEffect } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, GitFork, Star, X } from 'lucide-react'
import { Github, Linkedin } from './BrandIcons'
import { PROFILE } from '../../data/profile'
import type { GitHubRepo, Project } from '../../types/portfolio'
import type { UseGitHubRepos } from '../../hooks/useGitHubRepos'

interface Props {
  project: Project | null
  github: UseGitHubRepos
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const CATEGORY_LABEL: Record<Project['category'], string> = {
  fullstack: 'Full-Stack',
  microservices: 'Microservicios',
  mobile: 'Móvil',
  oss: 'Open Source',
  data: 'Datos',
  contact: 'Contacto',
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(new Date(iso))

function RepoRow({ repo }: { repo: GitHubRepo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-xl border border-[#3b2417]/10 bg-white/60 p-3 transition hover:border-[#b8472f]/50 hover:bg-white"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-[#3b2417]">{repo.name}</span>
        <ArrowUpRight size={14} className="shrink-0 text-[#3b2417]/40 transition group-hover:text-[#b8472f]" />
      </div>
      {repo.description && <p className="mt-0.5 line-clamp-2 text-xs text-[#3b2417]/70">{repo.description}</p>}
      <div className="mt-2 flex items-center gap-3 text-xs text-[#3b2417]/60">
        {repo.language && <span>{repo.language}</span>}
        <span className="inline-flex items-center gap-1"><Star size={12} />{repo.stargazers_count}</span>
        <span className="inline-flex items-center gap-1"><GitFork size={12} />{repo.forks_count}</span>
      </div>
    </a>
  )
}

export function ProjectDrawer({ project, github, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    if (!project) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [project, onClose])

  const live = project?.repoName ? github.byName.get(project.repoName.toLowerCase()) : undefined
  const featured =
    project?.category === 'oss'
      ? github.repos
          .filter((r) => !r.fork && !r.archived)
          .sort((a, b) => b.stargazers_count - a.stargazers_count || +new Date(b.pushed_at) - +new Date(a.pushed_at))
          .slice(0, 6)
      : []

  return (
    <aside
      aria-hidden={!project}
      aria-label="Detalle del proyecto"
      className={`fixed z-40 flex flex-col overflow-hidden bg-[#f6ecd8]/95 text-[#3b2417] shadow-2xl backdrop-blur-xl transition-transform duration-500 ease-out
        inset-x-0 bottom-0 max-h-[58vh] rounded-t-3xl
        md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-l-3xl md:rounded-tr-none
        ${project ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}
    >
      {project && (
        <>
          <div className="h-2 w-full bg-[linear-gradient(90deg,#f2b632_50%,#1f5fa8_50%_75%,#c0392b_75%)]" />
          <div className="flex items-center justify-between px-6 pt-5">
            <span className="rounded-full bg-[#2f6b3a] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              {CATEGORY_LABEL[project.category]}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid size-9 place-items-center rounded-full bg-[#3b2417]/10 transition hover:bg-[#3b2417]/20"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
            <h2 className="font-display text-3xl font-extrabold leading-tight">{project.title}</h2>
            <p className="mt-1 italic text-[#b8472f]">{project.tagline}</p>
            <p className="mt-4 leading-relaxed text-[#3b2417]/85">{live?.description ?? project.description}</p>

            {project.highlights && (
              <ul className="mt-4 space-y-1.5">
                {project.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#f2b632]" />
                    {h}
                  </li>
                ))}
              </ul>
            )}

            {project.stack.length > 0 && (
              <>
                <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-[#3b2417]/60">Stack</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {project.stack.map((s) => (
                    <span key={s} className="rounded-full border border-[#3b2417]/15 bg-white/70 px-3 py-1 text-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}

            {live && (
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-[#3b2417]/70">
                {live.language && <span>{live.language}</span>}
                <span className="inline-flex items-center gap-1"><Star size={14} />{live.stargazers_count}</span>
                <span className="inline-flex items-center gap-1"><GitFork size={14} />{live.forks_count}</span>
                <span>Actualizado {fmtDate(live.pushed_at)}</span>
              </div>
            )}

            {project.category === 'oss' && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3b2417]/60">En GitHub</h3>
                {github.status === 'loading' && <p className="mt-2 text-sm text-[#3b2417]/60">Cargando repositorios…</p>}
                {github.status === 'error' && featured.length === 0 && (
                  <p className="mt-2 text-sm text-[#3b2417]/60">
                    No pude consultar GitHub ahora ({github.error}). Mira directamente mi perfil con el botón de abajo.
                  </p>
                )}
                <div className="mt-2 space-y-2">
                  {featured.map((r) => (
                    <RepoRow key={r.id} repo={r} />
                  ))}
                </div>
              </div>
            )}

            {project.category === 'contact' ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={PROFILE.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1f5fa8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b8472f]"
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
                <a
                  href={PROFILE.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#3b2417] px-5 py-2.5 text-sm font-semibold text-[#f6ecd8] transition hover:bg-[#b8472f]"
                >
                  <Github size={16} /> GitHub
                </a>
              </div>
            ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={live?.html_url ?? project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#3b2417] px-5 py-2.5 text-sm font-semibold text-[#f6ecd8] transition hover:bg-[#b8472f]"
              >
                <Github size={16} /> Repositorio
              </a>
              {(project.demoUrl ?? live?.homepage) && (
                <a
                  href={project.demoUrl ?? live?.homepage ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#3b2417]/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-[#3b2417]/10"
                >
                  Demo <ArrowUpRight size={16} />
                </a>
              )}
            </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#3b2417]/10 px-4 py-3 text-sm">
            <button type="button" onClick={onPrev} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition hover:bg-[#3b2417]/10">
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="text-xs text-[#3b2417]/50">Esc para cerrar · haz clic fuera para volver</span>
            <button type="button" onClick={onNext} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition hover:bg-[#3b2417]/10">
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
