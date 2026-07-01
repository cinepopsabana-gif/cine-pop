import { Movie, SnackItem, PromoCode, SaleRecord, ExpenseRecord } from '../types';

// ---------------- Movies ----------------
export function movieToRow(m: Movie) {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    genre: m.genre,
    duration: m.duration,
    rating: m.rating,
    formats: m.formats,
    languages: m.languages,
    poster_url: m.posterUrl,
    rating_score: m.ratingScore,
  };
}

export function rowToMovie(row: any): Movie {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre || [],
    duration: row.duration,
    rating: row.rating,
    formats: row.formats || [],
    languages: row.languages || [],
    posterUrl: row.poster_url,
    ratingScore: Number(row.rating_score),
  };
}

// ---------------- Snack Items ----------------
export function snackToRow(s: SnackItem) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    category: s.category,
    image_url: s.imageUrl,
    is_available: s.isAvailable ?? true,
  };
}

export function rowToSnack(row: any): SnackItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    imageUrl: row.image_url,
    isAvailable: row.is_available,
  };
}

// ---------------- Promo Codes ----------------
export function promoToRow(p: PromoCode) {
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    discount_type: p.discountType,
    discount_value: p.discountValue,
    minimum_purchase: p.minimumPurchase,
    is_available: p.isAvailable,
  };
}

export function rowToPromo(row: any): PromoCode {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minimumPurchase: Number(row.minimum_purchase),
    isAvailable: row.is_available,
  };
}

// ---------------- Sales History ----------------
export function saleToRow(s: SaleRecord) {
  return {
    id: s.id,
    date: s.date,
    movie_title: s.movieTitle,
    showtime_time: s.showtimeTime,
    showtime_cinema: s.showtimeCinema,
    showtime_date: s.showtimeDate,
    seats: s.seats,
    snacks: s.snacks,
    subtotal: s.subtotal,
    discount: s.discount,
    total: s.total,
    payment_method: s.paymentMethod,
    customer_doc: s.customerDoc,
    customer_phone: s.customerPhone,
    bank_name: s.bankName,
  };
}

export function rowToSale(row: any): SaleRecord {
  return {
    id: row.id,
    date: row.date,
    movieTitle: row.movie_title,
    showtimeTime: row.showtime_time,
    showtimeCinema: row.showtime_cinema,
    showtimeDate: row.showtime_date,
    seats: row.seats || [],
    snacks: row.snacks || [],
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    customerDoc: row.customer_doc ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    bankName: row.bank_name ?? undefined,
  };
}

// ---------------- Expenses ----------------
export function expenseToRow(e: ExpenseRecord) {
  return {
    id: e.id,
    date: e.date,
    category: e.category,
    description: e.description,
    amount: e.amount,
  };
}

export function rowToExpense(row: any): ExpenseRecord {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
  };
}
