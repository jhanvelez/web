# Portafolio 3D · Paisaje andino

Portafolio interactivo en Vite + React + TypeScript + React Three Fiber. Una montaña low-poly del
Eje Cafetero con casa campesina, arriero, Jeep Willys, costal de café, letrero de finca y mirador;
cada objeto es un *hotspot* que abre un proyecto.

```bash
npm install
npm run dev      # desarrollo
npm run build    # tsc + vite build
```

## Personalizar

- **Proyectos y hotspots:** `src/data/projects.ts` (el contenido actual es de ejemplo: reemplázalo).
  Con `repoName` el drawer muestra estrellas/lenguaje/último push en vivo.
- **Perfil y enlaces:** `src/data/profile.ts` (confirma la URL de LinkedIn).
- **GitHub:** `src/services/github.ts` + `src/hooks/useGitHubRepos.ts`. Caché de 1 h en `localStorage`;
  si la API falla o hay rate limit, el sitio sigue funcionando con los datos locales.
- **Deep links:** `/#hs-jeep`, `#hs-casa`, `#hs-costal`, `#hs-letrero`, `#hs-mirador` abren el proyecto directo.
- **Layout del terreno:** `src/lib/terrain.ts` (altura) y `src/lib/layout.ts` (zonas libres y caminos).
