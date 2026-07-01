import React, { useState, useEffect } from 'react';
import {
  Film,
  MapPin,
  Tag,
  ShoppingBag,
  Sparkles,
  Lock,
  User,
  Heart,
  Check,
  Clock,
  Compass,
  LogOut,
  Award,
  ChevronRight,
  Tv
} from 'lucide-react';
import Navbar from './components/Navbar';
import MovieSelector from './components/MovieSelector';
import SeatMap from './components/SeatMap';
import SnackMenu from './components/SnackMenu';
import CheckoutSummary from './components/CheckoutSummary';
import MovieAdminPanel from './components/MovieAdminPanel';
import { Movie, Showtime, SelectedSeat, CartSnack, BookingStep, SnackItem, PromoCode, SaleRecord, ExpenseRecord } from './types';
import { MOVIES, SHOWTIMES, OCCUPIED_SEATS_BY_SHOWTIME, SNACK_ITEMS, DEFAULT_PROMO_CODES, DEFAULT_SALES_HISTORY, DEFAULT_EXPENSES } from './data';
import { useSupabaseTable } from './hooks/useSupabaseTable';
import { useSupabaseShowtimes } from './hooks/useSupabaseShowtimes';
import { useSupabaseOccupiedSeats } from './hooks/useSupabaseOccupiedSeats';
import {
  movieToRow, rowToMovie,
  snackToRow, rowToSnack,
  promoToRow, rowToPromo,
  saleToRow, rowToSale,
  expenseToRow, rowToExpense,
} from './lib/mappers';

// Construye el mapa inicial de asientos ocupados a partir de los datos de ejemplo
// (solo se usa la primera vez, para sembrar la base de datos en Supabase)
function buildInitialOccupiedSeats(): Record<string, Record<string, 'vendido' | 'apartado'>> {
  const initial: Record<string, Record<string, 'vendido' | 'apartado'>> = {};
  Object.keys(OCCUPIED_SEATS_BY_SHOWTIME).forEach(k => {
    initial[k] = {};
    OCCUPIED_SEATS_BY_SHOWTIME[k].forEach(seatId => {
      const isApartado = seatId.endsWith('3') || seatId.endsWith('7');
      initial[k][seatId] = isApartado ? 'apartado' : 'vendido';
    });
  });
  return initial;
}

