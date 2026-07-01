// Configuración única del mapa de butacas de la sala.
// Se usa tanto en la vista de compra del cliente (SeatMap.tsx) como en el
// panel de administración (MovieAdminPanel.tsx), para que ambos SIEMPRE
// muestren exactamente las mismas butacas sin tener que editar dos lugares.

export const SEAT_ROWS = ['E', 'D', 'C', 'B', 'A'];
export const SEAT_COLS_LEFT = [13, 12, 11];
export const SEAT_COLS_RIGHT = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Determina si una butaca (fila + número de columna) existe físicamente en la sala.
 */
export function doesSeatExist(row: string, colNum: number): boolean {
  if (row === 'E') return colNum <= 12; // no existe la E13
  if (row === 'D') return colNum <= 11;
  if (row === 'C') return colNum <= 11; // sí existe la C11
  return colNum <= 10; // B y A
}
