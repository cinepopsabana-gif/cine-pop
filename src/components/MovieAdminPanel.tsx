import React, { useState, useEffect } from 'react';
import { Movie, Showtime, SnackItem, PromoCode, SaleRecord, ExpenseRecord } from '../types';
import { Plus, Trash2, Edit2, Film, Sparkles, Check, Image as ImageIcon, Calendar, Clock, AlertCircle, Save, Undo2, Lock, KeyRound, Eye, EyeOff, LogOut, Utensils, Armchair, ShoppingBag, CreditCard, DollarSign, Users, Tag, Upload, TrendingUp } from 'lucide-react';
import { formatPrice } from '../utils';
import { SEAT_ROWS, SEAT_COLS_LEFT, SEAT_COLS_RIGHT, doesSeatExist } from '../seatConfig';
import AdminFinanceDashboard from './AdminFinanceDashboard';

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    if (typeof reader.result === 'string') {
      setUrl(reader.result);
    }
  };
  reader.readAsDataURL(file);
};

interface MovieAdminPanelProps {
  movies: Movie[];
  setMovies: React.Dispatch<React.SetStateAction<Movie[]>>;
  showtimes: Record<string, Showtime[]>;
  setShowtimes: React.Dispatch<React.SetStateAction<Record<string, Showtime[]>>>;
  snackItems: SnackItem[];
  setSnackItems: React.Dispatch<React.SetStateAction<SnackItem[]>>;
  promoCodes: PromoCode[];
  setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
  occupiedSeats: Record<string, Record<string, 'vendido' | 'apartado'>>;
  setOccupiedSeats: React.Dispatch<React.SetStateAction<Record<string, Record<string, 'vendido' | 'apartado'>>>>;
  onReleaseAllShowtimesSeats: () => void;
  salesHistory: SaleRecord[];
  setSalesHistory: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  expenses: ExpenseRecord[];
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
}