export default function App() {
  // Estado del sistema, ahora respaldado por Supabase (base de datos en la nube)
  // en lugar de localStorage. Cada hook carga los datos al iniciar, los mantiene
  // sincronizados en tiempo real entre todas las personas que visiten el sitio,
  // y guarda los cambios automáticamente.
  const [movies, setMovies] = useSupabaseTable<Movie>('movies', movieToRow, rowToMovie, MOVIES);

  const [showtimes, setShowtimes] = useSupabaseShowtimes(SHOWTIMES);

  const { occupiedSeats, setOccupiedSeats, confirmPurchase } = useSupabaseOccupiedSeats(buildInitialOccupiedSeats());

  const [snackItems, setSnackItems] = useSupabaseTable<SnackItem>('snack_items', snackToRow, rowToSnack, SNACK_ITEMS);

  const [promoCodes, setPromoCodes] = useSupabaseTable<PromoCode>('promo_codes', promoToRow, rowToPromo, DEFAULT_PROMO_CODES);

  const [salesHistory, setSalesHistory] = useSupabaseTable<SaleRecord>('sales_history', saleToRow, rowToSale, DEFAULT_SALES_HISTORY);

  const [expenses, setExpenses] = useSupabaseTable<ExpenseRecord>('expenses', expenseToRow, rowToExpense, DEFAULT_EXPENSES);

  // Mensaje de error a mostrar si alguien intenta comprar un asiento que
  // alguien más acaba de comprar (puede pasar si dos personas compran al
  // mismo tiempo). Null = no hay error.
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Navigation & Search States
  const [currentTab, setCurrentTab] = useState<string>('movies');
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const ADMIN_PASSWORD = 'CinePop2026$';
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Booking details configuration
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [cartSnacks, setCartSnacks] = useState<CartSnack[]>([]);

  // Progress flow step tracking
  const [bookingStep, setBookingStep] = useState<BookingStep>('movie-selection');
  const [isPurchased, setIsPurchased] = useState<boolean>(false);

  const snackMoviePlaceholder = movies[0] || {
    id: 'placeholder',
    title: 'Cine Pop Dulcería',
    genre: 'Gourmet',
    duration: '0',
    rating: 'G',
    description: '',
    posterUrl: '',
    trailerUrl: '',
    bannerUrl: '',
    isFeatured: false,
    ratingScore: '5.0'
  };

  const snackShowtimePlaceholder = {
    id: 'placeholder-showtime',
    time: '8:30',
    cinema: 'Dulcería',
    date: 'Hoy',
    priceStandard: 0,
    priceVip: 0
  };

  // Listen to URL hash to support direct #admin access
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentTab('admin');
      } else if (window.location.hash === '#movies' || window.location.hash === '') {
        setCurrentTab('movies');
      }
    };

    // Check on initial mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-select first movie on launch or when system movies change
  useEffect(() => {
    if (movies.length > 0) {
      const stillExists = selectedMovie ? movies.some(m => m.id === selectedMovie.id) : false;
      if (!stillExists) {
        setSelectedMovie(movies[0]);
        setSelectedShowtime(null);
      }
    } else {
      setSelectedMovie(null);
      setSelectedShowtime(null);
    }
  }, [movies, selectedMovie]);

  // Reset reservation state to book again
  const handleResetBooking = () => {
    setSelectedSeats([]);
    setCartSnacks([]);
    setIsPurchased(false);
    setBookingStep('movie-selection');
    setCurrentTab('movies');
  };

  const handleReleaseAllShowtimesSeats = () => {
    setOccupiedSeats({});
    setSelectedSeats([]);
  };

  // Pre-load copy action helper for coupons
  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`¡Cupón "${code}" copiado al portapapeles! Úsalo al pagar para obtener tu descuento.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-red selection:text-white">

      {/* Navbar segment */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          // If standalone Food tab is clicked, direct to snack catalog immediately
          if (tab === 'food') {
            setBookingStep('snacks-selection');
          } else if (tab === 'movies') {
            setBookingStep('movie-selection');
            setSelectedSeats([]);
            setCartSnacks([]);
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-24 pb-16">

        {/* Render Tab Contents */}
        {currentTab === 'movies' && (
          <div className="space-y-6">

            {/* Steps Progress Indicator */}
            {!isPurchased && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold text-neutral-900 text-base font-sans tracking-tight leading-none">Reserva de Entradas</h1>
                    <span className="text-[11px] text-neutral-400 font-medium">Sigue los pasos secuenciales de compra</span>
                  </div>
                </div>

                {/* Steps markers row */}
                <div className="flex items-center gap-1.5 xs:gap-2.5 font-sans text-[11px] font-bold">

                  {/* Step 1 marker */}
                  <button
                    onClick={() => {
                      if (bookingStep !== 'movie-selection') {
                        setBookingStep('movie-selection');
                        setSelectedShowtime(null);
                        setSelectedSeats([]);
                        setCartSnacks([]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${bookingStep === 'movie-selection'
                      ? 'bg-brand-red text-white border-brand-red shadow-sm'
                      : 'bg-slate-50 text-neutral-600 hover:bg-neutral-100 border-slate-200'
                      }`}
                  >
                    1. Cartelera
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 shrink-0" />

                  {/* Step 2 marker */}
                  <button
                    disabled={!selectedShowtime}
                    onClick={() => {
                      if (bookingStep !== 'seat-selection') {
                        setBookingStep('seat-selection');
                        setSelectedSeats([]);
                        setCartSnacks([]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${bookingStep === 'seat-selection'
                      ? 'bg-brand-red text-white border-brand-red shadow-sm'
                      : !selectedShowtime
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 text-neutral-400 border-slate-200'
                        : 'bg-slate-50 text-neutral-600 hover:bg-neutral-100 border-slate-200'
                      }`}
                  >
                    2. Butacas
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 shrink-0" />

                  {/* Step 3 marker */}
                  <button
                    disabled={selectedSeats.length === 0}
                    onClick={() => {
                      if (bookingStep !== 'snacks-selection') {
                        setBookingStep('snacks-selection');
                        setCartSnacks([]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${bookingStep === 'snacks-selection'
                      ? 'bg-brand-red text-white border-brand-red shadow-sm'
                      : selectedSeats.length === 0
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 text-neutral-400 border-slate-200'
                        : 'bg-slate-50 text-neutral-600 hover:bg-neutral-100 border-slate-200'
                      }`}
                  >
                    3. Snacks
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 shrink-0" />

                  {/* Step 4 marker */}
                  <button
                    disabled={selectedSeats.length === 0}
                    onClick={() => {
                      setBookingStep('checkout-confirmation');
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${bookingStep === 'checkout-confirmation'
                      ? 'bg-brand-red text-white border-brand-red shadow-sm'
                      : selectedSeats.length === 0
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 text-neutral-400 border-slate-200'
                        : 'bg-slate-50 text-neutral-600 hover:bg-neutral-100 border-slate-200'
                      }`}
                  >
                    4. Pago
                  </button>

                </div>
              </div>
            )}

            {/* Stepper Logic implementation */}
            {bookingStep === 'movie-selection' && (
              <MovieSelector
                movies={movies}
                showtimes={showtimes}
                searchQuery={searchQuery}
                selectedMovie={selectedMovie}
                setSelectedMovie={setSelectedMovie}
                selectedShowtime={selectedShowtime}
                setSelectedShowtime={setSelectedShowtime}
                onContinue={() => setBookingStep('seat-selection')}
              />
            )}

            {bookingStep === 'seat-selection' && selectedMovie && selectedShowtime && (
              <SeatMap
                movie={selectedMovie}
                showtime={selectedShowtime}
                selectedSeats={selectedSeats}
                setSelectedSeats={setSelectedSeats}
                occupiedSeats={occupiedSeats}
                onReleaseAllSeats={() => {
                  setOccupiedSeats(prev => ({
                    ...prev,
                    [selectedShowtime.id]: {}
                  }));
                  setSelectedSeats([]);
                }}
                onNextStep={() => setBookingStep('snacks-selection')}
              />
            )}

            {bookingStep === 'snacks-selection' && selectedMovie && selectedShowtime && (
              <SnackMenu
                movie={selectedMovie}
                showtime={selectedShowtime}
                selectedSeats={selectedSeats}
                cartSnacks={cartSnacks}
                setCartSnacks={setCartSnacks}
                snackItems={snackItems}
                onPrevStep={() => setBookingStep('seat-selection')}
                onNextStep={() => setBookingStep('checkout-confirmation')}
              />
            )}

            {bookingStep === 'checkout-confirmation' && selectedMovie && selectedShowtime && (
              <CheckoutSummary
                movie={selectedMovie}
                showtime={selectedShowtime}
                selectedSeats={selectedSeats}
                cartSnacks={cartSnacks}
                onPrevStep={() => setBookingStep('snacks-selection')}
                isPurchased={isPurchased}
                promoCodes={promoCodes}
                onPurchaseComplete={async (details) => {
                  // Construct a real sales log record
                  const newSale: SaleRecord = {
                    id: details.id,
                    date: new Date().toISOString().split('T')[0],
                    movieTitle: selectedMovie.title,
                    showtimeTime: selectedShowtime.time,
                    showtimeCinema: selectedShowtime.cinema,
                    showtimeDate: selectedShowtime.date,
                    seats: [...selectedSeats],
                    snacks: [...cartSnacks],
                    subtotal: details.subtotal,
                    discount: details.discount,
                    total: details.total,
                    paymentMethod: details.paymentMethod,
                    customerDoc: details.docNum,
                    customerPhone: details.phone,
                    bankName: details.bankName
                  };

                  // Confirma la compra de forma atómica en el servidor: revisa
                  // y reserva los asientos en una sola operación indivisible,
                  // evitando que dos personas compren el mismo asiento a la vez.
                  setPurchaseError(null);
                  const result = await confirmPurchase(selectedShowtime.id, selectedSeats.map(s => s.id), newSale);

                  if (result.success) {
                    setIsPurchased(true);
                  } else if (result.error === 'seat_taken') {
                    setPurchaseError(
                      `El asiento ${result.seat_id} ya fue comprado por otra persona justo antes que tú. Por favor regresa y elige otro asiento.`
                    );
                  } else {
                    setPurchaseError('No se pudo confirmar la compra por un problema de conexión. Intenta de nuevo.');
                  }
                }}
              />
            )}

            {/* Aviso si la compra no se pudo confirmar (ej. asiento tomado por otra persona) */}
            {purchaseError && !isPurchased && (
              <div className="bg-red-50 border border-red-300 text-red-700 text-sm font-medium rounded-xl p-4 flex items-start gap-3">
                <span className="font-bold">⚠</span>
                <div className="flex-1">
                  {purchaseError}
                  <button
                    onClick={() => {
                      setPurchaseError(null);
                      setBookingStep('seat-selection');
                    }}
                    className="block mt-2 text-xs font-bold uppercase text-brand-red underline"
                  >
                    Elegir otro asiento
                  </button>
                </div>
              </div>
            )}

            {/* If purchased, show ticket with a restart purchase button */}
            {isPurchased && (
              <div className="text-center pt-2">
                <button
                  onClick={handleResetBooking}
                  className="px-6 py-3 border border-brand-red text-brand-red font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-red hover:text-white transition-all duration-200 shadow-md shadow-brand-red/[0.05]"
                >
                  Reservar Otra Función de Cine
                </button>
              </div>
            )}

          </div>
        )}

        {/* Tab Admin */}
        {currentTab === 'admin' && (
          <MovieAdminPanel
            movies={movies}
            setMovies={setMovies}
            showtimes={showtimes}
            setShowtimes={setShowtimes}
            snackItems={snackItems}
            setSnackItems={setSnackItems}
            promoCodes={promoCodes}
            setPromoCodes={setPromoCodes}
            occupiedSeats={occupiedSeats}
            setOccupiedSeats={setOccupiedSeats}
            onReleaseAllShowtimesSeats={handleReleaseAllShowtimesSeats}
            salesHistory={salesHistory}
            setSalesHistory={setSalesHistory}
            expenses={expenses}
            setExpenses={setExpenses}
          />
        )}

        {/* Tab Cinemas */}
        {currentTab === 'cinemas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-sans text-neutral-900 tracking-tight flex items-center gap-2">
                  <MapPin className="text-brand-red w-6 h-6" />
                  Nuestra Única Sala de Cine
                </h2>
                <p className="text-xs text-neutral-500 font-medium">Disfruta la mejor experiencia de cine en Sabana de Torres, Santander</p>
              </div>
              <span className="text-xs text-brand-red bg-brand-red/5 border border-brand-red/20 font-bold px-3 py-1.5 rounded-full select-none flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                Detección IP: Sabana de Torres, Santander
              </span>
            </div>

            <div className="max-w-xl mx-auto">

              {/* Cine Único */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-56 bg-slate-100 relative">
                  <img
                    src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80"
                    alt="Cine Pop Sabana de Torres"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 right-3 bg-brand-red text-white text-[9px] font-extrabold px-2.5 py-1 rounded">
                    SALA 1 DISPONIBLE
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-neutral-900">Cine Pop - Sabana de Torres</h3>
                    <p className="text-xs text-neutral-500">Carrera 11 # 12-34, Barrio Centro, Sabana de Torres, Santander, Colombia</p>
                  </div>
                  <div className="text-xs text-neutral-600 bg-slate-50 p-4 rounded-xl space-y-2">
                    <p>🍿 <strong>Formato de Sala:</strong> XD Laser con Sonido Dolby Digital Surround.</p>
                    <p>🕒 <strong>Horario Boletería:</strong> Lunes a Domingo de 2:00 PM a 10:30 PM.</p>
                    <p>🛋️ <strong>Butacas:</strong> 100% Reclinables de Eco-cuero con sección Preferencial VIP.</p>
                    <p>📍 <strong>Ubicación:</strong> Sabana de Torres, Santander.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentTab('movies');
                      setBookingStep('movie-selection');
                    }}
                    className="w-full py-3 rounded-xl bg-brand-red text-white hover:bg-brand-red-dark text-xs font-bold transition-all uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
                  >
                    Ver Cartelera y Funciones
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Promos */}
        {currentTab === 'promos' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-sans text-neutral-900 tracking-tight flex items-center gap-2">
                <Tag className="text-brand-red w-6 h-6" />
                Vouchers y Promociones Cine Pop
              </h2>
              <p className="text-xs text-neutral-500 font-medium">Disfruta el mejor cine con ofertas exclusivas en combos y entradas</p>
            </div>

            <div className="space-y-4">

              {/* Promo 2x1 Miércoles */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-300 transition-all">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 font-black text-xl shrink-0">
                    2x1
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                      Miércoles de Película 2x1
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        RECURRENTE
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500 leading-normal max-w-xl">
                      Todos los miércoles paga una entrada estándar y recibe la segunda completamente gratis. Aplica el cupón en tu reserva en línea.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4.5 py-2 font-mono font-bold text-sm tracking-widest text-slate-650">
                    CINEPOP
                  </div>
                  <button
                    onClick={() => handleCopyCoupon('CINEPOP')}
                    className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap active:scale-95"
                  >
                    Copiar Código
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Food standalone */}
        {currentTab === 'food' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-sans text-neutral-900 tracking-tight flex items-center gap-2">
                <ShoppingBag className="text-brand-red w-6 h-6" />
                Dulcería Gourmet Cine Pop
              </h2>
              <p className="text-xs text-neutral-500 font-medium">Añade deliciosos combos calientes y recógelos sin esperar en fila</p>
            </div>

            <SnackMenu
              movie={selectedMovie || snackMoviePlaceholder}
              showtime={selectedShowtime || snackShowtimePlaceholder}
              selectedSeats={selectedSeats}
              cartSnacks={cartSnacks}
              setCartSnacks={setCartSnacks}
              snackItems={snackItems}
              onPrevStep={() => {
                setCurrentTab('movies');
                setBookingStep('movie-selection');
              }}
              onNextStep={() => {
                setCurrentTab('movies');
                setBookingStep('movie-selection');
              }}
            />
          </div>
        )}

      </main>

      {/* Styled Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs text-neutral-400">
          <div className="space-y-1.5">
            <span className="font-extrabold text-neutral-700 block text-sm select-none">
              Cine Pop Premium Experience
            </span>
            <p className="max-w-md text-[11px] leading-relaxed select-none">
              Inspirado en la prestigiosa experiencia premium para la selección integrada de asientos y combos de alimentos en Sabana de Torres, Santander, con un diseño de alta legibilidad, contraste y elegancia editorial.
            </p>
          </div>

          <div className="space-y-2 md:text-right flex flex-col items-center md:items-end">
            <p className="font-semibold text-neutral-600 select-none">© 2026 Cine Pop Inc.</p>
            <p className="text-[11px] select-none">Todos los derechos reservados. Desarrollado en AI Studio.</p>
            <a
              href="#admin"
              className="mt-1 text-[10px] font-bold text-slate-500 hover:text-brand-red uppercase tracking-wider transition-all flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg"
            >
              <span>Acceso Administrativo (#admin)</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
