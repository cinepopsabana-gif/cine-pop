export interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string[];
  duration: string; // e.g. "166 min"
  rating: string; // e.g. "PG-13"
  formats: string[]; // e.g. ["XD", "IMAX", "2D"]
  languages: string[]; // e.g. ["English SUB", "Spanish DUB"]
  posterUrl: string;
  ratingScore: number;
}

export interface Showtime {
  id: string;
  time: string;
  cinema: string;
  date: string;
  priceStandard: number;
  priceVip: number;
}

export interface SelectedSeat {
  id: string; // e.g. "E5"
  row: string; // e.g. "E"
  number: number; // e.g. 5
  type: 'Standard' | 'Preferential';
  price: number;
}

export interface SnackItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Combos' | 'Individual' | 'Drinks' | 'Sweets';
  imageUrl: string;
  isAvailable?: boolean; // true by default if not specified
}

export interface CartSnack {
  snack: SnackItem;
  quantity: number;
}

export interface PromoCode {
  id: string;
  code: string; // e.g., "PREMIERE", "CINEPOP"
  description: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number; // e.g. 4000 (fixed amount) or 15 (15%)
  minimumPurchase: number; // e.g. 0 if no minimum
  isAvailable: boolean;
}

export type BookingStep = 'movie-selection' | 'seat-selection' | 'snacks-selection' | 'checkout-confirmation' | 'ticket-success';

export interface SaleRecord {
  id: string;
  date: string; // YYYY-MM-DD or ISO
  movieTitle: string;
  showtimeTime: string;
  showtimeCinema: string;
  showtimeDate: string;
  seats: SelectedSeat[];
  snacks: CartSnack[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'transfer' | 'cash';
  customerDoc?: string;
  customerPhone?: string;
  bankName?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'Servicios' | 'Personal' | 'Limpieza' | 'Mantenimiento' | 'Insumos' | 'Otros';
  description: string;
  amount: number;
}

