import { useState } from 'react';
import { Calendar, MapPin, X, ArrowRight, Star, Clock, Trash2 } from 'lucide-react';
import { Movie, Showtime, SelectedSeat } from '../types';
import { formatPrice } from '../utils';
import { SEAT_ROWS, SEAT_COLS_LEFT, SEAT_COLS_RIGHT, doesSeatExist } from '../seatConfig';

interface SeatMapProps {
  movie: Movie;
  showtime: Showtime;
  selectedSeats: SelectedSeat[];
  setSelectedSeats: (seats: SelectedSeat[]) => void;
  occupiedSeats: Record<string, Record<string, 'vendido' | 'apartado'>>;
  onReleaseAllSeats: () => void;
  onNextStep: () => void;
}

export default function SeatMap({
  movie,
  showtime,
  selectedSeats,
  setSelectedSeats,
  occupiedSeats,
  onReleaseAllSeats,
  onNextStep
}: SeatMapProps) {
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const rows = SEAT_ROWS;
  const colsLeft = SEAT_COLS_LEFT;
  const colsRight = SEAT_COLS_RIGHT;
  
  // Preferential rows are empty (no preferential seats)
  const vipRows: string[] = [];


  // Get occupied seats for the selected showtime, or default
  const occupiedList = occupiedSeats[showtime.id] || {};

  const handleSeatClick = (row: string, colNum: number) => {
    const seatId = `${row}${colNum}`;
    const isVip = vipRows.includes(row);
    const seatPrice = isVip ? showtime.priceVip : showtime.priceStandard;

    const exists = selectedSeats.some(s => s.id === seatId);

    if (exists) {
      // Remove
      setSelectedSeats(selectedSeats.filter(s => s.id !== seatId));
    } else {
      // Add (limit to 10 seats per booking)
      if (selectedSeats.length >= 10) {
        alert('Puedes reservar un máximo de 10 asientos por transacción.');
        return;
      }
      setSelectedSeats([
        ...selectedSeats,
        {
          id: seatId,
          row,
          number: colNum,
          type: isVip ? 'Preferential' : 'Standard',
          price: seatPrice
        }
      ]);
    }
  };

  const getSeatStatus = (row: string, colNum: number) => {
    const seatId = `${row}${colNum}`;
    const occupiedStatus = occupiedList[seatId];
    if (occupiedStatus) return occupiedStatus; // 'vendido' or 'apartado'
    if (selectedSeats.some(s => s.id === seatId)) return 'selected';
    if (vipRows.includes(row)) return 'preferential';
    return 'standard';
  };

  const totalAmount = selectedSeats.reduce((acc, seat) => acc + seat.price, 0);

  // Sorted list of seats
  const sortedSelectedSeats = [...selectedSeats].sort((a, b) => {
    if (a.row !== b.row) return a.row.localeCompare(b.row);
    return a.number - b.number;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Block: Interactive Seat Canvas (8 Cols on large screens) */}
      <section className="lg:col-span-8 flex flex-col items-center w-full rounded-2xl p-6 sm:p-8 border border-neutral-200 bg-white shadow-sm relative overflow-hidden">
        
        {/* Curved Screen Visualization */}
        <div className="w-full max-w-2xl mb-12 flex flex-col items-center">
          <div className="w-full h-8 border-t-4 border-slate-300 screen-curve bg-gradient-to-b from-slate-100/50 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-transparent blur-sm"></div>
          </div>
          <p className="font-sans text-[10px] text-neutral-400 mt-2 tracking-[0.25em] uppercase font-bold">
            PANTALLA XD / PREMIERE STAGE
          </p>
        </div>

         {/* Dynamic Seat Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-2xl mb-12 font-sans text-[11px] font-semibold bg-slate-50 px-6 py-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-6 rounded-t-lg bg-neutral-100 border border-slate-200" />
              <span className="text-neutral-500">Estándar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-6 rounded-t-lg bg-brand-red border border-brand-red shadow-[0_2px_8px_rgba(225,25,50,0.3)]" />
              <span className="text-neutral-800">Seleccionado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-6 rounded-t-lg bg-emerald-500 border border-emerald-600 shadow-xs" />
              <span className="text-emerald-700">Vendido (Verde)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-6 rounded-t-lg bg-amber-500 border border-amber-600 shadow-xs" />
              <span className="text-amber-700">Apartado (Reserva)</span>
            </div>
          </div>
        </div>

        {/* Seat grid wrapper with ENTRADA (black vertical line on the right) */}
        <div className="w-full overflow-x-auto hide-scrollbar flex flex-col items-center pb-4">
          <div className="flex items-stretch gap-6 px-4">
            {/* The actual seating grid */}
            <div className="min-w-[580px] space-y-3.5">
              {rows.map((row) => {
                return (
                  <div key={row} className="flex items-center justify-between gap-4">
                    {/* Row Code Left */}
                    <div className="w-5 text-center font-mono text-xs font-bold text-neural-400">
                      {row}
                    </div>

                    {/* Left Block Seating */}
                    <div className="flex gap-2">
                      {colsLeft.map((col) => {
                        const exists = doesSeatExist(row, col);
                        if (!exists) {
                          return <div key={`${row}-${col}`} className="w-7.5 h-8.5" />;
                        }

                        const status = getSeatStatus(row, col);
                        const isOccupied = status === 'vendido' || status === 'apartado';
                        
                        return (
                          <button
                            key={`${row}-${col}`}
                            disabled={isOccupied}
                            onClick={() => handleSeatClick(row, col)}
                            title={`${row}${col} - ${status === 'vendido' ? 'Vendido' : status === 'apartado' ? 'Apartado / Reservado' : status === 'preferential' ? 'Preferencial VIP' : 'Estándar'}`}
                            className={`seat w-7.5 h-8.5 rounded-t-md border flex items-center justify-center text-[9px] font-bold transition-all duration-200 outline-none select-none
                              ${status === 'vendido' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs' : ''}
                              ${status === 'apartado' ? 'bg-amber-500 border-amber-600 text-white shadow-xs' : ''}
                              ${status === 'selected' ? 'bg-brand-red border-brand-red text-white shadow-[0_2px_8px_rgba(225,25,50,0.35)]' : ''}
                              ${status === 'preferential' ? 'bg-amber-50/20 border-2 border-brand-yellow text-amber-600 focus:ring-1 focus:ring-amber-400' : ''}
                              ${status === 'standard' ? 'bg-slate-50 border-slate-200 text-neutral-400 hover:bg-slate-100 hover:border-slate-300 focus:ring-1 focus:ring-brand-red/30' : ''}
                            `}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>

                    {/* Pasillo central (Aisle) */}
                    <div className="w-8 flex items-center justify-center">
                      <span className="h-4 w-px bg-slate-200" />
                    </div>

                    {/* Right Block Seating */}
                    <div className="flex gap-2">
                      {colsRight.map((col) => {
                        const exists = doesSeatExist(row, col);
                        if (!exists) {
                          return <div key={`${row}-${col}`} className="w-7.5 h-8.5" />;
                        }

                        const status = getSeatStatus(row, col);
                        const isOccupied = status === 'vendido' || status === 'apartado';
                        
                        return (
                          <button
                            key={`${row}-${col}`}
                            disabled={isOccupied}
                            onClick={() => handleSeatClick(row, col)}
                            title={`${row}${col} - ${status === 'vendido' ? 'Vendido' : status === 'apartado' ? 'Apartado / Reservado' : status === 'preferential' ? 'Preferencial VIP' : 'Estándar'}`}
                            className={`seat w-7.5 h-8.5 rounded-t-md border flex items-center justify-center text-[9px] font-bold transition-all duration-200 outline-none select-none
                              ${status === 'vendido' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs' : ''}
                              ${status === 'apartado' ? 'bg-amber-500 border-amber-600 text-white shadow-xs' : ''}
                              ${status === 'selected' ? 'bg-brand-red border-brand-red text-white shadow-[0_2px_8px_rgba(225,25,50,0.35)]' : ''}
                              ${status === 'preferential' ? 'bg-amber-50/20 border-2 border-brand-yellow text-amber-600 focus:ring-1 focus:ring-amber-400' : ''}
                              ${status === 'standard' ? 'bg-slate-50 border-slate-200 text-neutral-400 hover:bg-slate-100 hover:border-slate-300 focus:ring-1 focus:ring-brand-red/30' : ''}
                            `}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>

                    {/* Row Code Right */}
                    <div className="w-5 text-center font-mono text-xs font-bold text-neural-400">
                      {row}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Entrance Indicator (Thick black vertical line on the right) */}
            <div className="flex flex-col items-center justify-between py-2 pl-5 pr-1 border-l-4 border-neutral-950 select-none animate-fade-in shrink-0">
              <span className="text-sm font-sans">🚪</span>
              <span className="[writing-mode:vertical-lr] font-sans font-black text-[10px] uppercase tracking-[0.2em] text-neutral-900 my-auto">
                ENTRADA PRINCIPAL
              </span>
              <span className="text-sm font-sans">🚪</span>
            </div>
          </div>
        </div>

        {/* Blue Curved Screen at the Bottom (representing the screen at the front) */}
        <div className="w-full max-w-2xl mt-8 mb-4 flex flex-col items-center">
          <p className="font-sans text-[10px] text-blue-500 tracking-[0.25em] uppercase font-extrabold mb-2.5 animate-pulse">
            🎬 PANTALLA (FRENTE DE LA SALA)
          </p>
          <div className="w-full h-7 border-b-4 border-blue-500 rounded-b-[70px] bg-gradient-to-t from-blue-50/70 to-transparent relative overflow-hidden opacity-90 shadow-[0_6px_16px_rgba(59,130,246,0.18)]">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/15 to-transparent blur-xs"></div>
          </div>
        </div>

        {/* Subtle Seat Warnings */}
        <p className="text-[11px] text-neutral-400 mt-4 max-w-md text-center leading-normal">
          Todas las filas cuentan con amplias butacas reclinables de cuero ecológico y posavasos gigante en todas las locaciones.
        </p>

      </section>

      {/* Right Block: Selection Summary Receipt Card (4 Cols) */}
      <aside className="lg:col-span-4 sticky top-28 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm relative">
          
          {/* Subtle brand ribbon header gradient */}
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-red" />
          
          {/* Film Heading header card */}
          <div className="p-5 border-b border-neutral-100 bg-slate-50/30 flex gap-4">
            <div className="w-16 h-22 rounded-md bg-slate-100 overflow-hidden shadow-sm shrink-0 border border-slate-200">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-neutral-900 truncate leading-tight font-sans text-base">
                {movie.title}
              </h4>
              <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">
                Cine Pop • {movie.languages[0] || 'SUB'}
              </p>
              
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] bg-slate-800 text-slate-100 font-extrabold tracking-wide px-1.5 py-0.5 rounded uppercase">
                  {movie.rating}
                </span>
                <span className="text-[9px] text-amber-600 font-bold bg-amber-50 border border-brand-yellow/30 px-1.5 py-0.5 rounded gap-1 flex items-center">
                  <Star className="w-2.5 h-2.5 fill-brand-yellow text-brand-yellow" />
                  IMAX VIP
                </span>
              </div>
            </div>
          </div>

          {/* Exhibition detail listings */}
          <div className="p-4 bg-slate-50/50 border-b border-neutral-100 font-sans text-xs space-y-2.5 text-neutral-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-red shrink-0" />
              <span>{showtime.date} • <strong className="text-neutral-900">{showtime.time} PM</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-red shrink-0" />
              <span className="truncate">{showtime.cinema} • Sabana de Torres</span>
            </div>
          </div>

          {/* Dynamic lists of selected seats */}
          <div className="p-5 min-h-[140px] space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-sans">
                Butacas Seleccionadas
              </h5>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                selectedSeats.length > 0 ? 'bg-brand-red/10 text-brand-red' : 'bg-slate-100 text-neutral-400'
              }`}>
                {selectedSeats.length} / 10
              </span>
            </div>

            {sortedSelectedSeats.length === 0 ? (
              <div className="text-center py-7 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40 text-neutral-400 flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  A1
                </div>
                <p className="text-xs">Selecciona asitentes en el mapa de salas de la izquierda.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {sortedSelectedSeats.map((seat) => {
                  const isVip = seat.type === 'Preferential';
                  return (
                    <div
                      key={seat.id}
                      className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200 transition-colors animate-fade-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base font-extrabold text-neutral-900 w-8">
                          {seat.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-200/60 text-neutral-600">
                          Estándar
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-neutral-700 font-sans">
                          {formatPrice(seat.price)}
                        </span>
                        <button
                          onClick={() => setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id))}
                          className="text-neutral-400 hover:text-brand-red p-1 hover:bg-neutral-200/50 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing total and checkout button */}
          <div className="p-5 bg-slate-50 border-t border-slate-200">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-xs text-neutral-500 font-bold uppercase font-sans">Total Entrada</span>
              <span className="text-2xl font-black text-neutral-900 font-sans tracking-tight">
                {formatPrice(totalAmount)}
              </span>
            </div>

            <button
              disabled={selectedSeats.length === 0}
              onClick={onNextStep}
              className="w-full py-4 rounded-xl bg-brand-red text-white uppercase tracking-wider font-bold text-xs hover:bg-brand-red-dark disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 transition-all duration-350 hover:shadow-lg hover:shadow-brand-red/10 flex justify-center items-center gap-2 active:scale-98"
            >
              <span>Siguiente: Snacks Dulcería</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </aside>

    </div>
  );
}
