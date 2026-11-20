# Portafolio 3D · Paisaje andino

Diorama low-poly con **tres montañas** y un valle central con el **rincón del café**. Cada montaña
tiene su pueblo de casas coloniales (paredes blancas, zócalos, puertas y balcones de colores)
unido por **caminos de piedra** en forma de árbol: cada casa sale a la plaza de su montaña y las
tres plazas bajan al café. Un arriero camina por todo el mundo.

```bash
npm install
npm run dev      # desarrollo
npm run build    # tsc + vite build
```

## Interacción

- Arrastra para girar, rueda para acercar.
- **Clic en un marcador u objeto:** la cámara vuela allí, se abre el panel y el arriero camina hasta ese lugar.
- **Clic en el terreno:** el arriero camina hasta ahí (entre montañas va por los caminos de piedra).
- Si lo dejas quieto ~14 s, pasea solo de casa en casa y al café.
- Enlaces directos: `/#hs-casa`, `#hs-jeep`, `#hs-costal`, `#hs-letrero`, `#hs-mirador`, `#hs-cafe`.

## Personalizar

- **Proyectos y hotspots:** `src/data/projects.ts` (contenido de ejemplo: reemplázalo). Cada hotspot se
  coloca en polares alrededor de una plaza (A, B, C = montañas, K = café); cámara y offsets en espacio local.
- **Perfil y enlaces:** `src/data/profile.ts` (confirma tu URL de LinkedIn).
- **Mundo:** `src/lib/world.ts` (posición y altura de las montañas), `src/lib/terrain.ts` (relieve),
  `src/lib/layout.ts` (casas por montaña, red de caminos, zonas libres), `src/lib/nav.ts` (rutas del arriero).
- **Casas:** `PALETTES` en `ColombianHouse.tsx` (colores) y `COUNTS` en `layout.ts` (cuántas por montaña).
- **GitHub:** `src/services/github.ts` + `src/hooks/useGitHubRepos.ts` (caché de 1 h en `localStorage`).
