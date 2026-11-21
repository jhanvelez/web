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
  dulce: {
    name: 'Dulce Sueño de Lusitania',
    sci: 'Caballo de paso fino colombiano',
    blurb: 'Negro, de porte altivo y andar fino. Según la prensa, el caballo de paso fino más caro de Colombia. Aquí pasta tranquilo en su potrero.',
    file: 'caballos/dulce_sueno.txt',
  },
  paso: {
    name: 'Caballo de paso fino',
    sci: 'Equus ferus caballus',
    blurb: 'Andar suave de cuatro tiempos, brioso y elegante: orgullo de las ferias y cabalgatas colombianas.',
    file: 'caballos/paso_fino.txt',
  },
  chalan: {
    name: 'Chalán',
    sci: 'Jinete de paso fino',
    blurb: 'El chalán prepara y exhibe al caballo: sombrero, botas y mucha calma sobre la silla.',
    file: 'chalanes/jinete.txt',
  },
}
