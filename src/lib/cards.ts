import { SPECIES } from './trees'

export interface Card {
  name: string
  sci?: string
  blurb: string
  /** Nombre de archivo en la barra de la ventana tipo terminal. */
  file: string
}

export const CARDS: Record<string, Card> = {
  ...Object.fromEntries(
    Object.values(SPECIES).map((s) => [s.id, { name: s.name, sci: s.sci, blurb: s.blurb, file: 'arboles/colombia.txt' } satisfies Card]),
  ),
  casa: {
    name: 'Casa campesina',
    sci: 'Arquitectura cafetera',
    blurb: 'Paredes blancas, zócalo y puertas de colores, balcón de madera y techo de teja de barro: la casa típica del Eje Cafetero.',
    file: 'lugares/casa.txt',
  },
  cafe: {
    name: 'Rincón del café',
    sci: 'El tinto de cada día',
    blurb: 'Aquí se toma el tinto: café negro, recién colado y compartido, como en los pueblos cafeteros.',
    file: 'lugares/cafe.txt',
  },
  cascada: {
    name: 'Cascada',
    sci: 'Agua de montaña',
    blurb: 'El agua baja de la loma y cae a la laguna: así nacen muchos de los ríos de los Andes.',
    file: 'lugares/cascada.txt',
  },
  laguna: {
    name: 'Laguna',
    sci: 'Espejo del valle',
    blurb: 'Un espejo de agua que refleja el atardecer y atrae a las aves.',
    file: 'lugares/laguna.txt',
  },
  mirador: {
    name: 'Mirador',
    sci: 'Balcón sobre el valle',
    blurb: 'Desde aquí se ve el paisaje cafetero y ondea la bandera de Colombia.',
    file: 'lugares/mirador.txt',
  },
  letrero: {
    name: 'Letrero de la finca',
    sci: 'Bienvenida y rumbo',
    blurb: 'En las fincas, el letrero da la bienvenida y marca el camino a seguir.',
    file: 'lugares/letrero.txt',
  },
  costal: {
    name: 'Costal de café',
    sci: 'Fique y café pergamino',
    blurb: 'El café se empaca en costales de fique, listo para salir a mercados y trilladoras.',
    file: 'lugares/costal.txt',
  },
  jeep: {
    name: 'Jeep Willys',
    sci: 'El "yipao" cafetero',
    blurb: 'El Willys es el carro de las fincas y los pueblos: carga gente, café y plátano por trochas y carreteras.',
    file: 'lugares/willys.txt',
  },
  plaza: {
    name: 'Plaza de la vereda',
    sci: 'Punto de encuentro',
    blurb: 'El centro de cada vereda: de aquí salen los caminos a cada casa.',
    file: 'lugares/plaza.txt',
  },
}
