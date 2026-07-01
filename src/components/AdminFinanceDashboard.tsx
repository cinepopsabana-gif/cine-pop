import React, { useState, useMemo } from 'react';
import { SaleRecord, ExpenseRecord } from '../types';
import { formatPrice } from '../utils';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Armchair, 
  Utensils, 
  Calendar, 
  Tag, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Activity, 
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  CalendarRange,
  Layers,
  ListFilter
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  Line
} from 'recharts';

interface AdminFinanceDashboardProps {
  salesHistory: SaleRecord[];
  expenses: ExpenseRecord[];
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
}

const EXPENSE_CATEGORIES = ['Servicios', 'Personal', 'Limpieza', 'Mantenimiento', 'Insumos', 'Otros'] as const;

const COLORS = ['#e11932', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

interface UnifiedMovement {
  id: string;
  type: 'ingreso' | 'egreso';
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
  paymentMethod?: 'transfer' | 'cash';
  bankName?: string;
  customerDoc?: string;
}

interface DayGroup {
  date: string;
  displayDate: string;
  ingresos: number;
  gastos: number;
  balance: number;
  movements: UnifiedMovement[];
}

interface MonthGroup {
  monthKey: string; // YYYY-MM
  displayMonth: string;
  ingresos: number;
  gastos: number;
  balance: number;
  movements: UnifiedMovement[];
}

export default function AdminFinanceDashboard({
  salesHistory,
  expenses,
  setExpenses
}: AdminFinanceDashboardProps) {
  // Expense Form State
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCat, setExpenseCat] = useState<typeof EXPENSE_CATEGORIES[number]>('Insumos');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [expenseError, setExpenseError] = useState('');

  // Period / Grouping toggle
  // Options: 'daily' (Vista por Días), 'monthly' (Vista por Meses), 'individual_sales' (Libro Ventas), 'individual_expenses' (Libro Gastos)
  const [viewPeriodMode, setViewPeriodMode] = useState<'daily' | 'monthly' | 'individual_sales' | 'individual_expenses'>('daily');

  // Expanded blocks states
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Filtering states for sales
  const [salesSearch, setSalesSearch] = useState('');
  const [salesMovieFilter, setSalesMovieFilter] = useState('all');
  const [salesPayFilter, setSalesPayFilter] = useState('all');

  // Filtering states for expenses
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCatFilter, setExpenseCatFilter] = useState('all');

  // Unified General Search for period lists
  const [generalSearch, setGeneralSearch] = useState('');

  // Helper to format date nicely in Spanish
  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayName = daysOfWeek[d.getDay()];
        return `${dayName}, ${parts[2]} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`;
      }
    } catch (_) {}
    return dateStr;
  };

  // Helper to format YYYY-MM into readable Spanish month
  const formatMonthName = (yearMonth: string) => {
    try {
      const [year, month] = yearMonth.split('-');
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthName = months[parseInt(month) - 1] || month;
      return `${monthName} del ${year}`;
    } catch (_) {}
    return yearMonth;
  };

  // 1. Calculate Summary Financial Metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = salesHistory.reduce((acc, s) => acc + s.total, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Seats sold count
    const totalSeatsSold = salesHistory.reduce((acc, s) => acc + s.seats.length, 0);
    
    // Snack items count
    const totalSnacksSold = salesHistory.reduce((acc, s) => {
      const snacksCount = s.snacks.reduce((sum, item) => sum + item.quantity, 0);
      return acc + snacksCount;
    }, 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalSeatsSold,
      totalSnacksSold
    };
  }, [salesHistory, expenses]);

  // 2. Prepare Recharts Data for Daily Income vs Expenses (Last 12 days)
  const chartDailyFinance = useMemo(() => {
    const dailyMap: Record<string, { date: string; displayDate: string; ingresos: number; gastos: number }> = {};
    
    // Populate sales
    salesHistory.forEach(s => {
      const rawDate = s.date;
      if (!dailyMap[rawDate]) {
        let display = rawDate;
        try {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            display = `${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
          }
        } catch (_) {}
        dailyMap[rawDate] = { date: rawDate, displayDate: display, ingresos: 0, gastos: 0 };
      }
      dailyMap[rawDate].ingresos += s.total;
    });

    // Populate expenses
    expenses.forEach(e => {
      const rawDate = e.date;
      if (!dailyMap[rawDate]) {
        let display = rawDate;
        try {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            display = `${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
          }
        } catch (_) {}
        dailyMap[rawDate] = { date: rawDate, displayDate: display, ingresos: 0, gastos: 0 };
      }
      dailyMap[rawDate].gastos += e.amount;
    });

    // Convert to sorted array (limit to last 12 days for cleaner display)
    return Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);
  }, [salesHistory, expenses]);

  // 2.5 Prepare Recharts Data for Daily Sales Volume and Revenue Trend (Last 30 Days)
  const chartLastMonthPerformance = useMemo(() => {
    const baseDate = new Date();
    const last30Days: string[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      last30Days.push(`${yyyy}-${mm}-${dd}`);
    }

    let totalMonthRevenue = 0;
    let totalMonthTickets = 0;
    let totalMonthSales = 0;

    const data = last30Days.map(dateStr => {
      const daySales = salesHistory.filter(s => s.date === dateStr);
      
      const totalRevenue = daySales.reduce((sum, s) => sum + s.total, 0);
      const transactionsCount = daySales.length;
      const ticketsCount = daySales.reduce((sum, s) => sum + s.seats.length, 0);
      
      totalMonthRevenue += totalRevenue;
      totalMonthTickets += ticketsCount;
      totalMonthSales += transactionsCount;

      let displayDate = dateStr;
      try {
        const parts = dateStr.split('-');
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        displayDate = `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]}`;
      } catch (_) {}

      return {
        date: dateStr,
        displayDate,
        revenue: totalRevenue,
        salesVolume: ticketsCount,
        transactions: transactionsCount,
      };
    });

    return {
      data,
      metrics: {
        totalMonthRevenue,
        totalMonthTickets,
        totalMonthSales,
        averageDailyRevenue: totalMonthRevenue / 30
      }
    };
  }, [salesHistory]);

  // 3. Prepare Recharts Data for Sales by Movie
  const chartMovieSales = useMemo(() => {
    const movieMap: Record<string, { name: string; value: number }> = {};
    salesHistory.forEach(s => {
      const title = s.movieTitle;
      if (!movieMap[title]) {
        movieMap[title] = { name: title, value: 0 };
      }
      movieMap[title].value += s.total;
    });
    return Object.values(movieMap);
  }, [salesHistory]);

  // 4. Prepare Recharts Data for Snacks Sold
  const chartSnacksSold = useMemo(() => {
    const snackMap: Record<string, { name: string; unidades: number; totalRecaudado: number }> = {};
    salesHistory.forEach(s => {
      s.snacks.forEach(cs => {
        const name = cs.snack.name;
        if (!snackMap[name]) {
          snackMap[name] = { name, unidades: 0, totalRecaudado: 0 };
        }
        snackMap[name].unidades += cs.quantity;
        snackMap[name].totalRecaudado += cs.snack.price * cs.quantity;
      });
    });
    return Object.values(snackMap).sort((a, b) => b.unidades - a.unidades);
  }, [salesHistory]);

  // 5. Unique movie list for filters
  const uniqueMovies = useMemo(() => {
    const moviesSet = new Set<string>();
    salesHistory.forEach(s => moviesSet.add(s.movieTitle));
    return Array.from(moviesSet);
  }, [salesHistory]);

  // Handle adding an operational expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');

    if (!expenseDesc.trim()) {
      setExpenseError('Ingresa una descripción detallada del gasto.');
      return;
    }

    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setExpenseError('Ingresa un monto válido mayor a 0 COP.');
      return;
    }

    if (!expenseDate) {
      setExpenseError('Selecciona una fecha para el registro.');
      return;
    }

    const newExpense: ExpenseRecord = {
      id: 'EXP-' + Date.now().toString().slice(-6),
      date: expenseDate,
      category: expenseCat,
      description: expenseDesc.trim(),
      amount: parsedAmount
    };

    setExpenses(prev => [newExpense, ...prev]);
    
    // Reset form fields
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseError('');
  };

  // Handle deleting an expense
  const handleDeleteExpense = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto operativo?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  // Filter Sales list
  const filteredSales = useMemo(() => {
    return salesHistory.filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(salesSearch.toLowerCase()) ||
                            s.movieTitle.toLowerCase().includes(salesSearch.toLowerCase()) ||
                            (s.customerDoc && s.customerDoc.includes(salesSearch));
      const matchesMovie = salesMovieFilter === 'all' || s.movieTitle === salesMovieFilter;
      const matchesPay = salesPayFilter === 'all' || s.paymentMethod === salesPayFilter;
      
      return matchesSearch && matchesMovie && matchesPay;
    });
  }, [salesHistory, salesSearch, salesMovieFilter, salesPayFilter]);

  // Filter Expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                            e.id.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchesCat = expenseCatFilter === 'all' || e.category === expenseCatFilter;
      
      return matchesSearch && matchesCat;
    });
  }, [expenses, expenseSearch, expenseCatFilter]);

  // 6. Grouped Daily Data Logic (For the new tab option)
  const dayGroups = useMemo(() => {
    const groups: Record<string, DayGroup> = {};

    // Incorporate Sales
    salesHistory.forEach(s => {
      const d = s.date;
      if (!groups[d]) {
        groups[d] = { date: d, displayDate: formatDisplayDate(d), ingresos: 0, gastos: 0, balance: 0, movements: [] };
      }
      
      const seatsCount = s.seats.length;
      const snacksCount = s.snacks.reduce((sum, item) => sum + item.quantity, 0);
      const desc = `${seatsCount} Sillas + ${snacksCount} Snacks (Res: ${s.id})`;

      groups[d].ingresos += s.total;
      groups[d].movements.push({
        id: s.id,
        type: 'ingreso',
        date: d,
        category: s.movieTitle,
        description: desc,
        amount: s.total,
        paymentMethod: s.paymentMethod,
        bankName: s.bankName,
        customerDoc: s.customerDoc
      });
    });

    // Incorporate Expenses
    expenses.forEach(e => {
      const d = e.date;
      if (!groups[d]) {
        groups[d] = { date: d, displayDate: formatDisplayDate(d), ingresos: 0, gastos: 0, balance: 0, movements: [] };
      }

      groups[d].gastos += e.amount;
      groups[d].movements.push({
        id: e.id,
        type: 'egreso',
        date: d,
        category: e.category,
        description: e.description,
        amount: e.amount
      });
    });

    // Sort days chronologically (newest first), compute balances, filter by general search query if exists
    return Object.values(groups)
      .map(g => {
        g.balance = g.ingresos - g.gastos;
        g.movements.sort((a, b) => b.type.localeCompare(a.type)); // incomes first
        return g;
      })
      .filter(g => {
        if (!generalSearch) return true;
        const q = generalSearch.toLowerCase();
        return g.date.includes(q) || g.displayDate.toLowerCase().includes(q) ||
               g.movements.some(m => m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [salesHistory, expenses, generalSearch]);

  // 7. Grouped Monthly Data Logic (For the new tab option)
  const monthGroups = useMemo(() => {
    const groups: Record<string, MonthGroup> = {};

    const getMonthKey = (dateStr: string) => dateStr.substring(0, 7); // Returns "YYYY-MM"

    // Incorporate Sales
    salesHistory.forEach(s => {
      const m = getMonthKey(s.date);
      if (!groups[m]) {
        groups[m] = { monthKey: m, displayMonth: formatMonthName(m), ingresos: 0, gastos: 0, balance: 0, movements: [] };
      }

      const seatsCount = s.seats.length;
      const snacksCount = s.snacks.reduce((sum, item) => sum + item.quantity, 0);
      const desc = `${seatsCount} Sillas + ${snacksCount} Snacks (Res: ${s.id})`;

      groups[m].ingresos += s.total;
      groups[m].movements.push({
        id: s.id,
        type: 'ingreso',
        date: s.date,
        category: s.movieTitle,
        description: desc,
        amount: s.total,
        paymentMethod: s.paymentMethod,
        bankName: s.bankName,
        customerDoc: s.customerDoc
      });
    });

    // Incorporate Expenses
    expenses.forEach(e => {
      const m = getMonthKey(e.date);
      if (!groups[m]) {
        groups[m] = { monthKey: m, displayMonth: formatMonthName(m), ingresos: 0, gastos: 0, balance: 0, movements: [] };
      }

      groups[m].gastos += e.amount;
      groups[m].movements.push({
        id: e.id,
        type: 'egreso',
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount
      });
    });

    // Sort months, compute balances, filter by general search query if exists
    return Object.values(groups)
      .map(g => {
        g.balance = g.ingresos - g.gastos;
        g.movements.sort((a, b) => b.date.localeCompare(a.date)); // Sort by date inside the month
        return g;
      })
      .filter(g => {
        if (!generalSearch) return true;
        const q = generalSearch.toLowerCase();
        return g.monthKey.includes(q) || g.displayMonth.toLowerCase().includes(q) ||
               g.movements.some(m => m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [salesHistory, expenses, generalSearch]);

  const toggleDayExpand = (dayStr: string) => {
    setExpandedDays(prev => ({ ...prev, [dayStr]: !prev[dayStr] }));
  };

  const toggleMonthExpand = (monthStr: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthStr]: !prev[monthStr] }));
  };

  return (
    <div className="space-y-8 animate-fade-in text-neutral-800 font-sans" id="finance-dashboard">
      
      {/* SECTION 1: FINANCIAL CARDS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Ingresos Totales</span>
            <span className="text-lg font-black text-emerald-700 leading-tight">{formatPrice(summaryMetrics.totalRevenue)}</span>
          </div>
        </div>

        {/* Card 2: Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-red-50 rounded-xl text-brand-red shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Gastos Operativos</span>
            <span className="text-lg font-black text-brand-red leading-tight">{formatPrice(summaryMetrics.totalExpenses)}</span>
          </div>
        </div>

        {/* Card 3: Net Income */}
        <div className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all ${
          summaryMetrics.netProfit >= 0 ? 'border-emerald-200/80' : 'border-red-200/80'
        }`}>
          <div className={`p-3 rounded-xl shrink-0 ${
            summaryMetrics.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Utilidad Neta</span>
            <span className={`text-lg font-black leading-tight ${
              summaryMetrics.netProfit >= 0 ? 'text-emerald-800' : 'text-brand-red'
            }`}>
              {summaryMetrics.netProfit >= 0 ? '+' : ''}{formatPrice(summaryMetrics.netProfit)}
            </span>
          </div>
        </div>

        {/* Card 4: Tickets sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Armchair className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Sillas Vendidas</span>
            <span className="text-lg font-black text-neutral-800 leading-tight">{summaryMetrics.totalSeatsSold} Butacas</span>
          </div>
        </div>

        {/* Card 5: Snacks sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Snacks / Combos</span>
            <span className="text-lg font-black text-neutral-800 leading-tight">{summaryMetrics.totalSnacksSold} Unidades</span>
          </div>
        </div>

      </div>

      {/* SECTION 2: VISUAL CHARTS BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart A: Daily Income vs Expenses BarChart (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-red" />
              <h4 className="font-bold text-neutral-900 text-sm uppercase tracking-wider">Flujo de Caja Consolidado</h4>
            </div>
            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Balance Operativo</span>
          </div>
          
          <div className="h-72 w-full text-xs">
            {chartDailyFinance.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                <AlertCircle className="w-8 h-8 text-neutral-300 mb-2" />
                <span>No hay datos financieros para graficar aún</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDailyFinance}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatPrice(value) + ' COP', '']}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="ingresos" name="Ingresos (Ventas)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos (Mantenimiento)" fill="#e11932" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Movie Sales Contribution PieChart (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-neutral-900 text-sm uppercase tracking-wider">Ventas por Película</h4>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            {chartMovieSales.length === 0 ? (
              <div className="text-neutral-400 text-xs flex flex-col items-center">
                <AlertCircle className="w-8 h-8 text-neutral-300 mb-2" />
                <span>Sin ventas registradas</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartMovieSales}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartMovieSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatPrice(value) + ' COP', '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center Summary Text inside Donut */}
            {chartMovieSales.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                <span className="text-[10px] text-neutral-400 font-extrabold uppercase">Taquilla</span>
                <span className="text-sm font-black text-neutral-800">Cine Pop</span>
              </div>
            )}
          </div>

          {/* Pie Legends */}
          <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
            {chartMovieSales.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between font-medium">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-neutral-600 truncate max-w-[130px]">{item.name}</span>
                </div>
                <span className="font-bold text-neutral-800">{formatPrice(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* NEW SECTION: MONTHLY SALES VOLUME & REVENUE PERFORMANCE TREND */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6" id="last-month-performance">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h4 className="font-extrabold text-neutral-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-red" />
              Rendimiento de Ventas e Ingresos (Último Mes)
            </h4>
            <p className="text-xs text-neutral-400">Análisis detallado de volumen de boletos vendidos y tendencia de ingresos COP diarios de los últimos 30 días</p>
          </div>
          
          {/* Quick Metrics of the Month */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl text-xs font-semibold">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">Ingresos del Mes</span>
              <span className="text-emerald-700 font-black text-sm">{formatPrice(chartLastMonthPerformance.metrics.totalMonthRevenue)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl text-xs font-semibold">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">Boletos Vendidos</span>
              <span className="text-blue-600 font-black text-sm">{chartLastMonthPerformance.metrics.totalMonthTickets} uds</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl text-xs font-semibold">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">Transacciones</span>
              <span className="text-neutral-800 font-black text-sm">{chartLastMonthPerformance.metrics.totalMonthSales} ventas</span>
            </div>
          </div>
        </div>

        {/* Composed Chart Area */}
        <div className="h-80 w-full text-xs">
          {chartLastMonthPerformance.data.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400">
              <AlertCircle className="w-8 h-8 text-neutral-300 mb-2" />
              <span>No hay datos de ventas en los últimos 30 días</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartLastMonthPerformance.data}
                margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  dy={10}
                />
                
                {/* Left Y-Axis for Revenue in COP */}
                <YAxis 
                  yAxisId="left"
                  stroke="#10b981" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(value) => `${value / 1000}k`}
                  label={{ value: 'Ingresos (COP)', angle: -90, position: 'insideLeft', style: { fill: '#059669', fontSize: 10, fontWeight: 'bold' } }}
                />
                
                {/* Right Y-Axis for Tickets Sold Volume */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#3b82f6" 
                  fontSize={10} 
                  tickLine={false} 
                  allowDecimals={false}
                  label={{ value: 'Volumen (Boletos)', angle: 90, position: 'insideRight', style: { fill: '#2563eb', fontSize: 10, fontWeight: 'bold' } }}
                />
                
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'revenue') return [formatPrice(value) + ' COP', 'Rendimiento Ingresos'];
                    if (name === 'salesVolume') return [value + ' Boletos', 'Volumen Ventas'];
                    return [value, name];
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 15 }} />
                
                {/* Background Area for Revenue Trend */}
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  name="revenue"
                  fill="url(#colorRevenue)" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                />
                
                {/* Bar for Daily Tickets Sold (Sales Volume) */}
                <Bar 
                  yAxisId="right"
                  dataKey="salesVolume" 
                  name="salesVolume"
                  fill="#3b82f6" 
                  radius={[3, 3, 0, 0]} 
                  barSize={16}
                />

                {/* Defs for nice gradient under the area line */}
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECTION 3: ADD OPERATIONAL EXPENSE AND SNACKS TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Add Operational Expense Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
          <div className="border-b border-neutral-150 pb-3">
            <h4 className="font-bold text-neutral-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-red shrink-0" />
              Registrar Gasto de Mantenimiento
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">Registra egresos de servicios, salarios o insumos para calcular la rentabilidad real</p>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            
            {/* Expense Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Detalle / Concepto del Gasto</label>
              <input
                type="text"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="Ej: Recarga cilindros de gas o compra vasos"
                className="w-full bg-slate-50 text-neutral-800 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Categoría</label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value as any)}
                  className="w-full bg-slate-50 text-neutral-800 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Monto (COP)</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Ej: 80000"
                  className="w-full bg-slate-50 text-neutral-800 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all"
                />
              </div>
            </div>

            {/* Date input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Fecha del Gasto</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-slate-50 text-neutral-800 px-3.5 py-2.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-xl text-xs outline-none transition-all"
              />
            </div>

            {expenseError && (
              <div className="p-3 bg-red-50 border border-red-200 text-brand-red text-xs rounded-xl flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{expenseError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-red text-white uppercase tracking-wider font-bold text-xs hover:bg-brand-red-dark hover:shadow-lg hover:shadow-brand-red/15 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Gasto en el Sistema</span>
            </button>
          </form>
        </div>

        {/* Right column: Snack popularity ranking table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="border-b border-neutral-150 pb-3 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-neutral-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-600 shrink-0" />
                Consumo de Dulcería y Snacks
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">Ranking de ventas por unidades vendidas y recaudación</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Popularidad</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">
                  <th className="py-2.5">Combo / Alimento</th>
                  <th className="py-2.5 text-center">Unidades Vendidas</th>
                  <th className="py-2.5 text-right">Recaudación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {chartSnacksSold.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-neutral-400">
                      No se han vendido combos ni snacks todavía en el sistema
                    </td>
                  </tr>
                ) : (
                  chartSnacksSold.map((item, idx) => (
                    <tr key={item.name} className="hover:bg-slate-50/40">
                      <td className="py-3 flex items-center gap-2">
                        <span className="w-4.5 h-4.5 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-bold shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-neutral-800 font-bold">{item.name}</span>
                      </td>
                      <td className="py-3 text-center text-neutral-900 font-mono font-bold">{item.unidades}</td>
                      <td className="py-3 text-right text-emerald-700 font-mono font-black">{formatPrice(item.totalRecaudado)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* NEW CENTRAL SECTION: CONSOLIDATED PERIOD MOVEMENTS (BY DAY / BY MONTH) */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden space-y-0" id="consolidated-ledger">
        
        {/* Header containing the primary navigation tabs for the Ledger */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-extrabold text-neutral-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-red" />
              Libro Contable Consolidado (Ingresos y Gastos)
            </h4>
            <p className="text-xs text-neutral-400">Visualiza, agrupa y filtra todos los movimientos del cine por período</p>
          </div>

          {/* Interactive controls for Tab Switching */}
          <div className="flex items-center flex-wrap gap-1.5 bg-white p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => { setViewPeriodMode('daily'); setGeneralSearch(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewPeriodMode === 'daily'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-slate-50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Por Días</span>
            </button>
            <button
              onClick={() => { setViewPeriodMode('monthly'); setGeneralSearch(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewPeriodMode === 'monthly'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-slate-50'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Por Meses</span>
            </button>
            <button
              onClick={() => setViewPeriodMode('individual_sales')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewPeriodMode === 'individual_sales'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Detalle de Ventas</span>
            </button>
            <button
              onClick={() => setViewPeriodMode('individual_expenses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewPeriodMode === 'individual_expenses'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-slate-50'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Detalle de Gastos</span>
            </button>
          </div>
        </div>

        {/* Dynamic Inner Panels based on viewPeriodMode */}
        <div className="p-6">
          
          {/* TAB 1: CONSOLIDATED BY DAY (DAILY VIEW) */}
          {viewPeriodMode === 'daily' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Resumen de Caja Diario</span>
                
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Filtrar fecha, película o código..."
                    value={generalSearch}
                    onChange={(e) => setGeneralSearch(e.target.value)}
                    className="w-full bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 pl-8 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all placeholder:text-neutral-400"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-3.5">
                {dayGroups.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-neutral-300" />
                    <span>No hay registros consolidados diarios que coincidan con la búsqueda.</span>
                  </div>
                ) : (
                  dayGroups.map(day => {
                    const isExpanded = !!expandedDays[day.date];
                    return (
                      <div 
                        key={day.date} 
                        className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-all bg-white"
                      >
                        {/* Day Row Header */}
                        <div 
                          onClick={() => toggleDayExpand(day.date)}
                          className="p-4 sm:px-5 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-neutral-100 rounded-lg text-neutral-600">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-neutral-800 block">{day.displayDate}</span>
                              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase block">
                                {day.movements.length} {day.movements.length === 1 ? 'Movimiento' : 'Movimientos'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] text-neutral-400 font-bold block uppercase tracking-wider">Ingresos</span>
                              <span className="font-mono font-black text-emerald-600 block">{formatPrice(day.ingresos)}</span>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] text-neutral-400 font-bold block uppercase tracking-wider">Gastos</span>
                              <span className="font-mono font-black text-brand-red block">{formatPrice(day.gastos)}</span>
                            </div>
                            <div className="text-left sm:text-right min-w-[80px]">
                              <span className="text-[9px] text-neutral-400 font-bold block uppercase tracking-wider">Balance</span>
                              <span className={`font-mono font-black block ${day.balance >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                                {day.balance >= 0 ? '+' : ''}{formatPrice(day.balance)}
                              </span>
                            </div>
                            <div className="text-neutral-400 shrink-0 self-center">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible itemized list of movements for the day */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-white divide-y divide-slate-50 p-4 sm:p-5 space-y-0.5 animate-slide-down">
                            <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest pb-2 block">
                              Desglose de Operaciones
                            </div>
                            {day.movements.map(mov => (
                              <div key={mov.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                                      mov.type === 'ingreso' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                                    }`}>
                                      {mov.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                                    </span>
                                    <span className="font-mono font-bold text-neutral-400">{mov.id}</span>
                                    <span className="text-neutral-800 font-extrabold">— {mov.category}</span>
                                  </div>
                                  <p className="text-neutral-500 pl-1 font-medium">{mov.description}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                  {mov.paymentMethod && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-neutral-600 rounded text-[10px] font-bold">
                                      {mov.paymentMethod === 'transfer' ? `PSE • ${mov.bankName || 'Banco'}` : 'Efectivo'}
                                    </span>
                                  )}
                                  <span className={`font-mono font-black text-right min-w-[90px] ${
                                    mov.type === 'ingreso' ? 'text-emerald-700' : 'text-brand-red'
                                  }`}>
                                    {mov.type === 'ingreso' ? '+' : '-'}{formatPrice(mov.amount)}
                                  </span>
                                </div>
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
          )}

          {/* TAB 2: CONSOLIDATED BY MONTH (MONTHLY VIEW) */}
          {viewPeriodMode === 'monthly' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Resumen Mensual Consolidado</span>
                
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Filtrar mes o película..."
                    value={generalSearch}
                    onChange={(e) => setGeneralSearch(e.target.value)}
                    className="w-full bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 pl-8 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all placeholder:text-neutral-400"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-3.5">
                {monthGroups.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-neutral-300" />
                    <span>No hay registros consolidados mensuales en el sistema todavía.</span>
                  </div>
                ) : (
                  monthGroups.map(mon => {
                    const isExpanded = !!expandedMonths[mon.monthKey];
                    return (
                      <div 
                        key={mon.monthKey} 
                        className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-all bg-white"
                      >
                        {/* Month Row Header */}
                        <div 
                          onClick={() => toggleMonthExpand(mon.monthKey)}
                          className="p-4 sm:px-5 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-neutral-100 rounded-lg text-neutral-600">
                              <CalendarRange className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-neutral-800 block capitalize">{mon.displayMonth}</span>
                              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase block">
                                {mon.movements.length} operaciones registradas
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] text-neutral-400 font-bold block uppercase tracking-wider">Ingresos Mes</span>
                              <span className="font-mono font-black text-emerald-600 block">{formatPrice(mon.ingresos)}</span>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] text-neutral-400 font-bold block uppercase tracking-wider">Gastos Mes</span>
                              <span className="font-mono font-black text-brand-red block">{formatPrice(mon.gastos)}</span>
                            </div>
                            <div className="text-left sm:text-right min-w-[80px]">
                              <span className="text-[9px] text-neutral-400 font-bold block uppercase tracking-wider">Balance Mes</span>
                              <span className={`font-mono font-black block ${mon.balance >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                                {mon.balance >= 0 ? '+' : ''}{formatPrice(mon.balance)}
                              </span>
                            </div>
                            <div className="text-neutral-400 shrink-0 self-center">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible itemized list of movements for the Month */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-white divide-y divide-slate-50 p-4 sm:p-5 space-y-0.5 animate-slide-down">
                            <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest pb-2 block">
                              Libro de Movimientos Mensual
                            </div>
                            {mon.movements.map(mov => (
                              <div key={mov.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                                      mov.type === 'ingreso' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                                    }`}>
                                      {mov.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                                    </span>
                                    <span className="text-neutral-400 font-bold text-[10px]">{mov.date}</span>
                                    <span className="font-mono font-bold text-neutral-400">{mov.id}</span>
                                    <span className="text-neutral-800 font-extrabold">— {mov.category}</span>
                                  </div>
                                  <p className="text-neutral-500 pl-1 font-medium">{mov.description}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                  {mov.paymentMethod && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-neutral-600 rounded text-[10px] font-bold">
                                      {mov.paymentMethod === 'transfer' ? `PSE • ${mov.bankName || 'Banco'}` : 'Efectivo'}
                                    </span>
                                  )}
                                  <span className={`font-mono font-black text-right min-w-[90px] ${
                                    mov.type === 'ingreso' ? 'text-emerald-700' : 'text-brand-red'
                                  }`}>
                                    {mov.type === 'ingreso' ? '+' : '-'}{formatPrice(mov.amount)}
                                  </span>
                                </div>
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
          )}

          {/* TAB 3: COMPLETE LIST OF TICKET AND FOOD SALES (ORIGINAL VIEW LOG) */}
          {viewPeriodMode === 'individual_sales' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Listado de Ventas Directas</span>
                
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar venta (ID o doc)..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 pl-8 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all placeholder:text-neutral-400"
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Movie Filter */}
                  <div className="relative">
                    <select
                      value={salesMovieFilter}
                      onChange={(e) => setSalesMovieFilter(e.target.value)}
                      className="bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all"
                    >
                      <option value="all">Película (Todas)</option>
                      {uniqueMovies.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method Filter */}
                  <div className="relative">
                    <select
                      value={salesPayFilter}
                      onChange={(e) => setSalesPayFilter(e.target.value)}
                      className="bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all"
                    >
                      <option value="all">Métodos de Pago (Todos)</option>
                      <option value="transfer">Transferencia (PSE)</option>
                      <option value="cash">Efectivo (Taquilla)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">
                      <th className="py-2.5">Código Venta</th>
                      <th className="py-2.5">Fecha</th>
                      <th className="py-2.5">Película / Función</th>
                      <th className="py-2.5">Butacas</th>
                      <th className="py-2.5">Snacks Adicionales</th>
                      <th className="py-2.5">Método Pago</th>
                      <th className="py-2.5 text-right">Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400">
                          No se encontraron transacciones en el historial que coincidan con los filtros
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50/30">
                          <td className="py-3.5 font-mono font-black text-neutral-900">{sale.id}</td>
                          <td className="py-3.5 text-neutral-600 whitespace-nowrap">{sale.date}</td>
                          <td className="py-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-neutral-800 block truncate max-w-[180px]">{sale.movieTitle}</span>
                              <span className="text-[10px] text-neutral-400 font-medium block">
                                {sale.showtimeCinema} • {sale.showtimeTime} PM
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {sale.seats.map(seat => (
                                <span key={seat.id} className="text-[9px] font-mono font-bold bg-neutral-100 border border-slate-200/60 px-1 py-0.2 rounded text-neutral-700">
                                  {seat.id}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 text-neutral-600 max-w-[180px] truncate" title={sale.snacks.map(cs => `${cs.quantity}x ${cs.snack.name}`).join(', ')}>
                            {sale.snacks.length > 0 ? (
                              <span className="text-neutral-700 font-bold">
                                {sale.snacks.map(cs => `${cs.quantity}x ${cs.snack.name}`).join(', ')}
                              </span>
                            ) : (
                              <span className="text-neutral-400 italic">Ninguno</span>
                            )}
                          </td>
                          <td className="py-3.5">
                            <div className="space-y-0.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                sale.paymentMethod === 'transfer' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {sale.paymentMethod === 'transfer' ? 'PSE' : 'Efectivo'}
                              </span>
                              {sale.bankName && (
                                <span className="text-[9px] text-neutral-400 font-mono block">{sale.bankName}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 text-right text-emerald-700 font-mono font-black">{formatPrice(sale.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COMPLETE LIST OF MAINTENANCE EXPENDITURES */}
          {viewPeriodMode === 'individual_expenses' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Listado de Egresos Operativos</span>
                
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar gasto..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 pl-8 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all placeholder:text-neutral-400"
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={expenseCatFilter}
                      onChange={(e) => setExpenseCatFilter(e.target.value)}
                      className="bg-slate-50 text-neutral-800 text-[11px] font-bold px-3 py-1.5 border border-slate-200 focus:border-brand-red focus:bg-white rounded-lg outline-none transition-all"
                    >
                      <option value="all">Categorías (Todas)</option>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">
                      <th className="py-2.5">ID Gasto</th>
                      <th className="py-2.5">Fecha</th>
                      <th className="py-2.5">Categoría</th>
                      <th className="py-2.5">Descripción / Destino</th>
                      <th className="py-2.5 text-right">Monto</th>
                      <th className="py-2.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          No se encontraron gastos operativos registrados que coincidan con los filtros
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50/30">
                          <td className="py-3 font-mono font-bold text-neutral-400">{e.id}</td>
                          <td className="py-3 text-neutral-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            {e.date}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.category === 'Servicios' ? 'bg-blue-50 text-blue-700 border border-blue-250/20' :
                              e.category === 'Personal' ? 'bg-purple-50 text-purple-700 border border-purple-250/20' :
                              e.category === 'Insumos' ? 'bg-amber-50 text-amber-700 border border-amber-250/20' :
                              e.category === 'Limpieza' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/20' :
                              e.category === 'Mantenimiento' ? 'bg-red-50 text-red-700 border border-red-250/20' :
                              'bg-slate-50 text-slate-700 border border-slate-250/20'
                            }`}>
                              {e.category}
                            </span>
                          </td>
                          <td className="py-3 text-neutral-700 max-w-xs truncate" title={e.description}>
                            {e.description}
                          </td>
                          <td className="py-3 text-right text-brand-red font-mono font-black">{formatPrice(e.amount)}</td>
                          <td className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1 text-neutral-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-all"
                              title="Eliminar registro de gasto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
