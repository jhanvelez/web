/** Colores posibles del Willys: se elige uno al azar en cada carga (carga, inicio y juego usan el mismo). */
const JEEP_COLORS = ['#d23a2e', '#e8a33a', '#3fa7d6', '#4fb87a', '#a66bd6', '#e86aa8', '#eceae4', '#5289AD']

export const JEEP_COLOR = JEEP_COLORS[Math.floor(Math.random() * JEEP_COLORS.length)]
