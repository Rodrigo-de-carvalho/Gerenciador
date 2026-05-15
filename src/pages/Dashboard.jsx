import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function splitBRL(n) {
  const sign = n < 0 ? '-' : '';
  const [int, dec] = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',');
  return { sign, int, dec };
}

function HeroNumber({ value, privacy }) {
  const { sign, int, dec } = splitBRL(value);
  return (
    <div className="hero-num">
      <span className="currency">R$</span>
      {privacy ? '••••' : `${sign}${int}`}
      {!privacy && <span className="cents">,{dec}</span>}
    </div>
  );
}

function Ring({ pct, size = 36, thickness = 3, color = 'var(--accent)' }) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chip-strong)" strokeWidth={thickness} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function StatCard({ label, value, sub, privacy, positive }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="t-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="t-num" style={{
        fontSize: 20, fontWeight: 600,
        color: positive === true ? 'var(--positive)' : positive === false ? 'var(--negative)' : 'var(--text)',
      }}>
        {privacy ? 'R$ ••••' : formatCurrency(value)}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--line)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'Geist Mono, monospace' }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ onNavigate }) {
  const { transactions, categories, projects, budgets, getSummary } = useFinance();
  const { privacy } = usePrivacy();
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

  const savingsRate = income > 0 ? Math.round((income - expense) / income * 100) : 0;

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      while (m <= 0) { m += 12; y -= 1; }
      const sum = getSummary(m, y);
      data.push({ name: MONTH_NAMES[m - 1], Receita: sum.income, Despesa: sum.expense });
    }
    return data;
  }, [transactions, month, year]);

  const catBreakdown = useMemo(() => {
    const map = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Outros';
      const color = cat?.color || '#6b7280';
      if (!map[name]) map[name] = { name, color, value: 0 };
      map[name].value += t.amount;
    });
    const arr = Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
    const total = arr.reduce((s, c) => s + c.value, 0);
    return arr.map(c => ({ ...c, pct: total > 0 ? Math.round(c.value / total * 100) : 0 }));
  }, [monthTxs, categories]);

  const recentTxs = useMemo(
    () => [...monthTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [monthTxs]
  );

  const projectStats = useMemo(() => {
    return projects.slice(0, 3).map(p => {
      const ptxs = transactions.filter(t => t.projectId === p.id);
      const spent = ptxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const received = ptxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      return { ...p, spent, received, count: ptxs.length };
    });
  }, [projects, transactions]);

  const budgetProgress = useMemo(() => {
    return budgets.map(b => {
      const cat   = categories.find(c => c.id === b.categoryId);
      const spent = monthTxs
        .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.amount > 0 ? Math.round(spent / b.amount * 100) : 0;
      return { ...b, cat, spent, pct };
    }).filter(b => b.cat);
  }, [budgets, monthTxs, categories]);

  return (
    <div>
      {/* Hero */}
      <div className="dash-hero" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>
            Saldo atual · {MONTHS[month - 1]} {year}
          </div>
          <HeroNumber value={balance} privacy={privacy} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--text-3)', fontSize: 12.5 }}>
            <span className="pos" style={{ fontFamily: 'Geist Mono, monospace' }}>
              ▲ {privacy ? '••••' : formatCurrency(income)} receitas
            </span>
            <span>·</span>
            <span className="neg" style={{ fontFamily: 'Geist Mono, monospace' }}>
              ▼ {privacy ? '••••' : formatCurrency(expense)} despesas
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, minWidth: 110, textAlign: 'center' }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button className="icon-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
          <button className="btn primary" onClick={() => setShowModal(true)} style={{ marginLeft: 8 }}>
            <Plus size={14} />
            <span>Lançamento</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-cifra g-4" style={{ marginBottom: 18 }}>
        <StatCard label="Saldo atual" value={balance} privacy={privacy} positive={balance >= 0} sub={balance >= 0 ? 'Positivo' : 'Negativo'} />
        <StatCard label="Receitas" value={income} privacy={privacy} positive={true} sub={`${monthTxs.filter(t => t.type === 'income').length} entradas`} />
        <StatCard label="Despesas" value={expense} privacy={privacy} positive={false} sub={`${monthTxs.filter(t => t.type === 'expense').length} saídas`} />
        <StatCard label="Taxa de poupança" value={0} privacy={privacy} sub={`${savingsRate}% da receita`} />
      </div>

      {/* Main grid */}
      <div className="grid-cifra g-dash" style={{ marginBottom: 18 }}>
        {/* Flow chart */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 16 }}>
            <div>
              <div className="t-eyebrow">Fluxo de caixa</div>
              <h3 className="t-display" style={{ fontSize: 20, marginTop: 4 }}>
                <em style={{ fontStyle: 'italic' }}>Receitas</em> vs. <em style={{ fontStyle: 'italic' }}>despesas</em>
              </h3>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 2, background: 'var(--positive)', display: 'inline-block', borderRadius: 1 }} />
                Receita
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 2, background: 'var(--negative)', display: 'inline-block', borderRadius: 1 }} />
                Despesa
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--positive)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--positive)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--negative)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--negative)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={50}
                tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Receita" stroke="var(--positive)" strokeWidth={2} fill="url(#gInc)" />
              <Area type="monotone" dataKey="Despesa" stroke="var(--negative)" strokeWidth={2} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category breakdown */}
          <div className="card">
            <div className="t-eyebrow" style={{ marginBottom: 14 }}>Para onde foi o dinheiro</div>
            {catBreakdown.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                Sem despesas neste mês
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catBreakdown.map(c => (
                  <div key={c.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div className="cat-dot" style={{ background: c.color }} />
                      <span style={{ flex: 1, fontSize: 12.5 }}>{c.name}</span>
                      <span className="t-num" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {privacy ? '••••' : formatCurrency(c.value)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 28, textAlign: 'right' }}>{c.pct}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projects mini */}
          {projectStats.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div className="t-eyebrow">Projetos</div>
                <button
                  onClick={() => onNavigate('projects')}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Ver todos <ArrowRight size={11} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projectStats.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    onClick={() => onNavigate('projects')}>
                    <div style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: 'center' }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {privacy ? 'R$ ••••' : formatCurrency(p.spent)} gastos
                      </div>
                    </div>
                    <ArrowRight size={13} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget progress */}
      {budgetProgress.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div className="t-eyebrow">Orçamentos do mês</div>
            <button
              onClick={() => onNavigate('categories')}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Gerenciar <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {budgetProgress.map(b => {
              const color = b.pct >= 100 ? 'var(--negative)' : b.pct >= 80 ? '#f59e0b' : 'var(--positive)';
              return (
                <div key={b.categoryId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div className="cat-dot" style={{ background: b.cat.color }} />
                    <span style={{ flex: 1, fontSize: 12.5 }}>{b.cat.icon} {b.cat.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {privacy ? 'R$ ••••' : `${formatCurrency(b.spent)} / ${formatCurrency(b.amount)}`}
                    </span>
                    <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 34, textAlign: 'right' }}>
                      {b.pct}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.min(b.pct, 100)}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 12px' }}>
          <div className="t-eyebrow">Movimentações recentes</div>
          <button
            onClick={() => onNavigate('transactions')}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Ver todas <ArrowRight size={11} />
          </button>
        </div>
        {recentTxs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💭</div>
            <div style={{ fontSize: 13 }}>Nenhum lançamento neste mês</div>
            <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
        ) : (
          <table className="tx-table">
            <tbody>
              {recentTxs.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                return (
                  <tr key={t.id}>
                    <td style={{ width: 40, paddingRight: 0 }}>
                      <div className="tx-row-icon">
                        <span style={{ fontSize: 14 }}>{cat?.icon || '📋'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{t.description}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                        {cat?.name} · {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 13.5 }}
                      className={t.type === 'income' ? 'pos' : 'neg'}>
                      {privacy ? 'R$ ••••' : `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
