import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { HOTSPOTS, projectById } from './data/projects'
import { PROFILE } from './data/profile'
import { useGitHubRepos } from './hooks/useGitHubRepos'
import { Loader } from './components/ui/Loader'
import { Navbar } from './components/ui/Navbar'
import { ProjectDrawer } from './components/ui/ProjectDrawer'

// Three.js pesa bastante: se carga aparte para que el Loader aparezca de inmediato.
const Scene = lazy(() => import('./components/canvas/Scene'))

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = window.location.hash.slice(1)
    return HOTSPOTS.some((h) => h.id === id) ? id : null
  })
  const [ready, setReady] = useState(false)
  const github = useGitHubRepos(PROFILE.githubUser)

  const selected = useMemo(() => HOTSPOTS.find((h) => h.id === selectedId) ?? null, [selectedId])
  const project = selected ? (projectById(selected.projectId) ?? null) : null

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = HOTSPOTS.findIndex((h) => h.id === selectedId)
      if (i < 0) return
      setSelectedId(HOTSPOTS[(i + dir + HOTSPOTS.length) % HOTSPOTS.length].id)
    },
    [selectedId],
  )
  const close = useCallback(() => setSelectedId(null), [])
  const prev = useCallback(() => step(-1), [step])
  const next = useCallback(() => step(1), [step])
  const onReady = useCallback(() => setReady(true), [])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f3b98a]">
      <Suspense fallback={null}>
        <Scene selectedId={selectedId} onSelect={setSelectedId} onReady={onReady} />
      </Suspense>

      <Navbar selectedId={selectedId} onSelect={setSelectedId} />
      <ProjectDrawer project={project} github={github} onClose={close} onPrev={prev} onNext={next} />

      {!selectedId && ready && (
        <p className="pointer-events-none fixed inset-x-0 bottom-6 z-20 text-center text-sm text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
          Arrastra para girar · rueda para acercar · toca un marcador para ver un proyecto · haz clic en el terreno para que el arriero camine
        </p>
      )}

      <Loader ready={ready} />
    </main>
  )
}
