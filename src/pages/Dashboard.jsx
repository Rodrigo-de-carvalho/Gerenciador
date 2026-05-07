import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function Dashboard({ onNavigate }) {
  const { transactions, categories, getSummary } = useFinance();
  const { darkMode } = useTheme();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [showModal, setShowModal] = useState(false);

  const { income, expense, balance, transactions: monthTxs } = useMemo(
    () => getSummary(month, year),
    [transactions, month, year]
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      while (m <= 0) { m += 12; y -= 1; }
      const sum = getSummary(m, y);
      data.push({
        name: MONTHS[m - 1].slice(0, 3),
        Entradas: sum.income,
        Saídas: sum.expense,
      });
    }
    return data;
  }, [transactions, month, year]);

  const pieData = useMemo(() => {
    const map = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Outros';
      const color = cat?.color || '#6b7280';
      if (!map[name]) map[name] = { name, value: 0, color };
      map[name].value += t.amount;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [monthTxs, categories]);

  const recentTxs = useMemo(
    () => [...monthTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
    [monthTxs]
  );

  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;
  const gridColor = darkMode ? '#334155' : '#f1f5f9';
  const tickColor = '#94a3b8';

  return (
    <div className="space-y-5">
      {/* Month selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button className="btn-icon border border-slate-200 dark:border-slate-600" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize min-w-[130px] text-center text-sm">
            {MONTHS[month - 1]} {year}
          </span>
          <button className="btn-icon border border-slate-200 dark:border-slate-600" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Novo Lançamento</span>
          <span className="xs:hidden">Novo</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Entradas</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(income)}</p>
            </div>
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">{monthTxs.filter(t => t.type === 'income').length} lançamentos</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Saídas</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(expense)}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <ArrowDownRight className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600 font-medium">{monthTxs.filter(t => t.type === 'expense').length} lançamentos</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Saldo</p>
              <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
              <Wallet className={`w-4 h-4 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs font-medium ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {balance >= 0 ? '✓ Positivo' : '✗ Negativo'}
            </span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Poupança</p>
              <p className={`text-lg font-bold ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {savingsRate}%
              </p>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${savingsRate >= 20 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
              <span className="text-sm">{savingsRate >= 20 ? '😊' : savingsRate >= 0 ? '😐' : '😟'}</span>
            </div>
          </div>
          <div className="mt-2 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${savingsRate >= 20 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-4">Evolução nos Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Entradas" stroke="#22c55e" strokeWidth={2} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-4">Saídas por Categoria</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={65} innerRadius={38} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Sem saídas neste mês
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Lançamentos Recentes</h3>
          <button
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700"
            onClick={() => onNavigate('transactions')}
          >
            Ver todos →
          </button>
        </div>
        {recentTxs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">Nenhum lançamento neste mês</p>
            <button className="btn-primary mt-3 mx-auto text-xs py-1.5 px-3" onClick={() => setShowModal(true)}>
              <Plus className="w-3 h-3" />
              Adicionar primeiro
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTxs.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: (cat?.color || '#6b7280') + '20' }}
                  >
                    {cat?.icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{cat?.name} · {formatDate(t.date)}</p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
