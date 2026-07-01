import { Movie, Showtime, SnackItem, PromoCode, SaleRecord, ExpenseRecord } from './types';

// ============================================================
// Datos iniciales del sistema.
//
// Este archivo se entrega VACÍO a propósito: la app arranca "en
// ceros" (sin películas, funciones, asientos, snacks, promos,
// ventas ni gastos de ejemplo) para que el cliente cargue su
// propio catálogo real desde el Panel Administrativo (#admin).
//
// Estos arrays solo se usan UNA VEZ, la primera vez que la app se
// conecta a una base de Supabase recién creada (sin datos), para
// "sembrarla". Como están vacíos, no se inserta nada automático:
// el cliente empieza con la app completamente limpia.
// ============================================================

export const MOVIES: Movie[] = [];

export const SHOWTIMES: Record<string, Showtime[]> = {};

export const SNACK_ITEMS: SnackItem[] = [];

export const OCCUPIED_SEATS_BY_SHOWTIME: Record<string, string[]> = {};

export const DEFAULT_PROMO_CODES: PromoCode[] = [];

export const DEFAULT_SALES_HISTORY: SaleRecord[] = [];

export const DEFAULT_EXPENSES: ExpenseRecord[] = [];
