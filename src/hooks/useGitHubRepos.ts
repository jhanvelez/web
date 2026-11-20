import { useEffect, useMemo, useState } from 'react'
import { fetchUserRepos, isFresh, readCache } from '../services/github'
import type { FetchStatus, GitHubRepo } from '../types/portfolio'

export interface UseGitHubRepos {
  repos: GitHubRepo[]
  byName: Map<string, GitHubRepo>
  status: FetchStatus
  error: string | null
}

/**
 * Obtiene los repos públicos de un usuario con caché en localStorage (1 h).
 * Si la red falla (o hay rate limit) conserva el caché vencido; si no hay, devuelve lista vacía
 * y el portafolio sigue funcionando con los datos locales de `projects.ts`.
 */
export function useGitHubRepos(user: string): UseGitHubRepos {
  const cached = useMemo(() => readCache(user), [user])
  const [repos, setRepos] = useState<GitHubRepo[]>(cached?.repos ?? [])
  const [status, setStatus] = useState<FetchStatus>(isFresh(cached) ? 'success' : 'idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isFresh(cached)) return
    const ctrl = new AbortController()
    setStatus('loading')
    fetchUserRepos(user, ctrl.signal)
      .then((data) => {
        setRepos(data)
        setStatus('success')
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Error desconocido')
        setStatus('error')
      })
    return () => ctrl.abort()
  }, [user, cached])

  const byName = useMemo(() => new Map(repos.map((r) => [r.name.toLowerCase(), r])), [repos])
  return { repos, byName, status, error }
}
