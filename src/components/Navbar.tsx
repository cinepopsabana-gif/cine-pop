import { Search, MapPin, X, ChevronRight, Settings } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Navbar({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery
}: NavbarProps) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Sabana de Torres, Santander');

  const cities = [
    'Sabana de Torres, Santander'
  ];

  const menuItems = [
    { id: 'movies', label: 'Cartelera' },
    { id: 'cinemas', label: 'Cines' },
    { id: 'promos', label: 'Promociones' },
    { id: 'food', label: 'Dulcería' }
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all duration-300 shadow-sm" id="main-nav">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">

          {/* Brand Logo */}
          <div
            onClick={() => {
              setCurrentTab('movies');
              if (window.location.hash === '#admin') {
                window.location.hash = '#movies';
              }
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <img
              src="/logo.png"
              alt="Cine Pop"
              className="h-12 w-12 object-cover rounded-full group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-4 font-sans text-sm font-medium">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (window.location.hash === '#admin') {
                    window.location.hash = '#movies';
                  }
                  if (item.id === 'movies') {
                    // Reset search
                    setSearchQuery('');
                  }
                }}
                className={`relative px-4 py-2 rounded-lg transition-all duration-200 ${currentTab === item.id || (item.id === 'movies' && currentTab === 'seat-selection')
                  ? 'text-brand-red'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/60'
                  }`}
              >
                {item.label}
                {(currentTab === item.id || (item.id === 'movies' && currentTab === 'seat-selection')) && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-brand-red round transition-all" />
                )}
              </button>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3 lg:gap-4">

            {/* Real Search Input */}
            <div className="relative group max-w-[140px] xs:max-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentTab !== 'movies') {
                    setCurrentTab('movies');
                  }
                }}
                placeholder="Buscar película..."
                className="w-full bg-neutral-100 border border-slate-200 focus:border-brand-red focus:bg-white text-neutral-800 px-3 pl-9 py-1.5 rounded-lg text-xs outline-none transition-all duration-200 placeholder:text-neutral-400"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-200 text-neutral-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Location Selector */}
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-brand-red p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              title="Cambiar ubicación"
            >
              <MapPin className="w-4 h-4 text-brand-red" />
              <span className="text-xs font-semibold hidden lg:inline max-w-[80px] truncate">
                {selectedCity}
              </span>
            </button>

          </div>
        </div>
      </nav>

      {/* Modal for City Selection */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 m-4 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-red" />
                <h3 className="font-bold text-neutral-900 font-sans text-lg">Selecciona tu Ciudad</h3>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 mt-3 mb-4">
              Mostraremos la cartelera y tarifas específicas correspondientes al cine seleccionado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setShowLocationModal(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-all ${selectedCity === city
                    ? 'border-brand-red bg-brand-red/[0.04] text-brand-red font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-neutral-700'
                    }`}
                >
                  <span>{city}</span>
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


