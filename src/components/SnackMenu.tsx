import { Plus, Minus, ShoppingBag, ArrowRight, Utensils, Tag, Trash2, Ticket, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Movie, Showtime, SelectedSeat, SnackItem, CartSnack } from '../types';
import { formatPrice } from '../utils';

interface SnackMenuProps {
  movie: Movie;
  showtime: Showtime;
  selectedSeats: SelectedSeat[];
  cartSnacks: CartSnack[];
  setCartSnacks: (snacks: CartSnack[]) => void;
  snackItems: SnackItem[];
  onPrevStep: () => void;
  onNextStep: () => void;
}

export default function SnackMenu({
  movie,
  showtime,
  selectedSeats,
  cartSnacks,
  setCartSnacks,
  snackItems,
  onPrevStep,
  onNextStep
}: SnackMenuProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Combos' | 'Individual' | 'Drinks' | 'Sweets'>('All');

  const categories = [
    { id: 'All', label: 'Todo el Menú' },
    { id: 'Combos', label: 'Combos Cine Pop' },
    { id: 'Individual', label: 'Snacks y Comidas' },
    { id: 'Drinks', label: 'Bebidas' }
  ];

  const filteredSnacks = activeCategory === 'All'
    ? snackItems
    : snackItems.filter(s => s.category === activeCategory);

  const updateQuantity = (snack: SnackItem, delta: number) => {
    const existing = cartSnacks.find(item => item.snack.id === snack.id);
    if (existing) {
      const newQuantity = existing.quantity + delta;
      if (newQuantity <= 0) {
        setCartSnacks(cartSnacks.filter(item => item.snack.id !== snack.id));
      } else {
        setCartSnacks(cartSnacks.map(item => 
          item.snack.id === snack.id ? { ...item, quantity: newQuantity } : item
        ));
      }
    } else if (delta > 0) {
      setCartSnacks([...cartSnacks, { snack, quantity: 1 }]);
    }
  };

  const getQuantityInCart = (snackId: string) => {
    const item = cartSnacks.find(c => c.snack.id === snackId);
    return item ? item.quantity : 0;
  };

  const seatsTotal = selectedSeats.reduce((acc, seat) => acc + seat.price, 0);
  const snacksTotal = cartSnacks.reduce((acc, item) => acc + (item.snack.price * item.quantity), 0);
  const grandTotal = seatsTotal + snacksTotal;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* Left Block: Snack lists and filtering categories (8 cols) */}
      <section className="lg:col-span-8 space-y-6">
        
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-red-550 to-orange-500 rounded-2xl text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden" 
             style={{ backgroundColor: '#e11932' }}>
          {/* Subtle background glow circle */}
          <div className="absolute right-0 bottom-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none translate-x-12 translate-y-12"></div>
          
          <div className="space-y-1 z-10">
            <span className="text-[10px] bg-white/20 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
              Membresía Cine Pop Club
            </span>
            <h3 className="text-lg font-bold font-sans">Multiplica tus Puntos Cine Pop</h3>
            <p className="text-xs text-red-100 leading-normal max-w-md">
              Añade combos y bebidas a tu reserva digital para acumular un 2x en puntos canjeables por entradas gratis en tu próxima visita.
            </p>
          </div>
          <div className="bg-white/15 px-3 py-2 rounded-xl border border-white/20 z-10 shrink-0 select-none">
            <span className="block text-[8px] tracking-widest text-[#ffdb3c] uppercase font-bold text-center">Acumulas</span>
            <span className="font-bold text-base block text-center font-sans">+{Math.ceil(grandTotal * 1.5)} pts</span>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id as any)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                activeCategory === c.id
                  ? 'bg-brand-red text-white border-brand-red shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-neutral-600 border-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Snack Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredSnacks.map((item) => {
            const quantity = getQuantityInCart(item.id);
            const isAvailable = item.isAvailable !== false;
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden flex shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 ${
                  !isAvailable ? 'bg-slate-50/70 opacity-80 border-slate-200' : ''
                }`}
              >
                {/* Snack Image */}
                <div className={`w-1/3 relative bg-slate-50 flex-shrink-0 ${!isAvailable ? 'grayscale opacity-75' : ''}`}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {quantity > 0 && isAvailable && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-brand-red text-white font-bold text-xs flex items-center justify-center border border-white shadow-md">
                      {quantity}
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-neutral-900/45 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span className="bg-neutral-900 text-white font-black text-[9px] tracking-widest px-2 py-0.5 rounded uppercase">
                        Agotado
                      </span>
                    </div>
                  )}
                </div>

                {/* Content details description */}
                <div className="w-2/3 p-4 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className={`font-bold text-sm leading-tight line-clamp-1 ${
                        !isAvailable ? 'text-neutral-500 line-through' : 'text-neutral-900'
                      }`}>
                        {item.name}
                      </h4>
                      <span className={`font-bold text-sm whitespace-nowrap shrink-0 ${
                        !isAvailable ? 'text-neutral-400' : 'text-brand-red'
                      }`}>
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    <p className={`text-xs line-clamp-2 leading-relaxed ${
                      !isAvailable ? 'text-neutral-400' : 'text-neutral-400'
                    }`}>
                      {item.description}
                    </p>
                  </div>

                  {/* Increment/Decrement Buttons Layout */}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      {item.category === 'Combos' ? 'Combo' : 'Snack'}
                    </span>

                    <div className="flex items-center gap-2">
                      {!isAvailable ? (
                        <span className="px-2.5 py-1 bg-slate-200 border border-slate-300 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-wider select-none cursor-not-allowed">
                          No Disponible
                        </span>
                      ) : quantity > 0 ? (
                        <>
                          <button
                            onClick={() => updateQuantity(item, -1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 hover:border-brand-red bg-slate-50 hover:bg-brand-red/5 text-slate-500 hover:text-brand-red flex items-center justify-center transition-all focus:ring-1 focus:ring-brand-red/20"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-sm text-neutral-800 w-4 text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item, 1)}
                            className="w-8 h-8 rounded-lg bg-brand-red text-white flex items-center justify-center hover:bg-brand-red-dark transition-all focus:ring-1 focus:ring-brand-red/20 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => updateQuantity(item, 1)}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-brand-red text-brand-red bg-slate-50 hover:bg-brand-red/[0.04] text-xs font-bold transition-all flex items-center gap-1 focus:ring-1 focus:ring-brand-red/20"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Column: Reservation State & Checkout summary (4 cols) */}
      <aside className="lg:col-span-4 sticky top-28 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <h4 className="font-bold text-xs text-neutral-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-brand-red shrink-0" />
              {selectedSeats.length === 0 ? 'Catálogo de Dulcería' : 'Detalle de Reserva'}
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {selectedSeats.length === 0 ? 'Vista Libre' : 'Paso 3 de 4'}
            </span>
          </div>

          {/* Seat reservation billing summary */}
          {selectedSeats.length === 0 ? (
            <div className="p-4 border-b border-slate-100 bg-amber-50/40">
              <div className="flex gap-2 text-[11px] leading-relaxed text-amber-800 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <span>Modo Exploración Activo</span>
                  <p className="text-[10px] text-amber-700/90 font-medium leading-normal">
                    Puedes ver precios y combos libremente. Para comprar, primero debes elegir una película y tus entradas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-sans">
                  Entradas Seleccionadas
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-600 font-medium">
                  {selectedSeats.length} {selectedSeats.length === 1 ? 'Butaca Reservada' : 'Butacas Reservadas'}
                </span>
                <span className="font-bold text-neutral-900">{formatPrice(seatsTotal)}</span>
              </div>
              
              {/* Tiny list of seats tags */}
              <div className="flex flex-wrap gap-1">
                {selectedSeats.map(s => (
                  <span key={s.id} className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                    {s.id}({s.type === 'Preferential' ? 'VIP' : 'Std'})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Snack details selection */}
          <div className="p-4 border-b border-slate-100 space-y-3 min-h-[140px]">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-brand-red shrink-0" />
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-sans">
                Gourmet Dulcería (Combos)
              </span>
            </div>

            {cartSnacks.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 bg-slate-50/40 border border-dashed border-slate-200 rounded-xl space-y-1.5">
                <p className="text-xs">No has añadido snacks al carrito de compras.</p>
                <p className="text-[10px] text-neutral-400 leading-normal max-w-[220px] mx-auto">
                  La experiencia de cine es mejor con nuestro popcorn caliente hecho al instante.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cartSnacks.map((item) => (
                  <div key={item.snack.id} className="flex justify-between items-baseline text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-neutral-900 font-mono mr-1">{item.quantity}x</span>
                      <span className="text-neutral-600 font-medium truncate">{item.snack.name}</span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                      <span className="font-bold text-neutral-805">{formatPrice(item.snack.price * item.quantity)}</span>
                      <button 
                        onClick={() => updateQuantity(item.snack, -item.quantity)}
                        className="text-neutral-400 hover:text-brand-red p-0.5 hover:bg-neutral-100 rounded"
                        title="Eliminar del carrito"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-semibold uppercase tracking-wider">Subtotal Snacks</span>
                  <span className="font-bold text-brand-red">{formatPrice(snacksTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Grand total summaries and layout triggers */}
          <div className="p-5 bg-slate-50">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-xs text-neutral-500 font-bold uppercase font-sans">Suma Total</span>
              <span className="text-2xl font-black text-neutral-900 font-sans tracking-tight">
                {formatPrice(grandTotal)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onPrevStep}
                className="col-span-1 py-3 px-2 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all uppercase"
              >
                {selectedSeats.length === 0 ? 'Cartelera' : 'Volver'}
              </button>
              
              <button
                onClick={onNextStep}
                className="col-span-2 py-3 bg-brand-red text-white uppercase tracking-wider font-bold text-xs hover:bg-brand-red-dark hover:shadow-lg hover:shadow-brand-red/10 rounded-xl transition-all flex justify-center items-center gap-1.5 active:scale-98"
              >
                {selectedSeats.length === 0 ? (
                  <>
                    <span>Elegir Función</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Ir al Pago</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-center text-neutral-400 mt-3 flex items-center justify-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Garantía de reservas sin colas físicas</span>
            </p>
          </div>

        </div>
      </aside>

    </div>
  );
}
