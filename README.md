# Portafolio 3D · Paisaje andino

Diorama low-poly de atardecer colombiano: **tres montañas** con pueblo colonial, un valle con
estanques y el **rincón del café**, unidos por caminos de piedra (en árbol). Cámara fija con
seguimiento, al estilo bruno-simon.com: tú manejas al arriero.

```bash
npm install
npm run dev      # desarrollo
npm run build    # tsc + vite build
```

## Controles

| Tecla | Acción |
| --- | --- |
| ↑ ↓ ← → / WASD | mover al arriero (relativo a la pantalla) |
| Shift | correr |
| Espacio | saltar |
| **F** / Enter | abrir el proyecto del lugar cercano |
| Q / E | girar la cámara 45° |
| Rueda | zoom |
| M | mapa grande (clic en un rombo = ir allí) |
| Esc | cerrar panel / mapa |

En pantallas táctiles aparece una cruceta. Al abrir un proyecto desde el menú o el mapa, el arriero
camina solo hasta ese lugar. El **Jeep Willys** recorre los caminos por su cuenta (baches, trepidación,
polvo); se detiene si abres su proyecto.

## Música

`src/components/ui/MusicPlayer.tsx` usa el reproductor oficial de YouTube (el audio lo sirve YouTube; no se
aloja aquí). Arranca con la primera tecla o clic (política de los navegadores) y recuerda si la apagas.
Para cambiar la canción edita `VIDEO_ID`. Si el video no permite incrustarse, el panel ofrece abrirlo en YouTube.

## Personalizar

- **Proyectos y hotspots:** `src/data/projects.ts` (contenido de ejemplo). Se colocan en polares alrededor de una plaza.
- **Perfil y enlaces:** `src/data/profile.ts` (confirma tu LinkedIn).
- **Mundo:** `src/lib/world.ts` (montañas, estanques), `terrain.ts` (relieve), `layout.ts` (casas, caminos, farolas), `nav.ts` (rutas y colisiones).
- **Ambiente:** cielo y luces en `Scene.tsx`; luciérnagas y farolas en `Ambient.tsx`; pasto y agua en `Mountain.tsx`.
- **GitHub:** `src/services/github.ts` + `src/hooks/useGitHubRepos.ts` (caché de 1 h).
