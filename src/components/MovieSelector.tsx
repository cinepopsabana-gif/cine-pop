import { Clock, Star, Film, Volume2, ShieldAlert } from 'lucide-react';
import { Movie, Showtime } from '../types';
import { formatPrice } from '../utils';

interface MovieSelectorProps {
  movies: Movie[];
  showtimes: Record<string, Showtime[]>;
  searchQuery: string;
  selectedMovie: Movie | null;
  setSelectedMovie: (movie: Movie | null) => void;
  selectedShowtime: Showtime | null;
  setSelectedShowtime: (showtime: Showtime | null) => void;
  onContinue: () => void;
}

export default function MovieSelector({
  movies,
  showtimes,
  searchQuery,
  selectedMovie,
  setSelectedMovie,
  selectedShowtime,
  setSelectedShowtime,
  onContinue
}: MovieSelectorProps) {
  // Filter movies by search query
  const filteredMovies = movies.filter(movie => 
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getMovieShowtimes = (movieId: string): Showtime[] => {
    return showtimes[movieId] || [];
  };

  const activeMovie = selectedMovie || (filteredMovies.length > 0 ? filteredMovies[0] : null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: Movies Grid (6 or 7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-sans tracking-tight text-neutral-900">
            {searchQuery ? `Resultados de "${searchQuery}"` : 'En Cartelera Estreno'}
          </h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            {filteredMovies.length} {filteredMovies.length === 1 ? 'Película' : 'Películas'}
          </span>
        </div>

        {filteredMovies.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <Film className="w-12 h-12 mx-auto text-neutral-300" />
            <h3 className="font-bold text-neutral-800">No encontramos resultados</h3>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              Intenta buscar por otro título, género o de la lista de películas para ver horarios disponibles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMovies.map((movie) => {
              const isSelected = activeMovie?.id === movie.id;
              return (
                <div
                  key={movie.id}
                  onClick={() => {
                    setSelectedMovie(movie);
                    setSelectedShowtime(null); // Reset when movie changes
                  }}
                  className={`group rounded-xl overflow-hidden border cursor-pointer bg-white transition-all duration-300 ${
                    isSelected
                      ? 'border-brand-red ring-2 ring-brand-red/10 shadow-lg scale-[1.01]'
                      : 'border-slate-200/80 hover:border-slate-350 hover:shadow-md'
                  }`}
                >
                  <div className="flex h-44">
                    {/* Poster */}
                    <div className="w-1/3 relative bg-slate-100 overflow-hidden flex-shrink-0">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-charcoal/80 backdrop-blur-md text-white rounded px-1.5 py-0.5 text-[9px] font-bold">
                        {movie.rating}
                      </div>
                    </div>

                    {/* Movie info */}
                    <div className="w-2/3 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-bold text-sm text-neutral-900 group-hover:text-brand-red transition-colors line-clamp-2 leading-tight">
                            {movie.title}
                          </h3>
                          <div className="flex items-center gap-0.5 text-amber-500 shrink-0 font-medium text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>{movie.ratingScore}</span>
                          </div>
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {movie.genre.slice(0, 2).map((g) => (
                            <span key={g} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer info keys */}
                      <div className="space-y-1 bg-slate-50 p-2 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{movie.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                          <Film className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate">{movie.formats.join(' • ')}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Promotions Block */}
        <div className="p-5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0">
            <Star className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-teal-900 font-sans">¡Asegura tu Butaca Online!</h4>
            <p className="text-xs text-teal-700 leading-normal">
              Reserva tus sillas de forma gratuita en línea y paga cómodamente en taquilla o mediante transferencia PSE al instante.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Selected Movie Showtimes & Schedules (5 cols) */}
      <div className="lg:col-span-5">
        {activeMovie ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 sticky top-28">
            <div className="flex gap-4">
              <div className="w-20 h-28 rounded-lg bg-slate-100 overflow-hidden shadow-sm border border-slate-200 shrink-0">
                <img
                  src={activeMovie.posterUrl}
                  alt={activeMovie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-brand-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ESTRENO
                  </span>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {activeMovie.rating}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-neutral-900 leading-tight">
                  {activeMovie.title}
                </h3>
                <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">
                  {activeMovie.description}
                </p>
              </div>
            </div>

            {/* Formats and Audio selection */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Formatos de Sala</span>
                <div className="flex gap-1">
                  {activeMovie.formats.map(f => (
                    <span key={f} className="text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold border border-slate-200">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Idiomas de Audio</span>
                <div className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-xs text-neutral-700 font-medium">
                    {activeMovie.languages.join(' • ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Showtimes slots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Horarios de Función</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  ENTRADAS DISPONIBLES
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {getMovieShowtimes(activeMovie.id).map((showtime) => {
                  const isShowtimeSelected = selectedShowtime?.id === showtime.id;
                  return (
                    <button
                      key={showtime.id}
                      onClick={() => setSelectedShowtime(showtime)}
                      className={`text-left p-4 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                        isShowtimeSelected
                          ? 'border-brand-red bg-brand-red/[0.03] shadow-sm'
                          : 'border-slate-200 hover:border-slate-350 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-neutral-900 group-hover:text-brand-red">
                            {showtime.time}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {showtime.cinema}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 flex items-center gap-1">
                          <span>{showtime.date}</span>
                        </p>
                      </div>

                      <div className="text-right space-y-0.5 shrink-0">
                        <span className="block text-[10px] text-neutral-400 uppercase tracking-widest leading-none font-bold">Desde</span>
                        <span className="text-sm font-bold text-brand-red block">
                          {formatPrice(showtime.priceStandard)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation action */}
            {selectedShowtime ? (
              <button
                onClick={onContinue}
                className="w-full py-4 bg-brand-red text-white uppercase tracking-wider font-bold rounded-xl text-xs hover:bg-brand-red-dark hover:shadow-lg hover:shadow-brand-red/10 transition-all duration-300 flex justify-center items-center gap-2"
              >
                <span>Comenzar Selección de Asientos</span>
                <Star className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2.5 text-xs text-neutral-500 leading-normal">
                <ShieldAlert className="w-5 h-5 text-neutral-400 shrink-0" />
                <span>Selecciona uno de los horarios disponibles de arriba para proceder a la selección de tus butacas.</span>
              </div>
            )}

          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-2xl border border-dashed border-slate-200/85 p-12 text-center text-neutral-400 flex flex-col justify-center items-center">
            <Film className="w-10 h-10 mb-2 opacity-50" />
            <p className="font-medium text-sm">Selecciona una película</p>
          </div>
        )}
      </div>

    </div>
  );
}