const PRESET_POSTERS = [
  { name: 'Acción / Aventura', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80' },
  { name: 'Ciencia Ficción / Espacio', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80' },
  { name: 'Fantasía / Épica', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80' },
  { name: 'Animación / Infantil', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80' },
  { name: 'Terror / Suspenso', url: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=80' },
];

const PRESET_SNACK_IMAGES = [
  { name: 'Combo Dúo', url: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80' },
  { name: 'Crispeta Balde', url: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400&auto=format&fit=crop&q=80' },
  { name: 'Perro Caliente', url: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=400&auto=format&fit=crop&q=80' },
  { name: 'Nachos Queso', url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Gaseosa Fría', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80' },
  { name: 'Chocolates', url: 'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=400&auto=format&fit=crop&q=80' }
];

const AVAILABLE_GENRES = [
  'Acción', 'Aventura', 'Ciencia Ficción', 'Drama', 'Animación', 'Familia', 'Comedia', 'Terror', 'Suspenso', 'Fantasía', 'Romance'
];

const AVAILABLE_FORMATS = ['2D', '3D', 'XD', 'IMAX'];
const AVAILABLE_LANGUAGES = ['Spanish DUB', 'English SUB', 'Spanish SUB'];

export default function MovieAdminPanel({
  movies,
  setMovies,
  showtimes,
  setShowtimes,
  snackItems,
  setSnackItems,
  promoCodes,
  setPromoCodes,
  occupiedSeats,
  setOccupiedSeats,
  onReleaseAllShowtimesSeats,
  salesHistory,
  setSalesHistory,
  expenses,
  setExpenses
}: MovieAdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'add' | 'showtimes' | 'snacks' | 'seating' | 'promos' | 'financials'>('financials');
  const [showGlobalReleaseConfirm, setShowGlobalReleaseConfirm] = useState(false);

  // States for Promo Code Creation in Admin
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoNameCode, setPromoNameCode] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoDiscountType, setPromoDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [promoDiscountValue, setPromoDiscountValue] = useState('4000');
  const [promoMinPurchase, setPromoMinPurchase] = useState('10000');

  // States for Snack Combo Creation in Admin
  const [editingSnackId, setEditingSnackId] = useState<string | null>(null);
  const [snackName, setSnackName] = useState('');
  const [snackDescription, setSnackDescription] = useState('');
  const [snackPrice, setSnackPrice] = useState('15000');
  const [snackCategory, setSnackCategory] = useState<'Combos' | 'Individual' | 'Drinks' | 'Sweets'>('Combos');
  const [snackImageUrl, setSnackImageUrl] = useState('https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80');

  // States for Seating / Direct sale in Admin
  const [saleMovieId, setSaleMovieId] = useState<string>('');
  const [saleShowtimeId, setSaleShowtimeId] = useState<string>('');
  const [adminSelectedSeats, setAdminSelectedSeats] = useState<string[]>([]);
  const [directSaleBuyer, setDirectSaleBuyer] = useState('');
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<'cash' | 'card' | 'nequi'>('cash');
  const [adminSeatAction, setAdminSeatAction] = useState<'vendido' | 'apartado'>('vendido');
  const [releasingSeat, setReleasingSeat] = useState<string | null>(null);

  // Set default movie and showtime for seating subtab
  useEffect(() => {
    if (movies.length > 0 && !saleMovieId) {
      setSaleMovieId(movies[0].id);
    }
  }, [movies, saleMovieId]);

  useEffect(() => {
    if (saleMovieId) {
      const movieShowtimes = showtimes[saleMovieId] || [];
      if (movieShowtimes.length > 0) {
        setSaleShowtimeId(movieShowtimes[0].id);
      } else {
        setSaleShowtimeId('');
      }
    } else {
      setSaleShowtimeId('');
    }
    setAdminSelectedSeats([]);
    setReleasingSeat(null);
  }, [saleMovieId, showtimes]);

  // SeatMap Helpers for Admin Seating View
  const seatRows = SEAT_ROWS;
  const colsLeft = SEAT_COLS_LEFT;
  const colsRight = SEAT_COLS_RIGHT;

  
  // Password protection states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('cinepop_admin_authenticated') === 'true';
  });
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = passInput.trim();
    if (normalized === 'admin123' || normalized === 'cinepop2026') {
      setIsAuthenticated(true);
      localStorage.setItem('cinepop_admin_authenticated', 'true');
      setPassInput('');
      setPassError('');
      showNotification('success', '¡Acceso de administrador concedido!');
    } else {
      setPassError('Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cinepop_admin_authenticated');
    showNotification('success', 'Sesión de administrador cerrada.');
  };
  
  // States for scheduling a single showtime directly
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [funcTime, setFuncTime] = useState('18:30');
  const [funcCinema, setFuncCinema] = useState('Sala 1 • XD Laser');
  const [funcDate, setFuncDate] = useState('Viernes, 27 de Octubre');
  const [funcPriceStd, setFuncPriceStd] = useState('12000');
  const [funcPriceVip, setFuncPriceVip] = useState('18000');
  
  // Form State for Adding / Editing
  const [isEditing, setIsEditing] = useState<string | null>(null); // Movie ID being edited
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [duration, setDuration] = useState('120 min');
  const [rating, setRating] = useState('PG-13');
  const [formats, setFormats] = useState<string[]>(['2D', 'XD']);
  const [languages, setLanguages] = useState<string[]>(['Spanish DUB']);
  const [posterUrl, setPosterUrl] = useState(PRESET_POSTERS[0].url);
  const [ratingScore, setRatingScore] = useState(8.5);

  // New Showtimes for the movie
  const [newShowtimeTime, setNewShowtimeTime] = useState('18:30');
  const [newShowtimeCinema, setNewShowtimeCinema] = useState('Sala 1 • XD Laser');
  const [newShowtimeDate, setNewShowtimeDate] = useState('Viernes, 27 de Octubre');
  const [newShowtimePriceStd, setNewShowtimePriceStd] = useState('12000');
  const [newShowtimePriceVip, setNewShowtimePriceVip] = useState('18000');
  const [tempShowtimes, setTempShowtimes] = useState<Showtime[]>([
    {
      id: 'temp-show-1',
      time: '15:00',
      cinema: 'Sala 1 • XD Laser',
      date: 'Viernes, 27 de Octubre',
      priceStandard: 12000,
      priceVip: 18000
    },
    {
      id: 'temp-show-2',
      time: '19:30',
      cinema: 'Sala 1 • XD Laser',
      date: 'Viernes, 27 de Octubre',
      priceStandard: 12000,
      priceVip: 18000
    }
  ]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Deletion confirmation states to bypass window.confirm in iframe
  const [deletingMovieId, setDeletingMovieId] = useState<string | null>(null);
  const [deletingShowtimeId, setDeletingShowtimeId] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddSnack = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(snackPrice);
    if (!snackName.trim() || isNaN(priceNum) || priceNum <= 0) {
      showNotification('error', 'Por favor ingresa un nombre y precio de venta válido.');
      return;
    }
    
    if (editingSnackId) {
      // Edit existing snack/combo
      setSnackItems(prev => prev.map(s => {
        if (s.id === editingSnackId) {
          return {
            ...s,
            name: snackName.trim(),
            description: snackDescription.trim() || 'Sin descripción adicional.',
            price: priceNum,
            category: snackCategory,
            imageUrl: snackImageUrl || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80'
          };
        }
        return s;
      }));
      showNotification('success', `¡Snack/Combo "${snackName}" actualizado exitosamente!`);
      setEditingSnackId(null);
    } else {
      // Create new snack/combo
      const newSnack: SnackItem = {
        id: `custom-snack-${Date.now()}`,
        name: snackName.trim(),
        description: snackDescription.trim() || 'Sin descripción adicional.',
        price: priceNum,
        category: snackCategory,
        imageUrl: snackImageUrl || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80'
      };
      setSnackItems(prev => [...prev, newSnack]);
      showNotification('success', `¡Snack/Combo "${snackName}" agregado al catálogo!`);
    }
    
    // Clear
    setSnackName('');
    setSnackDescription('');
    setSnackPrice('15000');
    setSnackCategory('Combos');
    setSnackImageUrl('https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80');
  };

  const handleStartEditSnack = (snack: SnackItem) => {
    setEditingSnackId(snack.id);
    setSnackName(snack.name);
    setSnackDescription(snack.description);
    setSnackPrice(snack.price.toString());
    setSnackCategory(snack.category);
    setSnackImageUrl(snack.imageUrl);
    
    const formElement = document.getElementById('snack-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditSnack = () => {
    setEditingSnackId(null);
    setSnackName('');
    setSnackDescription('');
    setSnackPrice('15000');
    setSnackCategory('Combos');
    setSnackImageUrl('https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80');
  };

  const handleDeleteSnack = (id: string, name: string) => {
    setSnackItems(prev => prev.filter(s => s.id !== id));
    if (editingSnackId === id) {
      handleCancelEditSnack();
    }
    showNotification('success', `Se ha eliminado "${name}" de la dulcería.`);
  };

  const handleToggleSnackAvailability = (id: string, name: string) => {
    setSnackItems(prev => prev.map(s => {
      if (s.id === id) {
        const nextState = s.isAvailable === false ? true : false;
        showNotification('success', `"${name}" está ahora ${nextState ? 'Disponible' : 'Agotado/Agotado'}.`);
        return { ...s, isAvailable: nextState };
      }
      return s;
    }));
  };

  const handleCancelEditPromo = () => {
    setEditingPromoId(null);
    setPromoNameCode('');
    setPromoDescription('');
    setPromoDiscountType('fixed');
    setPromoDiscountValue('4000');
    setPromoMinPurchase('10000');
  };

  const handleStartEditPromo = (promo: PromoCode) => {
    setEditingPromoId(promo.id);
    setPromoNameCode(promo.code);
    setPromoDescription(promo.description);
    setPromoDiscountType(promo.discountType);
    setPromoDiscountValue(promo.discountValue.toString());
    setPromoMinPurchase(promo.minimumPurchase.toString());

    const formElement = document.getElementById('promo-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeletePromo = (id: string, code: string) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id));
    if (editingPromoId === id) {
      handleCancelEditPromo();
    }
    showNotification('success', `Código de descuento "${code}" eliminado.`);
  };

  const handleTogglePromoAvailability = (id: string, code: string) => {
    setPromoCodes(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.isAvailable;
        showNotification('success', `Código "${code}" está ahora ${nextState ? 'Activo' : 'Inactivo'}.`);
        return { ...p, isAvailable: nextState };
      }
      return p;
    }));
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoNameCode.trim().toUpperCase();
    const valNum = parseFloat(promoDiscountValue);
    const minNum = parseFloat(promoMinPurchase) || 0;

    if (!cleanCode) {
      showNotification('error', 'Por favor ingresa un código promocional válido.');
      return;
    }
    if (isNaN(valNum) || valNum <= 0) {
      showNotification('error', 'El valor de descuento debe ser mayor a cero.');
      return;
    }
    if (promoDiscountType === 'percentage' && valNum > 100) {
      showNotification('error', 'El porcentaje de descuento no puede ser mayor a 100%.');
      return;
    }

    if (editingPromoId) {
      // Edit existing promotion
      setPromoCodes(prev => prev.map(p => {
        if (p.id === editingPromoId) {
          return {
            ...p,
            code: cleanCode,
            description: promoDescription.trim() || 'Descuento promocional.',
            discountType: promoDiscountType,
            discountValue: valNum,
            minimumPurchase: minNum
          };
        }
        return p;
      }));
      showNotification('success', `¡Código promocional "${cleanCode}" actualizado con éxito!`);
      setEditingPromoId(null);
    } else {
      // Create new promotion
      // Check if duplicate code exists
      if (promoCodes.some(p => p.code.toUpperCase() === cleanCode)) {
        showNotification('error', `Ya existe una promoción activa con el código "${cleanCode}".`);
        return;
      }

      const newPromo: PromoCode = {
        id: `promo-${Date.now()}`,
        code: cleanCode,
        description: promoDescription.trim() || 'Descuento promocional.',
        discountType: promoDiscountType,
        discountValue: valNum,
        minimumPurchase: minNum,
        isAvailable: true
      };
      setPromoCodes(prev => [...prev, newPromo]);
      showNotification('success', `¡Código promocional "${cleanCode}" creado y activado!`);
    }

    // Reset Form
    handleCancelEditPromo();
  };

  const handleAdminDirectSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleShowtimeId) {
      showNotification('error', 'Por favor selecciona una función.');
      return;
    }
    if (adminSelectedSeats.length === 0) {
      showNotification('error', 'No has seleccionado ningún asiento.');
      return;
    }

    setOccupiedSeats(prev => {
      const currentList = prev[saleShowtimeId] || {};
      const updated = { ...currentList };
      adminSelectedSeats.forEach(seatId => {
        updated[seatId] = adminSeatAction;
      });
      return {
        ...prev,
        [saleShowtimeId]: updated
      };
    });

    const buyerText = directSaleBuyer.trim() ? ` a "${directSaleBuyer.trim()}"` : '';
    const actionLabel = adminSeatAction === 'vendido' ? 'Venta' : 'Reserva / Apartado';
    showNotification('success', `¡${actionLabel} de ${adminSelectedSeats.length} asiento(s) registrada con éxito${buyerText}!`);
    setAdminSelectedSeats([]);
    setDirectSaleBuyer('');
  };

  const handleAdminReleaseSeat = (seatId: string) => {
    if (!saleShowtimeId) return;
    setOccupiedSeats(prev => {
      const currentList = { ...(prev[saleShowtimeId] || {}) };
      delete currentList[seatId];
      return {
        ...prev,
        [saleShowtimeId]: currentList
      };
    });
    showNotification('success', `Asiento ${seatId} liberado con éxito.`);
    setReleasingSeat(null);
  };

  const handleToggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleToggleFormat = (fmt: string) => {
    if (formats.includes(fmt)) {
      setFormats(formats.filter(f => f !== fmt));
    } else {
      setFormats([...formats, fmt]);
    }
  };

  const handleToggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleAddTempShowtime = () => {
    const std = parseFloat(newShowtimePriceStd);
    const vip = parseFloat(newShowtimePriceVip);

    if (!newShowtimeTime || isNaN(std) || isNaN(vip)) {
      showNotification('error', 'Por favor llena los datos de horario y precios correctamente');
      return;
    }

    const newShow: Showtime = {
      id: `temp-show-${Date.now()}`,
      time: newShowtimeTime,
      cinema: newShowtimeCinema,
      date: newShowtimeDate,
      priceStandard: std,
      priceVip: vip
    };

    setTempShowtimes([...tempShowtimes, newShow]);
    showNotification('success', 'Horario de función agregado a la lista temporal');
  };

  const handleRemoveTempShowtime = (id: string) => {
    setTempShowtimes(tempShowtimes.filter(s => s.id !== id));
  };

  const resetForm = () => {
    setIsEditing(null);
    setTitle('');
    setDescription('');
    setSelectedGenres([]);
    setDuration('120 min');
    setRating('PG-13');
    setFormats(['2D', 'XD']);
    setLanguages(['Spanish DUB']);
    setPosterUrl(PRESET_POSTERS[0].url);
    setRatingScore(8.5);
    setTempShowtimes([
      {
        id: 'temp-show-1',
        time: '15:00',
        cinema: 'Sala 1 • XD Laser',
        date: 'Viernes, 27 de Octubre',
        priceStandard: 12000,
        priceVip: 18000
      },
      {
        id: 'temp-show-2',
        time: '19:30',
        cinema: 'Sala 1 • XD Laser',
        date: 'Viernes, 27 de Octubre',
        priceStandard: 12000,
        priceVip: 18000
      }
    ]);
  };

  const handleSubmitMovie = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      showNotification('error', 'El título y la descripción son campos obligatorios.');
      return;
    }

    if (selectedGenres.length === 0) {
      showNotification('error', 'Selecciona al menos un género para la película.');
      return;
    }

    if (tempShowtimes.length === 0) {
      showNotification('error', 'Debes configurar al menos un horario de función para la película.');
      return;
    }

    const movieId = isEditing || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newMovieData: Movie = {
      id: movieId,
      title: title.trim(),
      description: description.trim(),
      genre: selectedGenres,
      duration: duration.trim(),
      rating,
      formats,
      languages,
      posterUrl: posterUrl.trim(),
      ratingScore: Number(ratingScore)
    };

    if (isEditing) {
      // Edit existing movie
      setMovies(prev => prev.map(m => m.id === isEditing ? newMovieData : m));
      // Replace showtimes
      setShowtimes(prev => ({
        ...prev,
        [movieId]: tempShowtimes.map(s => ({
          ...s,
          id: s.id.startsWith('temp-') ? `show-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` : s.id
        }))
      }));
      showNotification('success', '¡Película actualizada exitosamente en la cartelera!');
    } else {
      // Add new movie
      setMovies(prev => [...prev, newMovieData]);
      // Set showtimes
      setShowtimes(prev => ({
        ...prev,
        [movieId]: tempShowtimes.map(s => ({
          ...s,
          id: `show-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`
        }))
      }));
      showNotification('success', '¡Película añadida y programada en cartelera exitosamente!');
    }

    resetForm();
    setActiveSubTab('list');
  };

  const handleEditMovieClick = (movie: Movie) => {
    setIsEditing(movie.id);
    setTitle(movie.title);
    setDescription(movie.description);
    setSelectedGenres(movie.genre);
    setDuration(movie.duration);
    setRating(movie.rating);
    setFormats(movie.formats);
    setLanguages(movie.languages);
    setPosterUrl(movie.posterUrl);
    setRatingScore(movie.ratingScore);
    
    // Load existing showtimes
    const currentShowtimes = showtimes[movie.id] || [];
    setTempShowtimes(currentShowtimes);
    
    setActiveSubTab('add');
  };

  const handleDeleteMovieClick = (id: string, movieTitle: string) => {
    setMovies(prev => prev.filter(m => m.id !== id));
    setShowtimes(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    showNotification('success', `Se ha eliminado "${movieTitle}" de la cartelera.`);
  };

  const handleAddSingleShowtime = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMovieId = selectedMovieId || (movies.length > 0 ? movies[0].id : '');
    const movie = movies.find(m => m.id === targetMovieId);
    if (!movie) {
      showNotification('error', 'Selecciona una película válida');
      return;
    }
    const std = parseFloat(funcPriceStd);
    const vip = parseFloat(funcPriceVip);
    if (!funcTime || isNaN(std) || isNaN(vip)) {
      showNotification('error', 'Por favor llena los datos de horario y precios correctamente');
      return;
    }

    const newShow: Showtime = {
      id: `show-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      time: funcTime,
      cinema: funcCinema,
      date: funcDate,
      priceStandard: std,
      priceVip: vip
    };

    setShowtimes(prev => ({
      ...prev,
      [targetMovieId]: [...(prev[targetMovieId] || []), newShow]
    }));

    showNotification('success', `¡Función de las ${funcTime} programada para "${movie.title}" exitosamente!`);
    
    // Clear time for next entry
    setFuncTime('');
  };

  const handleDeleteSingleShowtime = (mId: string, sId: string, mTitle: string, sTime: string) => {
    setShowtimes(prev => ({
      ...prev,
      [mId]: (prev[mId] || []).filter(s => s.id !== sId)
    }));
    showNotification('success', `Función de las ${sTime} de "${mTitle}" eliminada.`);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 animate-fade-in text-neutral-800">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-neutral-900 text-lg">Zona Administrativa</h3>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-normal">
            Ingresa la contraseña de administrador para gestionar las películas, cartelera y funciones programadas de Cine Pop.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                value={passInput}
                onChange={(e) => {
                  setPassInput(e.target.value);
                  if (passError) setPassError('');
                }}
                placeholder="Ingresa la contraseña"
                className="w-full bg-slate-50 text-neutral-800 px-4 py-2.5 pr-10 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all placeholder:text-neutral-400 font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passError && (
              <p className="text-[11px] font-semibold text-brand-red mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{passError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-red/10 mt-2 flex items-center justify-center gap-1.5 active:scale-98"
          >
            <KeyRound className="w-4 h-4" />
            <span>Acceder al Panel</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-neutral-800 animate-fade-in">
      
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-brand-red text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">Console</span>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Cine Pop — Zona Administrativa</h1>
          </div>
          <p className="text-xs text-neutral-500 font-semibold">Consola central para administración de taquilla, dulcería, cartelera y finanzas.</p>
        </div>
        
        <button
          type="button"
          onClick={handleLogoutAdmin}
          className="px-3.5 py-2 border border-slate-200 hover:border-brand-red text-slate-650 hover:text-brand-red font-bold text-xs rounded-xl transition-all bg-white flex items-center gap-1.5 shadow-2xs hover:shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Notifications Bar */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 border text-xs font-bold animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-500/10' 
            : 'bg-red-50 border-red-200 text-red-800 shadow-red-500/10'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs bar */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-px overflow-x-auto scrollbar-none">
        {[
          { id: 'financials', label: 'Finanzas y Métricas', icon: TrendingUp },
          { id: 'list', label: 'Cartelera', icon: Film },
          { id: 'add', label: isEditing ? 'Editar Película' : 'Nueva Película', icon: Plus },
          { id: 'showtimes', label: 'Funciones', icon: Calendar },
          { id: 'snacks', label: 'Dulcería', icon: Utensils },
          { id: 'seating', label: 'Taquilla y Butacas', icon: Armchair },
          { id: 'promos', label: 'Descuentos', icon: Tag }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4.5 py-3 border-b-2 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap outline-none ${
                isActive
                  ? 'border-brand-red text-brand-red bg-red-50/25'
                  : 'border-transparent text-neutral-500 hover:text-neutral-850 hover:bg-slate-50/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render subtabs content */}
      
      {/* 1. Subtab: Movies List */}
      {activeSubTab === 'list' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/65 rounded-2xl p-4 sm:p-5">
            <div className="space-y-1">
              <h3 className="font-extrabold text-neutral-900 text-sm">Películas en Cartelera</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">Consulta las películas activas programadas en el cinema. Puedes editar sus propiedades o eliminarlas.</p>
            </div>
            <button
              type="button"
              onClick={() => { resetForm(); setActiveSubTab('add'); }}
              className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Nueva Película</span>
            </button>
          </div>

          {movies.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <div className="text-4xl">🎬</div>
              <p className="text-xs font-bold">No hay películas programadas en la cartelera.</p>
              <button
                type="button"
                onClick={() => setActiveSubTab('add')}
                className="text-brand-red hover:underline text-xs font-semibold"
              >
                Crea la primera película de la cartelera ahora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {movies.map(movie => (
                <div key={movie.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col">
                  <div className="h-48 relative overflow-hidden bg-slate-100 shrink-0">
                    <img 
                      src={movie.posterUrl} 
                      alt={movie.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3 bg-neutral-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-white font-mono text-[10px] font-bold">
                      ⭐ {movie.ratingScore}
                    </div>
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                      {movie.formats.map(fmt => (
                        <span key={fmt} className="bg-brand-red text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-neutral-900 text-sm tracking-tight line-clamp-1">{movie.title}</h4>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{movie.genre.join(' • ')}</p>
                      <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed font-semibold">{movie.description}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100 text-[10px] text-neutral-500 font-bold font-mono">
                      <div className="flex justify-between">
                        <span>Duración: {movie.duration}</span>
                        <span>Clasificación: {movie.rating}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Idioma: {movie.languages.join(', ')}</span>
                        <span>Funciones: {(showtimes[movie.id] || []).length} programadas</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleEditMovieClick(movie)}
                        className="flex-1 py-2 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-700 hover:bg-amber-50/50 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Estás seguro de que deseas eliminar "${movie.title}" de la cartelera?`)) {
                            handleDeleteMovieClick(movie.id, movie.title);
                          }
                        }}
                        className="py-2 px-3 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-brand-red hover:bg-red-50 text-xs font-bold rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Subtab: Add / Edit Movie Form */}
      {activeSubTab === 'add' && (
        <form onSubmit={handleSubmitMovie} className="space-y-6 animate-fade-in max-w-4xl">
          <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 sm:p-5">
            <h3 className="font-extrabold text-neutral-900 text-sm">
              {isEditing ? `Editando Película: ${title}` : 'Programar Nueva Película en Cartelera'}
            </h3>
            <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">Completa los campos a continuación para publicar la película. También debes programar al menos un horario.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            {/* Title & Rating */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Título de la Película</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Interestelar"
                  className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-bold"
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Clasificación</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-bold"
                >
                  {['G', 'PG', 'PG-13', 'R', 'NC-17'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Sinopsis / Descripción</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe una breve sinopsis..."
                rows={3}
                className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-semibold"
              />
            </div>

            {/* Genre Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Géneros (Selecciona al menos uno)</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_GENRES.map(genre => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleToggleGenre(genre)}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all ${
                        isSelected 
                          ? 'bg-brand-red border-brand-red text-white' 
                          : 'bg-slate-50 border-slate-200 text-neutral-600 hover:bg-slate-100'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formats & Languages & Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Formatos</label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_FORMATS.map(fmt => {
                    const isSelected = formats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleToggleFormat(fmt)}
                        className={`px-2.5 py-1.5 border rounded text-[10px] font-bold transition-all ${
                          isSelected 
                            ? 'bg-brand-red border-brand-red text-white' 
                            : 'bg-slate-50 border-slate-200 text-neutral-600 hover:bg-slate-100'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Idiomas / Subtítulos</label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_LANGUAGES.map(lang => {
                    const isSelected = languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleToggleLanguage(lang)}
                        className={`px-2.5 py-1.5 border rounded text-[10px] font-bold transition-all ${
                          isSelected 
                            ? 'bg-brand-red border-brand-red text-white' 
                            : 'bg-slate-50 border-slate-200 text-neutral-600 hover:bg-slate-100'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Duración (Minutos)</label>
                <input
                  type="text"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ej: 135 min"
                  className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-bold"
                />
              </div>
            </div>

            {/* Poster URL Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">URL del Póster o Preset Ilustrativo</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="Escribe o pega una URL..."
                    className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-semibold"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/20 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir desde computador</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setPosterUrl)} />
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-450 font-semibold pt-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>O selecciona un póster rápido de nuestros presets de género:</span>
                  </div>
                </div>
                <div className="h-28 flex gap-2 overflow-x-auto scrollbar-none bg-slate-50 border border-slate-200 rounded-xl p-2 shrink-0">
                  {PRESET_POSTERS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setPosterUrl(preset.url)}
                      className={`h-full w-14 relative rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        posterUrl === preset.url ? 'border-brand-red scale-95 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rating score */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">Calificación Interna (Score: 1.0 - 10.0)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                required
                value={ratingScore}
                onChange={(e) => setRatingScore(Number(e.target.value))}
                className="w-24 bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none font-bold"
              />
            </div>
          </div>

          {/* Temporal Scheduling Box inside adding movie */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-neutral-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-red" />
                <span>Programación de Funciones Horarias (Requerido)</span>
              </h4>
              <p className="text-[11px] text-neutral-500 leading-relaxed">Programa al menos un horario de emisión para habilitar las compras. Las butacas se inicializarán vacías para cada función.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-wider block">Hora (24h)</label>
                <input
                  type="text"
                  value={newShowtimeTime}
                  onChange={(e) => setNewShowtimeTime(e.target.value)}
                  placeholder="Ej: 18:30"
                  className="w-full bg-white text-neutral-850 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-bold outline-none"
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-wider block">Sala y Tipo</label>
                <select
                  value={newShowtimeCinema}
                  onChange={(e) => setNewShowtimeCinema(e.target.value)}
                  className="w-full bg-white text-neutral-850 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-bold outline-none"
                >
                  <option value="Sala 1 • XD Laser">Sala 1 • XD Laser</option>
                  <option value="Sala 2 • IMAX 3D">Sala 2 • IMAX 3D</option>
                  <option value="Sala 3 • 2D Atmos">Sala 3 • 2D Atmos</option>
                  <option value="Sala 4 • VIP Suite">Sala 4 • VIP Suite</option>
                </select>
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-wider block">Fecha de Función</label>
                <input
                  type="text"
                  value={newShowtimeDate}
                  onChange={(e) => setNewShowtimeDate(e.target.value)}
                  placeholder="Ej: Viernes, 27 de Octubre"
                  className="w-full bg-white text-neutral-850 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-bold outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddTempShowtime}
                  className="w-full py-1.5 bg-brand-red hover:bg-brand-red-dark text-white text-[10px] font-bold rounded-lg transition-all shadow-xs"
                >
                  Programar
                </button>
              </div>
            </div>

            {/* List of planned temporary showtimes */}
            <div className="border border-slate-150 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 font-bold text-neutral-500">
                    <th className="p-2.5">Hora</th>
                    <th className="p-2.5">Sala</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tempShowtimes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic">No hay funciones en la lista temporal de esta película.</td>
                    </tr>
                  ) : (
                    tempShowtimes.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold font-mono text-neutral-900">{s.time}</td>
                        <td className="p-2.5 font-semibold text-neutral-700">{s.cinema}</td>
                        <td className="p-2.5 text-neutral-500 font-semibold">{s.date}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTempShowtime(s.id)}
                            className="p-1 hover:bg-red-50 text-neutral-400 hover:text-brand-red rounded transition-all"
                            title="Eliminar función"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={() => { resetForm(); setActiveSubTab('list'); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl border border-slate-200 transition-all"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-2 w-full py-3 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md shadow-brand-red/15"
            >
              {isEditing ? 'Guardar Película' : 'Publicar y Programar Película'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Subtab: Direct Showtimes Management */}
      {activeSubTab === 'showtimes' && (
        <div className="space-y-6 animate-fade-in max-w-5xl">
          <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 sm:p-5">
            <h3 className="font-extrabold text-neutral-900 text-sm">Administrador Directo de Funciones</h3>
            <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">Sube, edita o programa funciones programadas directamente a las películas existentes de la cartelera.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Schedule single showtime form */}
            <form onSubmit={handleAddSingleShowtime} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <h4 className="font-bold text-neutral-950 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Plus className="w-3.5 h-3.5 text-brand-red" />
                <span>Programar Función Adicional</span>
              </h4>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block">Seleccionar Película</label>
                <select
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-bold"
                >
                  <option value="">Selecciona una película...</option>
                  {movies.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase block">Hora (24h)</label>
                  <input
                    type="text"
                    required
                    value={funcTime}
                    onChange={(e) => setFuncTime(e.target.value)}
                    placeholder="Ej: 14:15"
                    className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase block">Fecha</label>
                  <input
                    type="text"
                    required
                    value={funcDate}
                    onChange={(e) => setFuncDate(e.target.value)}
                    placeholder="Ej: Sábado, 28 de Octubre"
                    className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block">Sala y Formato</label>
                <select
                  value={funcCinema}
                  onChange={(e) => setFuncCinema(e.target.value)}
                  className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all font-bold"
                >
                  <option value="Sala 1 • XD Laser">Sala 1 • XD Laser</option>
                  <option value="Sala 2 • IMAX 3D">Sala 2 • IMAX 3D</option>
                  <option value="Sala 3 • 2D Atmos">Sala 3 • 2D Atmos</option>
                  <option value="Sala 4 • VIP Suite">Sala 4 • VIP Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase block">Precio Standard ($)</label>
                  <input
                    type="number"
                    required
                    value={funcPriceStd}
                    onChange={(e) => setFuncPriceStd(e.target.value)}
                    className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs font-bold outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase block">Precio VIP ($)</label>
                  <input
                    type="number"
                    required
                    value={funcPriceVip}
                    onChange={(e) => setFuncPriceVip(e.target.value)}
                    className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs font-bold outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold uppercase rounded-lg transition-all shadow-xs"
              >
                Agregar Función
              </button>
            </form>

            {/* Right: showtimes list grouped by movie */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Cronograma de Funciones Activas</span>
              </div>

              {movies.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">No hay películas registradas en la cartelera.</div>
              ) : (
                movies.map(movie => {
                  const mShowtimes = showtimes[movie.id] || [];
                  return (
                    <div key={movie.id} className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={movie.posterUrl} alt={movie.title} className="w-10 h-12 object-cover rounded-md bg-slate-100 shrink-0" referrerPolicy="no-referrer" />
                        <div>
                          <h5 className="font-bold text-neutral-900 text-xs sm:text-sm tracking-tight">{movie.title}</h5>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{movie.rating} • {movie.duration}</p>
                        </div>
                      </div>

                      {mShowtimes.length === 0 ? (
                        <p className="text-[11px] text-neutral-400 italic font-semibold">Sin funciones programadas en este momento.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {mShowtimes.map(s => (
                            <div key={s.id} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/40 flex items-center justify-between text-[11px] font-bold text-neutral-800">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-neutral-900">
                                  <Clock className="w-3.5 h-3.5 text-brand-red" />
                                  <span className="font-mono text-xs">{s.time}</span>
                                  <span className="text-neutral-400">•</span>
                                  <span>{s.cinema.replace('Sala ', 'S')}</span>
                                </div>
                                <div className="text-neutral-500 font-semibold">{s.date}</div>
                                <div className="text-neutral-450 text-[10px] font-mono">Std: {formatPrice(s.priceStandard)} / VIP: {formatPrice(s.priceVip)}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleShowtime(movie.id, s.id, movie.title, s.time)}
                                className="p-1.5 border border-slate-200 text-neutral-400 hover:text-brand-red hover:bg-red-50 hover:border-red-200 rounded-lg transition-all"
                                title="Eliminar función"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Subtab: Snacks / Confitería & Combos */}
      {activeSubTab === 'snacks' && (
        <div className="space-y-6 animate-fade-in text-neutral-800">
          <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-neutral-900 text-sm">Catálogo de Dulcería y Combos</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">Administra los combos de crispetas, comidas rápidas, bebidas y snacks disponibles en la tienda de confitería de Cine Pop.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Create or Edit Snack Form */}
            <form id="snack-form" onSubmit={handleAddSnack} className={`lg:col-span-5 bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all duration-300 ${editingSnackId ? 'border-amber-400 ring-2 ring-amber-400/10' : 'border-slate-200'}`}>
              <h4 className="font-bold text-neutral-950 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                {editingSnackId ? <Edit2 className="w-3.5 h-3.5 text-amber-500" /> : <Plus className="w-3.5 h-3.5 text-brand-red" />}
                <span>{editingSnackId ? 'Editar Snack / Combo' : 'Registrar Nuevo Combo o Snack'}</span>
              </h4>

              {editingSnackId && (
                <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-[10px] font-bold text-amber-800">
                  <span>✏️ Editando: {snackName}</span>
                  <button type="button" onClick={handleCancelEditSnack} className="text-amber-600 hover:text-amber-800 underline uppercase tracking-wider">Cancelar</button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 block">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={snackName}
                  onChange={(e) => setSnackName(e.target.value)}
                  placeholder="Ej: Combo Pareja Extra Grande"
                  className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 block">Descripción</label>
                <textarea
                  value={snackDescription}
                  onChange={(e) => setSnackDescription(e.target.value)}
                  placeholder="Ej: Incluye 1 crispeta gigante de sal, 2 gaseosas grandes..."
                  rows={2}
                  className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 block">Precio de Venta ($)</label>
                  <input
                    type="number"
                    required
                    value={snackPrice}
                    onChange={(e) => setSnackPrice(e.target.value)}
                    className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 block">Categoría</label>
                  <select
                    value={snackCategory}
                    onChange={(e) => setSnackCategory(e.target.value as any)}
                    className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none font-bold"
                  >
                    <option value="Combos">Combos Completos</option>
                    <option value="Individual">Individuales / Alimentos</option>
                    <option value="Drinks">Bebidas / Jugos</option>
                    <option value="Sweets">Dulces / Confitería</option>
                  </select>
                </div>
              </div>

              {/* Snack Image Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 block">URL de la Imagen del Combo</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={snackImageUrl}
                      onChange={(e) => setSnackImageUrl(e.target.value)}
                      className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/20 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all w-fit">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir desde computador</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setSnackImageUrl)} />
                    </label>
                  </div>
                  <div className="h-16 flex gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 overflow-x-auto scrollbar-none shrink-0">
                    {PRESET_SNACK_IMAGES.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSnackImageUrl(p.url)}
                        className={`h-full w-10 relative rounded overflow-hidden shrink-0 border-2 transition-all ${
                          snackImageUrl === p.url ? 'border-brand-red' : 'border-transparent'
                        }`}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingSnackId && (
                  <button type="button" onClick={handleCancelEditSnack} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">Cancelar</button>
                )}
                <button type="submit" className="flex-2 w-full py-2.5 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-red/15">
                  {editingSnackId ? 'Guardar Cambios' : 'Registrar Snack'}
                </button>
              </div>
            </form>

            {/* Snack list list */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 text-neutral-800">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Menú de Dulcería ({snackItems.length} Artículos)</span>
              </div>

              {snackItems.length === 0 ? (
                <div className="p-8 text-center text-slate-450 italic">No hay snacks o combos configurados en el sistema.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {snackItems.map(item => (
                    <div key={item.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/50 ${item.isAvailable === false ? 'opacity-60 bg-neutral-50/45' : ''}`}>
                      <div className="flex gap-3 items-center">
                        <img src={item.imageUrl} alt={item.name} className="w-14 h-14 object-cover rounded-lg bg-slate-100 shrink-0" referrerPolicy="no-referrer" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-neutral-900 text-xs tracking-tight">{item.name}</span>
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md">{item.category}</span>
                            {item.isAvailable === false && (
                              <span className="bg-red-50 text-brand-red border border-red-100 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md">AGOTADO</span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 leading-normal font-semibold max-w-sm line-clamp-2">{item.description}</p>
                          <p className="text-xs font-extrabold text-brand-red font-mono">{formatPrice(item.price)} COP</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleSnackAvailability(item.id, item.name)}
                          className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-bold transition-all ${
                            item.isAvailable !== false 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {item.isAvailable !== false ? 'Disponible' : 'Sin Stock'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditSnack(item)}
                          className="p-2 border border-slate-200 hover:border-amber-200 hover:bg-amber-50 text-slate-500 hover:text-amber-700 rounded-lg transition-all"
                          title="Editar snack"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Estás seguro de que deseas eliminar "${item.name}" del catálogo?`)) {
                              handleDeleteSnack(item.id, item.name);
                            }
                          }}
                          className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-neutral-400 hover:text-brand-red rounded-lg transition-all"
                          title="Eliminar snack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Subtab: Seating and Direct Sales Console */}
      {activeSubTab === 'seating' && (
        <div className="space-y-6 animate-fade-in text-neutral-800">
          
          <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-neutral-900 text-sm">Consola Administrativa de Taquilla y Butacas</h3>
              <p className="text-[11px] text-neutral-500 max-w-xl leading-relaxed">Selecciona una película y un horario programado para ver el mapa de butacas en tiempo real, efectuar ventas/reservas directas o liberar asientos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 p-4.5 rounded-2xl shadow-2xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">1. Seleccionar Película</label>
              <select
                value={saleMovieId}
                onChange={(e) => setSaleMovieId(e.target.value)}
                className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all font-bold"
              >
                <option value="">Seleccionar Película...</option>
                {movies.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">2. Seleccionar Función</label>
              <select
                value={saleShowtimeId}
                onChange={(e) => setSaleShowtimeId(e.target.value)}
                disabled={!saleMovieId}
                className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all font-bold disabled:opacity-50"
              >
                <option value="">Seleccionar Función Programada...</option>
                {(showtimes[saleMovieId] || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.time} — {s.cinema} ({s.date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saleShowtimeId ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Seating Layout Column */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col items-center relative overflow-hidden text-neutral-800">
                <div className="w-full max-w-md bg-slate-100 border border-slate-200 text-center py-2 text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 rounded-lg shadow-2xs">
                  🎬 Pantalla Central (Screen)
                </div>

                <div className="w-full overflow-x-auto py-4 flex flex-col gap-2 items-center min-w-0">
                  {seatRows.map((row) => {
                    return (
                      <div key={row} className="flex items-center gap-4 select-none">
                        {/* Row Code Left */}
                        <div className="w-4 font-mono font-bold text-xs text-neutral-400 text-right">{row}</div>

                        {/* Left Block Seating */}
                        <div className="flex gap-2">
                          {colsLeft.map((col) => {
                            const exists = doesSeatExist(row, col);
                            if (!exists) {
                              return <div key={`${row}-${col}`} className="w-7.5 h-8.5" />;
                            }

                            const seatId = `${row}${col}`;
                            const occupiedList = occupiedSeats[saleShowtimeId] || {};
                            const occupiedStatus = occupiedList[seatId];
                            const isOccupied = !!occupiedStatus;
                            const isSelected = adminSelectedSeats.includes(seatId);
                            
                            return (
                              <button
                                key={`${row}-${col}`}
                                type="button"
                                onClick={() => {
                                  if (isOccupied) {
                                    setReleasingSeat(seatId);
                                  } else {
                                    if (isSelected) {
                                      setAdminSelectedSeats(adminSelectedSeats.filter(s => s !== seatId));
                                    } else {
                                      setAdminSelectedSeats([...adminSelectedSeats, seatId]);
                                    }
                                  }
                                }}
                                title={`${row}${col} - ${
                                  occupiedStatus === 'vendido' ? 'Vendido (Clic para gestionar)' : 
                                  occupiedStatus === 'apartado' ? 'Apartado (Clic para gestionar)' : 
                                  'Disponible (Clic para marcar)'
                                }`}
                                className={`w-7.5 h-8.5 rounded-t-md border flex items-center justify-center text-[9px] font-bold transition-all duration-200 outline-none select-none
                                  ${occupiedStatus === 'vendido' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs ring-1 ring-emerald-500/20' : ''}
                                  ${occupiedStatus === 'apartado' ? 'bg-amber-500 border-amber-600 text-white shadow-xs ring-1 ring-amber-400/20' : ''}
                                  ${isSelected ? 'bg-brand-red border-brand-red text-white shadow-[0_2px_8px_rgba(225,25,50,0.35)]' : ''}
                                  ${!isOccupied && !isSelected ? 'bg-slate-50 border-slate-200 text-neutral-400 hover:bg-slate-100 hover:border-slate-300' : ''}
                                `}
                              >
                                {col}
                              </button>
                            );
                          })}
                        </div>

                        {/* Pasillo central (Aisle) */}
                        <div className="w-4" />

                        {/* Right Block Seating */}
                        <div className="flex gap-2">
                          {colsRight.map((col) => {
                            const exists = doesSeatExist(row, col);
                            if (!exists) {
                              return <div key={`${row}-${col}`} className="w-7.5 h-8.5" />;
                            }

                            const seatId = `${row}${col}`;
                            const occupiedList = occupiedSeats[saleShowtimeId] || {};
                            const occupiedStatus = occupiedList[seatId];
                            const isOccupied = !!occupiedStatus;
                            const isSelected = adminSelectedSeats.includes(seatId);
                            
                            return (
                              <button
                                key={`${row}-${col}`}
                                type="button"
                                onClick={() => {
                                  if (isOccupied) {
                                    setReleasingSeat(seatId);
                                  } else {
                                    if (isSelected) {
                                      setAdminSelectedSeats(adminSelectedSeats.filter(s => s !== seatId));
                                    } else {
                                      setAdminSelectedSeats([...adminSelectedSeats, seatId]);
                                    }
                                  }
                                }}
                                title={`${row}${col} - ${
                                  occupiedStatus === 'vendido' ? 'Vendido (Clic para gestionar)' : 
                                  occupiedStatus === 'apartado' ? 'Apartado (Clic para gestionar)' : 
                                  'Disponible (Clic para marcar)'
                                }`}
                                className={`w-7.5 h-8.5 rounded-t-md border flex items-center justify-center text-[9px] font-bold transition-all duration-200 outline-none select-none
                                  ${occupiedStatus === 'vendido' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs ring-1 ring-emerald-500/20' : ''}
                                  ${occupiedStatus === 'apartado' ? 'bg-amber-500 border-amber-600 text-white shadow-xs ring-1 ring-amber-400/20' : ''}
                                  ${isSelected ? 'bg-brand-red border-brand-red text-white shadow-[0_2px_8px_rgba(225,25,50,0.35)]' : ''}
                                  ${!isOccupied && !isSelected ? 'bg-slate-50 border-slate-200 text-neutral-400 hover:bg-slate-100 hover:border-slate-300' : ''}
                                `}
                              >
                                {col}
                              </button>
                            );
                          })}
                        </div>

                        {/* Row Code Right */}
                        <div className="w-4 font-mono font-bold text-xs text-neutral-400 text-left">{row}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend bar */}
                <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-bold text-neutral-500 bg-slate-50 border border-slate-200/85 px-4.5 py-3 rounded-xl justify-center w-full max-w-2xl select-none">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-4 bg-slate-50 border border-slate-200 rounded-t" />
                    <span>Disponible ({83 - Object.keys(occupiedSeats[saleShowtimeId] || {}).length} Butacas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-4 bg-emerald-500 border border-emerald-600 rounded-t" />
                    <span>Vendido ({Object.values(occupiedSeats[saleShowtimeId] || {}).filter(v => v === 'vendido').length} Butacas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-4 bg-amber-500 border border-amber-600 rounded-t" />
                    <span>Apartado ({Object.values(occupiedSeats[saleShowtimeId] || {}).filter(v => v === 'apartado').length} Butacas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-4 bg-brand-red border border-brand-red rounded-t" />
                    <span>Selección Actual ({adminSelectedSeats.length} Butacas)</span>
                  </div>
                </div>

                {/* Individual Seat Release Overlay */}
                {releasingSeat && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-20 animate-fade-in">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl text-center max-w-xs w-full space-y-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-neutral-900 text-sm">Gestionar Asiento {releasingSeat}</h4>
                        <p className="text-[11px] text-neutral-500 leading-normal">
                          Estado actual: <strong className={occupiedSeats[saleShowtimeId]?.[releasingSeat] === 'vendido' ? 'text-emerald-600' : 'text-amber-500'}>
                            {occupiedSeats[saleShowtimeId]?.[releasingSeat] === 'vendido' ? 'Vendido (Pagado)' : 'Apartado (Reserva)'}
                          </strong>
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {/* Convert to sold button if currently 'apartado' */}
                        {occupiedSeats[saleShowtimeId]?.[releasingSeat] === 'apartado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setOccupiedSeats(prev => {
                                const current = prev[saleShowtimeId] || {};
                                return {
                                  ...prev,
                                  [saleShowtimeId]: {
                                    ...current,
                                    [releasingSeat]: 'vendido'
                                  }
                                };
                              });
                              showNotification('success', `El asiento ${releasingSeat} ahora está Vendido.`);
                              setReleasingSeat(null);
                            }}
                            className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar como Vendido</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAdminReleaseSeat(releasingSeat)}
                          className="w-full py-2 bg-brand-red text-white text-xs font-bold rounded-lg hover:bg-brand-red-dark transition-all flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Liberar Asiento (Disponible)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReleasingSeat(null)}
                          className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Booking Form Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-neutral-950 text-xs uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-brand-red" />
                    <span>Registrar Acción Directa</span>
                  </h4>

                  <form onSubmit={handleAdminDirectSale}>
                    {adminSelectedSeats.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 space-y-1.5 select-none">
                        <div className="text-xl">👉</div>
                        <p className="text-[11px] font-bold">Selecciona una o más butacas en el mapa para habilitar la facturación en taquilla.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fade-in">
                        
                        {/* Selected info tag */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-amber-800 block">Butacas Seleccionadas:</span>
                          <div className="flex flex-wrap gap-1">
                            {adminSelectedSeats.map(seat => (
                              <span key={seat} className="bg-white border border-amber-300 font-mono text-amber-950 px-2 py-0.5 rounded font-bold">
                                {seat}
                              </span>
                            ))}
                          </div>
                          
                          <div className="pt-2 border-t border-amber-200 flex justify-between items-baseline">
                            <span className="font-semibold text-amber-800">Valor Total Estimado:</span>
                            <span className="font-extrabold text-base text-amber-950 font-mono">
                              {formatPrice(adminSelectedSeats.length * 12000)} COP
                            </span>
                          </div>
                        </div>

                        {/* Buyer name input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                            Nombre del Cliente / Notas
                          </label>
                          <input
                            type="text"
                            value={directSaleBuyer}
                            onChange={(e) => setDirectSaleBuyer(e.target.value)}
                            placeholder="Ej: Cliente Taquilla Presencial"
                            className="w-full bg-slate-50 text-neutral-850 px-3 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all placeholder:text-neutral-400 font-semibold"
                          />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                            Método de Recaudo
                          </label>
                          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                            {(['cash', 'card', 'nequi'] as const).map(method => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setDirectSalePaymentMethod(method)}
                                className={`py-2 px-1 border rounded-xl text-[10px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${
                                  directSalePaymentMethod === method
                                    ? 'border-brand-red bg-red-50 text-brand-red shadow-2xs'
                                    : 'border-slate-200 bg-slate-50 text-slate-650 hover:bg-neutral-100'
                                }`}
                              >
                                {method === 'cash' ? <DollarSign className="w-3.5 h-3.5" /> :
                                 method === 'card' ? <CreditCard className="w-3.5 h-3.5" /> :
                                 <Users className="w-3.5 h-3.5" />}
                                <span>{method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'Nequi'}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Selector de Acción: Venta vs Apartar */}
                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                            Estado de la Butaca
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            {(['vendido', 'apartado'] as const).map(action => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => setAdminSeatAction(action)}
                                className={`py-2 px-1 border rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                                  adminSeatAction === action
                                    ? action === 'vendido'
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                                      : 'border-amber-500 bg-amber-50 text-amber-700 shadow-2xs'
                                    : 'border-slate-200 bg-slate-50 text-slate-650 hover:bg-neutral-100'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${action === 'vendido' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span>{action === 'vendido' ? 'Vendido' : 'Apartado'}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className={`w-full py-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 ${
                            adminSeatAction === 'vendido' 
                              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15' 
                              : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/15'
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          <span>{adminSeatAction === 'vendido' ? 'Efectuar Venta Directa' : 'Registrar como Apartado'}</span>
                        </button>

                      </div>
                    )}
                  </form>
                </div>

                {/* Quick actions box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Atajos de Administración:</span>
                  
                  <div className="space-y-2">
                    {/* Block whole showtime */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Estás seguro de que deseas bloquear todos los asientos de esta función? Esto evitará cualquier compra en línea.')) {
                          const allSeats: Record<string, 'vendido'> = {};
                          const rows = ['E', 'D', 'C', 'B', 'A'];
                          rows.forEach(r => {
                            for (let c = 1; c <= 13; c++) {
                              if (doesSeatExist(r, c)) {
                                allSeats[`${r}${c}`] = 'vendido';
                              }
                            }
                          });
                          setOccupiedSeats(prev => ({
                            ...prev,
                            [saleShowtimeId]: allSeats
                          }));
                          showNotification('success', 'Sala bloqueada: Todos los asientos marcados como ocupados.');
                        }
                      }}
                      className="w-full py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-wider text-center"
                    >
                      🔒 Bloquear Sala Completa
                    </button>

                    {/* Release whole showtime */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Estás seguro de que deseas liberar absolutamente todos los asientos para esta función?')) {
                          setOccupiedSeats(prev => ({
                            ...prev,
                            [saleShowtimeId]: {}
                          }));
                          showNotification('success', 'Sala liberada: Todos los asientos marcados como disponibles.');
                        }
                      }}
                      className="w-full py-2.5 text-xs font-bold text-brand-red bg-red-50 hover:bg-brand-red hover:text-white border border-red-100 hover:border-brand-red rounded-xl transition-all uppercase tracking-wider text-center"
                    >
                      🔓 Liberar Todos los Asientos
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-sm animate-fade-in text-neutral-800">
              <div className="text-2xl animate-bounce">📽️</div>
              <p className="text-xs text-neutral-500 font-bold">Por favor selecciona una Película y un Horario programado arriba para gestionar las butacas en tiempo real.</p>
            </div>
          )}

        </div>
      )}

      {/* 6. Subtab: Promos (already there) */}
{activeSubTab === 'promos' && (
        <div className="space-y-6 animate-fade-in text-neutral-800">
          
          <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-neutral-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand-red animate-pulse" />
                <span>Gestor de Vouchers, Descuentos y Promociones</span>
              </h3>
              <p className="text-[11px] text-neutral-500 max-w-xl leading-relaxed">
                Crea códigos de descuento dinámicos que tus clientes podrán redimir en tiempo real durante la pantalla de pago. Controla montos mínimos de compra, tipos de descuento y estados de activación instantáneamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Create or Edit Promo Code Form */}
            <form id="promo-form" onSubmit={handleSavePromo} className={`lg:col-span-5 bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all duration-300 ${editingPromoId ? 'border-amber-400 ring-2 ring-amber-400/10' : 'border-slate-200'}`}>
              <div className="space-y-1.5">
                <h3 className="font-bold text-neutral-950 text-sm flex items-center gap-2">
                  {editingPromoId ? (
                    <>
                      <Edit2 className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span className="text-amber-600">Editar Código de Descuento</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-brand-red" />
                      <span>Registrar Nuevo Cupón</span>
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  {editingPromoId 
                    ? 'Modifica los valores del cupón de descuento seleccionado a continuación. Los cambios tendrán efecto inmediato.'
                    : 'Crea un nuevo cupón ingresando un código único, su valor de descuento y las condiciones de compra mínima.'
                  }
                </p>
              </div>

              {editingPromoId && (
                <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-[10px] font-bold text-amber-800">
                  <span>✏️ Editando: ID {editingPromoId.substring(0, 15)}...</span>
                  <button 
                    type="button" 
                    onClick={handleCancelEditPromo}
                    className="text-amber-600 hover:text-amber-800 underline uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Code field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                  Código de la Promoción (Ej: PROMO50)
                </label>
                <input
                  type="text"
                  required
                  value={promoNameCode}
                  onChange={(e) => setPromoNameCode(e.target.value)}
                  placeholder="Ej: MEGACOPAS"
                  className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all placeholder:text-neutral-400 font-bold uppercase tracking-wider"
                />
              </div>

              {/* Description field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                  Descripción Corta de la Promo
                </label>
                <input
                  type="text"
                  required
                  value={promoDescription}
                  onChange={(e) => setPromoDescription(e.target.value)}
                  placeholder="Ej: Descuento oficial de la temporada"
                  className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all placeholder:text-neutral-400 font-semibold"
                />
              </div>

              {/* Discount Type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                  Tipo de Descuento
                </label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setPromoDiscountType('fixed')}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      promoDiscountType === 'fixed'
                        ? 'border-brand-red bg-red-50 text-brand-red shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-neutral-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Valor Fijo (COP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoDiscountType('percentage')}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      promoDiscountType === 'percentage'
                        ? 'border-brand-red bg-red-50 text-brand-red shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-650 hover:bg-neutral-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Porcentaje (%)</span>
                  </button>
                </div>
              </div>

              {/* Value and Minimum purchase */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                    {promoDiscountType === 'fixed' ? 'Valor Descuento ($)' : 'Porcentaje (%)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={promoDiscountType === 'percentage' ? "100" : undefined}
                    value={promoDiscountValue}
                    onChange={(e) => setPromoDiscountValue(e.target.value)}
                    placeholder={promoDiscountType === 'fixed' ? "Ej: 5000" : "Ej: 15"}
                    className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">
                    Compra Mínima ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={promoMinPurchase}
                    onChange={(e) => setPromoMinPurchase(e.target.value)}
                    placeholder="Ej: 12000"
                    className="w-full bg-slate-50 text-neutral-850 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex gap-2.5 pt-1">
                {editingPromoId && (
                  <button
                    type="button"
                    onClick={handleCancelEditPromo}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-slate-200"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className={`py-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    editingPromoId 
                      ? 'flex-2 bg-amber-500 hover:bg-amber-600 shadow-amber-500/15 w-full' 
                      : 'w-full bg-brand-red hover:bg-brand-red-dark shadow-brand-red/10'
                  }`}
                >
                  {editingPromoId ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Agregar Promoción</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Right Column: Active Promo Codes List */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Cupones y Descuentos Activos ({promoCodes.length})</span>
                <span className="text-[10px] text-slate-450 font-bold">Consolas de Taquilla Cine Pop</span>
              </div>

              {promoCodes.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-slate-400">
                  <div className="text-3xl">🎟️</div>
                  <p className="text-xs font-bold">No hay cupones de descuento configurados.</p>
                  <p className="text-[11px] leading-relaxed max-w-xs mx-auto">Crea uno en el formulario de la izquierda para que empiece a funcionar en la taquilla de pago de inmediato.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {promoCodes.map((promo) => (
                    <div 
                      key={promo.id} 
                      className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 ${
                        promo.isAvailable === false ? 'opacity-60 bg-neutral-50/45' : ''
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs px-2.5 py-0.5 rounded-lg font-extrabold tracking-wider font-mono">
                            {promo.code}
                          </span>
                          
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            promo.isAvailable !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {promo.isAvailable !== false ? 'Activo' : 'Inactivo'}
                          </span>

                          <span className="text-xs font-extrabold text-neutral-900 font-mono">
                            {promo.discountType === 'fixed' 
                              ? `-${formatPrice(promo.discountValue)}` 
                              : `-${promo.discountValue}%`}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-700 font-semibold leading-snug">
                          {promo.description}
                        </p>
                        
                        <div className="flex items-center gap-2.5 text-[10px] text-neutral-550 font-semibold font-sans">
                          <span>Mínimo de Compra: <strong className="text-neutral-700 font-mono">{formatPrice(promo.minimumPurchase)}</strong></span>
                          <span>•</span>
                          <span>Tipo: <strong>{promo.discountType === 'fixed' ? 'Valor Fijo' : 'Porcentual'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditPromo(promo)}
                          className={`p-1.5 sm:px-2.5 sm:py-1.5 border rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold ${
                            editingPromoId === promo.id
                              ? 'bg-amber-500 border-amber-600 text-white shadow-md'
                              : 'bg-white text-slate-600 hover:text-amber-600 hover:bg-amber-50/70 border-slate-200 hover:border-amber-200'
                          }`}
                          title="Editar cupón"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>

                        {/* Toggle active switch */}
                        <button
                          type="button"
                          onClick={() => handleTogglePromoAvailability(promo.id, promo.code)}
                          className={`p-1.5 sm:px-2.5 sm:py-1.5 border rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold ${
                            promo.isAvailable !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Alternar activación"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{promo.isAvailable !== false ? 'Desactivar' : 'Activar'}</span>
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Estás seguro de que deseas eliminar el cupón "${promo.code}" permanentemente?`)) {
                              handleDeletePromo(promo.id, promo.code);
                            }
                          }}
                          className="p-1.5 border border-slate-200 text-neutral-400 hover:text-brand-red hover:bg-red-50 hover:border-red-200 rounded-xl transition-all flex items-center justify-center"
                          title="Eliminar cupón"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {activeSubTab === 'financials' && (
        <AdminFinanceDashboard
          salesHistory={salesHistory}
          expenses={expenses}
          setExpenses={setExpenses}
        />
      )}

    </div>
  );
}
