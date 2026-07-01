import { CreditCard, Tag, Ticket, ArrowRight, ShieldCheck, Heart, Sparkles, Check, Printer, Share2, ArrowLeft, Building, Coins, Loader2, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { Movie, Showtime, SelectedSeat, CartSnack, PromoCode } from '../types';
import { formatPrice } from '../utils';
import { printTicketOnThermalPrinter } from '../lib/printer';

interface CheckoutSummaryProps {
  movie: Movie;
  showtime: Showtime;
  selectedSeats: SelectedSeat[];
  cartSnacks: CartSnack[];
  isLoggedIn?: boolean;
  username?: string;
  onPrevStep: () => void;
  onPurchaseComplete: (details: {
    id: string;
    total: number;
    subtotal: number;
    discount: number;
    paymentMethod: 'transfer' | 'cash';
    promoCodeUsed?: string;
    docNum?: string;
    phone?: string;
    bankName?: string;
  }) => void;
  isPurchased: boolean; // Indicates if payment went through and ticket should show
  promoCodes?: PromoCode[];
}

export default function CheckoutSummary({
  movie,
  showtime,
  selectedSeats,
  cartSnacks,
  isLoggedIn = false,
  username = '',
  onPrevStep,
  onPurchaseComplete,
  isPurchased,
  promoCodes = []
}: CheckoutSummaryProps) {
  // Promo codes state
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Credit Card Form State
  const [cardName, setCardName] = useState(username || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New Payment Methods States
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [selectedBank, setSelectedBank] = useState('Bancolombia');
  const [cashProvider, setCashProvider] = useState('Taquilla');
  const [userDocType, setUserDocType] = useState('CC');
  const [userDocNum, setUserDocNum] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Form Validations
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Generate stable random reservation code
  const [reservationCode] = useState(() => "CP-" + Math.floor(100000 + Math.random() * 900000));

  // Calculation parameters
  const seatsTotal = selectedSeats.reduce((acc, seat) => acc + seat.price, 0);
  const snacksTotal = cartSnacks.reduce((acc, item) => acc + (item.snack.price * item.quantity), 0);
  const subtotal = seatsTotal + snacksTotal;
  const transactionFee = 2000.00; // Convenience fee
  const finalTotal = Math.max(0, subtotal + transactionFee - promoDiscount);

  const handleApplyPromo = () => {
    setPromoError('');
    const typedCode = promoCode.trim().toUpperCase();
    
    // Find the promo code in our dynamic list
    const foundPromo = (promoCodes || []).find(
      p => p.code.toUpperCase() === typedCode
    );

    if (!foundPromo) {
      setPromoError('Código inválido. Revisa que esté bien escrito o consulta las promociones activas.');
      return;
    }

    if (foundPromo.isAvailable === false) {
      setPromoError('Este código promocional ya no está disponible o está agotado.');
      return;
    }

    if (subtotal < foundPromo.minimumPurchase) {
      setPromoError(`La compra mínima requerida para usar este código es ${formatPrice(foundPromo.minimumPurchase)}.`);
      return;
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (foundPromo.discountType === 'fixed') {
      discountAmount = foundPromo.discountValue;
    } else {
      discountAmount = (subtotal * foundPromo.discountValue) / 100;
    }

    // Apply the discount
    setPromoApplied(true);
    setPromoDiscount(discountAmount);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    // Format card as XXXX XXXX XXXX XXXX
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setCardExpiry(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCardCvv(value);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (paymentMethod === 'transfer') {
      if (!userDocNum.trim()) errors.userDocNum = 'Ingresa tu número de documento para PSE';
      if (!userPhone.trim()) errors.userPhone = 'Ingresa tu número de teléfono / celular registrado';
    } else if (paymentMethod === 'cash') {
      if (!userDocNum.trim()) errors.userDocNum = 'Ingresa tu número de documento de identidad';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsLoading(true);

    // Simulate server side transaction
    setTimeout(() => {
      setIsLoading(false);
      onPurchaseComplete({
        id: reservationCode,
        total: finalTotal,
        subtotal: subtotal,
        discount: promoDiscount,
        paymentMethod: paymentMethod,
        promoCodeUsed: promoApplied ? promoCode : undefined,
        docNum: userDocNum,
        phone: userPhone,
        bankName: paymentMethod === 'transfer' ? selectedBank : undefined
      });
    }, 2000);
  };

  const [printAlert, setPrintAlert] = useState(false);

  // Estado de la impresión física en la impresora térmica de taquilla
  const [thermalPrintStatus, setThermalPrintStatus] = useState<
    'idle' | 'printing' | 'success' | 'error'
  >('idle');
  const [thermalPrintError, setThermalPrintError] = useState('');

  const handleThermalPrint = async () => {
    setThermalPrintStatus('printing');
    setThermalPrintError('');

    const result = await printTicketOnThermalPrinter({
      reservationCode,
      movieTitle: movie.title,
      cinema: showtime.cinema,
      date: showtime.date,
      time: showtime.time,
      seats: selectedSeats.map((s) => ({ id: s.id })),
      snacks: cartSnacks.map((cs) => ({
        name: cs.snack.name,
        price: cs.snack.price,
        quantity: cs.quantity,
      })),
      total: finalTotal,
      paymentMethod,
    });

    if (result.ok) {
      setThermalPrintStatus('success');
    } else {
      setThermalPrintStatus('error');
      setThermalPrintError(result.error || 'No se pudo imprimir el ticket.');
    }
  };

  const handlePrint = () => {
    // 1. Try native print (this might work if opened in new tab or if local browser allows it)
    try {
      window.print();
    } catch (e) {
      console.warn("Print blocked by iframe permissions", e);
    }

    // 2. Set alert state to show visual instructions
    setPrintAlert(true);

    // 3. Generate high-fidelity standalone HTML ticket and trigger download
    const seatsHtml = selectedSeats.map(s => `
      <span style="display: inline-block; font-family: monospace; font-weight: 900; font-size: 14px; color: #111827; background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 12px; margin: 2px;">
        ${s.id}
      </span>
    `).join('');

    const snacksHtml = cartSnacks.length > 0 
      ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e5e7eb;">
          <span style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; display: block;">Dulcería Adicional</span>
          <p style="font-size: 13px; font-weight: 600; color: #374151; margin-top: 4px; margin-bottom: 0;">
            ${cartSnacks.map(cs => `${cs.quantity}x ${cs.snack.name}`).join(', ')}
          </p>
        </div>
      `
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cine Pop Ticket - ${reservationCode}</title>
  <style>
    body {
      background-color: #f3f4f6;
      color: #1f2937;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .ticket-container {
      background-color: #ffffff;
      max-width: 420px;
      width: 100%;
      border-radius: 24px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .header {
      background-color: #e11932;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.05em;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-weight: bold;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
    }
    .movie-section {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    .movie-poster {
      width: 80px;
      height: 112px;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #f3f4f6;
    }
    .movie-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .badge {
      align-self: flex-start;
      background-color: #e11932;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }
    .movie-title {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 800;
      line-height: 1.2;
      color: #111827;
    }
    .theater-info {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
    }
    .grid-item span {
      font-size: 10px;
      font-weight: bold;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: block;
      margin-bottom: 2px;
    }
    .grid-item p {
      margin: 0;
      font-size: 13px;
      font-weight: 750;
      color: #1f2937;
    }
    .seats-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
    }
    .seats-section span {
      font-size: 10px;
      font-weight: bold;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: block;
      margin-bottom: 6px;
    }
    .footer {
      background-color: #f9fafb;
      border-top: 1px dashed #e5e7eb;
      padding: 24px;
      text-align: center;
    }
    .qr-box {
      display: inline-block;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 12px;
      border-radius: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      width: 96px;
      height: 96px;
      padding: 6px;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .qr-node {
      border-radius: 2px;
    }
    .qr-dark { background-color: #111827; }
    .qr-light { background-color: #ffffff; }
    .footer-text {
      font-size: 10px;
      font-family: monospace;
      font-weight: bold;
      letter-spacing: 0.15em;
      color: #6b7280;
      margin-top: 8px;
      display: block;
    }
    .print-button {
      display: block;
      width: 100%;
      background-color: #e11932;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 12px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: 12px;
    }
    .print-button:hover {
      background-color: #b70022;
    }
    .instructions {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 12px;
      line-height: 1.4;
    }
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .ticket-container {
        border: none;
        box-shadow: none;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="header">
      <h1>CINE POP</h1>
      <p>Comprobante de Reserva</p>
    </div>
    
    <div class="content">
      <div class="movie-section">
        <img class="movie-poster" src="${movie.posterUrl}" alt="${movie.title}" referrerpolicy="no-referrer">
        <div class="movie-details">
          <div class="badge">TICKET DIGITAL</div>
          <h2 class="movie-title">${movie.title}</h2>
          <p class="theater-info">CC Downtown Mall</p>
        </div>
      </div>
      
      <div class="grid">
        <div class="grid-item">
          <span>Sala</span>
          <p>${showtime.cinema}</p>
        </div>
        <div class="grid-item">
          <span>Fecha</span>
          <p>${showtime.date}</p>
        </div>
        <div class="grid-item">
          <span>Hora</span>
          <p>${showtime.time} PM</p>
        </div>
        <div class="grid-item">
          <span>Reserva</span>
          <p style="font-family: monospace; font-size: 15px; font-weight: 800;">${reservationCode}</p>
        </div>
      </div>
      
      <div class="seats-section">
        <span>Butacas Reservadas</span>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${seatsHtml}
        </div>
      </div>
      
      ${snacksHtml}
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: baseline;">
        <div>
          <span style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; display: block;">Pago</span>
          <p style="margin: 0; font-size: 13px; font-weight: 750; color: #4b5563;">${paymentMethod === 'transfer' ? `PSE (${selectedBank})` : 'Efectivo en Taquilla'}</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; display: block;">Total</span>
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #e11932;">${formatPrice(finalTotal)} COP</p>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="qr-box">
        <div class="qr-grid">
          <div class="qr-node qr-dark"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-dark"></div>
          <div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div>
          <div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div>
          <div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div>
          <div class="qr-node qr-dark"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-light"></div><div class="qr-node qr-dark"></div><div class="qr-node qr-dark"></div>
        </div>
        <span class="footer-text">E-TICKET ÚNICO</span>
      </div>
      
      <div class="no-print">
        <button onclick="window.print()" class="print-button">Imprimir este Ticket</button>
        <p class="instructions">Este ticket sirve como comprobante oficial. Ábrelo en tu navegador e imprímelo en formato físico o PDF.</p>
      </div>
    </div>
  </div>
  
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CinePop_Ticket_${reservationCode}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isPurchased) {
    // Ticket success UI
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* Confetti banner success header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 border-4 border-emerald-50">
            <Check className="w-8 h-8 font-black" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-sans text-neutral-900 tracking-tight flex items-center justify-center gap-1.5">
              {paymentMethod === 'cash' ? '¡Asientos Apartados con Éxito!' : '¡Disfruta la Función!'}
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              {paymentMethod === 'cash' 
                ? 'Tus butacas han sido apartadas y bloqueadas en nuestro sistema. Presenta tu código de reserva directamente en la taquilla del cine para realizar tu pago en efectivo o tarjeta física y reclamar tus entradas.'
                : 'Tu compra ha sido procesada de manera exitosa. Hemos enviado el comprobante de pago y código QR a tu correo electrónico registrado.'
              }
            </p>
          </div>
        </div>

        {/* Real ticketing voucher card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-neutral-200 divide-y-2 divide-dashed divide-slate-250 relative">
          
          {/* Top segment: Movie branding ticket metadata */}
          <div className="p-6 relative">
            {/* Ambient decorative ticket cutouts */}
            <div className="absolute -left-3 bottom-0 w-6 h-6 rounded-full bg-slate-100 border-r border-neutral-200"></div>
            <div className="absolute -right-3 bottom-0 w-6 h-6 rounded-full bg-slate-100 border-l border-neutral-200"></div>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Poster columns */}
              <div className="w-24 h-36 rounded-xl bg-slate-100 overflow-hidden shadow-md border border-slate-200/50 shrink-0 self-center sm:self-start">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Theater, schedule elements */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-brand-red text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider leading-none">
                    TICKET DIGITAL
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-brand-yellow/30 leading-none">
                    XD COMFORT
                  </span>
                </div>

                <h3 className="font-extrabold text-neutral-900 font-sans text-xl leading-tight">
                  {movie.title}
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-medium">Cine Sala</span>
                    <p className="font-bold text-neutral-800 truncate">{showtime.cinema}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-medium">Ubicación</span>
                    <p className="font-bold text-neutral-800">C.C. Downtown Mall</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-medium">Fecha de Función</span>
                    <p className="font-bold text-neutral-850">{showtime.date}</p>
                  </div>
                  <button className="text-left space-y-0.5 pointer-events-none">
                    <span className="text-neutral-400 font-medium">Hora de Inicio</span>
                    <p className="font-bold text-brand-red text-sm">{showtime.time} PM</p>
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Bottom segment: Seating indices QR barcode metadata */}
          <div className="p-6 bg-slate-50 relative flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Ambient decorative ticket cutouts */}
            <div className="absolute -left-3 top-0 -translate-y-3 w-6 h-6 rounded-full bg-slate-100 border-r border-neutral-200"></div>
            <div className="absolute -right-3 top-0 -translate-y-3 w-6 h-6 rounded-full bg-slate-100 border-l border-neutral-200"></div>

            <div className="space-y-4 flex-1">
              {/* Seats numbers display */}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-extrabold block">
                  Butacas Confirmadas
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedSeats.map(s => (
                    <span key={s.id} className="text-sm font-mono font-black text-neutral-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 flex items-center justify-center">
                      {s.id}
                    </span>
                  ))}
                </div>
              </div>

              {/* Snacks confirmation if any */}
              {cartSnacks.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-extrabold block">
                    Combos Adicionales Dulcería
                  </span>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                    Recoge en caja rápida mostrando este cupón: <strong className="text-neutral-800">
                      {cartSnacks.map(cs => `${cs.quantity}x ${cs.snack.name}`).join(', ')}
                    </strong>
                  </p>
                </div>
              )}

              {/* Final price reference details */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 border-dashed text-xs">
                <div>
                  <span className="text-neutral-400 block font-medium">Código de Reserva</span>
                  <span className="font-mono font-extrabold text-neutral-900 text-sm">{reservationCode}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-medium">
                    {paymentMethod === 'transfer' ? `PSE (${selectedBank})` : 'Efectivo en Taquilla'}
                  </span>
                  <span className="font-bold text-neutral-800">
                    {formatPrice(finalTotal)} COP
                    {paymentMethod === 'cash' && <span className="text-[10px] text-amber-600 block leading-none font-bold mt-0.5">Pendiente de Pago</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated high-fidelity ticket QR barcode */}
            <div className="flex flex-col items-center justify-center shrink-0 border border-slate-200 bg-white p-4.5 rounded-2xl shadow-sm text-center">
              
              {/* QR Image Representation */}
              <div className="w-30 h-30 bg-neutral-100 flex items-center justify-center rounded-lg relative overflow-hidden">
                {/* Simulated nice abstract QR code grid using small grid nodes */}
                <div className="grid grid-cols-5 gap-1.5 w-24 h-24 p-1.5 bg-white border border-slate-200 rounded">
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-white"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                </div>
              </div>
              
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 mt-2">
                E-TICKET ÚNICO
              </span>
              <span className="text-[8px] text-neutral-400 mt-0.5 italic">Presentar en puerta de sala</span>
            </div>

          </div>
        </div>

        {/* Action utility buttons */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <div className="flex flex-wrap gap-4 justify-center items-center">
            <button
              onClick={handleThermalPrint}
              disabled={thermalPrintStatus === 'printing'}
              className="px-5 py-3 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-slate-900/10 disabled:opacity-50"
            >
              {thermalPrintStatus === 'printing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>
                {thermalPrintStatus === 'printing' ? 'Imprimiendo...' : 'Imprimir en Taquilla'}
              </span>
            </button>

            <button 
              onClick={handlePrint}
              className="px-5 py-3 bg-brand-red text-white text-xs font-bold hover:bg-brand-red-dark rounded-xl transition-all flex items-center gap-2 shadow-md shadow-brand-red/10"
            >
              <Printer className="w-4 h-4" />
              <span>Descargar Ticket</span>
            </button>
            
            <button 
              onClick={() => alert(`Enlace de ticket compartido: \nRef: ${reservationCode}`)}
              className="px-4 py-2.5 bg-white text-xs font-bold text-neutral-600 hover:text-neutral-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-neutral-400" />
              <span>Compartir</span>
            </button>
          </div>

          {thermalPrintStatus === 'success' && (
            <div className="max-w-md w-full p-4 bg-emerald-50 border border-emerald-200/70 rounded-2xl text-xs text-emerald-900 leading-relaxed flex items-center gap-2 animate-fade-in shadow-sm">
              <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>Ticket enviado a la impresora de taquilla correctamente.</span>
            </div>
          )}

          {thermalPrintStatus === 'error' && (
            <div className="max-w-md w-full p-4 bg-red-50 border border-red-200/70 rounded-2xl text-xs text-red-900 leading-relaxed space-y-1.5 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                <span>No se pudo imprimir en la impresora física</span>
              </div>
              <p>{thermalPrintError}</p>
              <p className="text-red-700">
                Verifica que el agente de impresión (print-agent) esté abierto en esta PC y que la impresora esté encendida y conectada a la red. Mientras tanto puedes usar "Descargar Ticket".
              </p>
            </div>
          )}

          {printAlert && (
            <div className="max-w-md w-full p-4 bg-amber-50 border border-amber-200/70 rounded-2xl text-xs text-amber-900 leading-relaxed space-y-2 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <ShieldCheck className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <span>ℹ️ Ticket descargado e impreso de forma segura</span>
              </div>
              <p>
                Debido a las restricciones de seguridad de los navegadores dentro de las visualizaciones interactivas (iframes), la ventana emergente de impresión puede ser bloqueada.
              </p>
              <p className="font-semibold text-amber-950">
                👉 Hemos descargado automáticamente tu <strong>Ticket de Cine en formato HTML autoimprimible</strong>. Solo debes abrir el archivo descargado en tu dispositivo para imprimirlo al instante.
              </p>
            </div>
          )}
        </div>

      </div>
    );
  }

  // Active Checkout state
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* Left Block: Payment cards/transfers/cash forms simulator (7 cols) */}
      <section className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-red" />
              <h3 className="font-bold text-neutral-900 font-sans text-lg">Método de Pago</h3>
            </div>
            <span className="text-xs text-neutral-400 font-medium">Selecciona tu opción preferida</span>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setPaymentMethod('transfer'); setFormErrors({}); }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === 'transfer'
                  ? 'bg-white text-neutral-900 shadow-sm border border-slate-200/50'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50/50'
              }`}
            >
              <Building className="w-4 h-4 shrink-0 text-amber-600" />
              <span className="truncate">Transferencia (PSE)</span>
            </button>

            <button
              type="button"
              onClick={() => { setPaymentMethod('cash'); setFormErrors({}); }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-white text-neutral-900 shadow-sm border border-slate-200/50'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50/50'
              }`}
            >
              <Coins className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Efectivo Taquilla</span>
            </button>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            
            {/* BANK TRANSFER FORM (PSE / NEQUI) */}
            {paymentMethod === 'transfer' && (
              <div className="space-y-4 animate-fade-in">
                {/* Trust explanation alert block */}
                <div className="p-4 bg-emerald-50/75 border border-emerald-200/60 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                    <span>¿Por qué es 100% seguro pagar por PSE / Transferencia?</span>
                  </div>
                  <div className="text-xs text-emerald-800 space-y-2 leading-relaxed">
                    <p>
                      🔒 <strong>Sin claves compartidas:</strong> La transacción se realiza en el portal oficial y encriptado de tu propio banco (como Bancolombia, Nequi, BBVA). <strong>Cine Pop nunca solicita, guarda ni tiene acceso</strong> a tus contraseñas ni números de tarjeta.
                    </p>
                    <p>
                      🛡️ <strong>Cero riesgo de clonación:</strong> Al ser un débito en tiempo real que requiere tu autorización directa (OTP, huella, FaceID o Token en la app de tu celular), es el método más seguro contra fraudes de terceros.
                    </p>
                    <p>
                      🏢 <strong>Vigilado por la Superintendencia Financiera:</strong> Toda la plataforma tecnológica PSE está auditada y respaldada por el sistema bancario colombiano, asegurando que tu pago se registre de inmediato y sin intermediarios dudosos.
                    </p>
                  </div>
                </div>
                {/* Bank Select */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Selecciona tu Banco o Entidad</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-slate-50 text-neutral-800 px-4 py-3 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-sm outline-none transition-all"
                  >
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Davivienda">Davivienda</option>
                    <option value="Banco de Bogotá">Banco de Bogotá</option>
                    <option value="BBVA">BBVA Colombia</option>
                    <option value="Banco de Occidente">Banco de Occidente</option>
                    <option value="Banco Popular">Banco Popular</option>
                    <option value="Lulo Bank">Lulo Bank</option>
                    <option value="RappiPay">RappiPay</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Document Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Tipo Doc.</label>
                    <select
                      value={userDocType}
                      onChange={(e) => setUserDocType(e.target.value)}
                      className="w-full bg-slate-50 text-neutral-800 px-4 py-3 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-sm outline-none transition-all"
                    >
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="TI">Tarjeta de Identidad</option>
                      <option value="NIT">NIT (Empresas)</option>
                    </select>
                  </div>

                  {/* Document Number */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Número de Documento</label>
                    <input
                      type="text"
                      required
                      value={userDocNum}
                      onChange={(e) => setUserDocNum(e.target.value.replace(/\D/g, ''))}
                      placeholder="Número de identidad"
                      className="w-full bg-slate-50 text-neutral-800 px-4 py-3 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-neutral-400"
                    />
                    {formErrors.userDocNum && <p className="text-xs text-brand-red font-medium mt-1">{formErrors.userDocNum}</p>}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Número Celular (Asociado al Banco)</label>
                  <input
                    type="tel"
                    required
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 300 123 4567"
                    className="w-full bg-slate-50 text-neutral-800 px-4 py-3 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-neutral-400"
                  />
                  {formErrors.userPhone && <p className="text-xs text-brand-red font-medium mt-1">{formErrors.userPhone}</p>}
                </div>

                <p className="text-[11px] text-neutral-400 italic">
                  * Al presionar "Confirmar Pago", se abrirá de manera segura el sistema de recaudo para debitar directamente el valor de {formatPrice(finalTotal)} COP de tu cuenta.
                </p>
              </div>
            )}

            {/* CASH PAYMENT FORM */}
            {paymentMethod === 'cash' && (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Apartar Seat Ribbon */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="p-2 bg-emerald-500 rounded-lg text-white font-extrabold text-sm shrink-0 flex items-center justify-center leading-none">
                    FREE
                  </span>
                  <div className="space-y-0.5">
                    <strong className="text-emerald-800 text-xs uppercase font-extrabold tracking-wider block">¡Aparta tus Asientos Ahora!</strong>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Reserva tus butacas preferidas de forma gratuita online y realiza el pago directamente en la taquilla física del cine al llegar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Document Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Tipo Doc.</label>
                    <select
                      value={userDocType}
                      onChange={(e) => setUserDocType(e.target.value)}
                      className="w-full bg-slate-50 text-neutral-800 px-4 py-3 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-sm outline-none transition-all"
                    >
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="TI">Tarjeta de Identidad</option>
                    </select>
                  </div>

                  {/* Document Number */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Número de Documento</label>
                    <input
                      type="text"
                      required
                      value={userDocNum}
                      onChange={(e) => setUserDocNum(e.target.value.replace(/\D/g, ''))}
                      placeholder="Número de identidad para la reserva"
                      className="w-full bg-slate-50 text-neutral-800 px-4 py-3 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-neutral-400"
                    />
                    {formErrors.userDocNum && <p className="text-xs text-brand-red font-medium mt-1">{formErrors.userDocNum}</p>}
                  </div>
                </div>

                {/* Nice warning instruction box */}
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-800 leading-relaxed space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>¿Cómo funciona el pago en taquilla?</span>
                  </div>
                  <p>
                    1. Al hacer clic en <strong>"Reservar y Pagar"</strong>, tus asientos quedarán bloqueados y asegurados a tu nombre.
                  </p>
                  <p>
                    2. Obtendrás un <strong>Código de Reserva único ({reservationCode})</strong>.
                  </p>
                  <p>
                    3. Dirígete a la taquilla física del cine antes de la función, muestra tu código, paga el valor correspondiente en efectivo o tarjeta física y reclama tus boletas impresas.
                  </p>
                  <p className="text-[10px] text-amber-700 italic font-semibold pt-1 border-t border-amber-200">
                    * Nota importante: Debes presentarte en taquilla al menos 30 minutos antes del inicio de la función, de lo contrario la reserva se cancelará automáticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Secure guidelines logo terms */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3 text-xs text-neutral-500 leading-normal">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-800 block">Certificado de Pago Seguro SSL</strong>
                <span>Tus transacciones de pago están encriptadas de extremo a extremo. Los datos bancarios nunca se guardan en nuestros servidores.</span>
              </div>
            </div>

            {/* Submission buttons bar */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onPrevStep}
                className="px-5 py-3 border border-slate-200 text-xs text-neutral-500 hover:text-neutral-900 bg-white hover:bg-slate-100 rounded-xl font-bold uppercase transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3.5 flex-1 bg-brand-red text-white uppercase tracking-wider font-bold text-xs hover:bg-brand-red-dark rounded-xl transition-all flex justify-center items-center gap-2 active:scale-98 shadow-md shadow-brand-red/10 disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    <span>
                      {paymentMethod === 'card' ? 'Procesando Pago Seguro...' : paymentMethod === 'transfer' ? 'Conectando con PSE...' : 'Generando Comprobante...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span>
                      {paymentMethod === 'card'
                        ? `Pagar ${formatPrice(finalTotal)}`
                        : paymentMethod === 'transfer'
                        ? `Pagar con PSE: ${formatPrice(finalTotal)}`
                        : `Reservar y Pagar: ${formatPrice(finalTotal)}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </section>

      {/* Right Column: Reservation recap details (5 cols) */}
      <aside className="lg:col-span-5 sticky top-28 space-y-4">
        
        {/* Promocode Coupon box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans block">
            ¿Posees algún Código de Descuento?
          </span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Código (Ej: PREMIERE)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                disabled={promoApplied}
                className="w-full bg-slate-50 text-neutral-800 px-3 pl-8 py-2 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg text-xs outline-none transition-all placeholder:text-neutral-400"
              />
              <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            
            <button
              onClick={handleApplyPromo}
              disabled={promoApplied || !promoCode}
              className="px-4 py-2 bg-slate-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition-all shrink-0 uppercase active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              Aplicar
            </button>
          </div>
          
          {promoApplied && (
            <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-250 p-2 rounded-lg font-bold flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Código aplicado con éxito: ¡{formatPrice(4000)} de descuento!</span>
            </div>
          )}

          {promoError && (
            <p className="text-xs text-brand-red font-medium animate-fade-in">{promoError}</p>
          )}
        </div>

        {/* Breakdown Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/40">
            <h4 className="font-bold text-xs text-neutral-800 uppercase tracking-wider font-sans">
              Resumen de Compra
            </h4>
          </div>

          <div className="p-5 space-y-3 font-sans text-xs divide-y divide-slate-100 divide-dashed">
            {/* Movie summary info */}
            <div className="pb-3 grid grid-cols-2 gap-4">
              <div>
                <span className="text-neutral-400 block font-medium">Película</span>
                <strong className="text-neutral-900 font-bold truncate block">{movie.title}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">Horario</span>
                <strong className="text-neutral-900 font-bold truncate block">{showtime.date} • {showtime.time}</strong>
              </div>
            </div>

            {/* Seats detail list */}
            <div className="py-3 flex justify-between items-baseline">
              <div>
                <span className="text-neutral-400 block font-medium">Entradas ({selectedSeats.length})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSeats.map(s => (
                    <span key={s.id} className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-neutral-600 font-bold">
                      {s.id}
                    </span>
                  ))}
                </div>
              </div>
              <span className="font-semibold text-neutral-800">{formatPrice(seatsTotal)}</span>
            </div>

            {/* Snacks details if any */}
            {cartSnacks.length > 0 && (
              <div className="py-3 space-y-1.5">
                <span className="text-neutral-400 block font-medium">Dulcería Adicional</span>
                <div className="space-y-1">
                  {cartSnacks.map(cs => (
                    <div key={cs.snack.id} className="flex justify-between text-neutral-600">
                      <span>{cs.quantity}x {cs.snack.name}</span>
                      <span className="font-medium">{formatPrice(cs.snack.price * cs.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed fee additions and subtotal */}
            <div className="py-3 space-y-1.5">
              <div className="flex justify-between text-neutral-500">
                <span>Cargos por Servicio de Reserva</span>
                <span>{formatPrice(transactionFee)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Descuento Promocional</span>
                  <span>-{formatPrice(promoDiscount)}</span>
                </div>
              )}
            </div>

            {/* Final Grand total */}
            <div className="pt-3.5 flex justify-between items-baseline font-sans">
              <span className="text-xs text-neutral-500 font-extrabold uppercase">Total Final</span>
              <span className="text-3xl font-black text-brand-red tracking-tight leading-none">
                {formatPrice(finalTotal)}
              </span>
            </div>

          </div>
        </div>

        {/* Decorative heart message */}
        <p className="text-[10px] text-neutral-400 text-center leading-normal max-w-[280px] mx-auto flex items-center justify-center gap-1">
          <Heart className="w-3.5 h-3.5 text-brand-red fill-brand-red shrink-0" />
          <span>¡Gracias por elegir Cine Pop!</span>
        </p>

      </aside>

    </div>
  );
}
