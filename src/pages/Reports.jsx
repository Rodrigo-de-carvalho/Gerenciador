import { useState, useMemo } from 'react';
import {
  FileSpreadsheet, FileText, MessageSquare, Copy, Check,
  ChevronLeft, ChevronRight, Share2, TrendingUp, TrendingDown, Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatDate, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import { exportToExcel, downloadPDF, generateWhatsAppText } from '../utils/exportUtils';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'Geist Mono, monospace' }}>{p.name}: {formatCurrency(p.value)}</div>
      ))}
    </div>
  );
};

export default function Reports() {
  const { transactions, categories, getSummary } = useFinance();
  const { privacy } = usePrivacy();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [copied, setCopied] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const { income, expense, balance, transactions: monthTxs } = useMemo(
    () => getSummary(month, year), [transactions, month, year]
  );

  const catBreakdown = useMemo(() => {
    const map = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Outros';
      const color = cat?.color || '#6b7280';
      if (!map[name]) map[name] = { name, value: 0, color };
      map[name].value += t.amount;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [monthTxs, categories]);

  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      let m = month - i; let y = year;
      while (m <= 0) { m += 12; y -= 1; }
      const sum = getSummary(m, y);
      data.push({ name: `${MONTHS[m - 1].slice(0, 3)}/${y.toString().slice(-2)}`, Entradas: sum.income, Saídas: sum.expense, Saldo: sum.balance });
    }
    return data;
  }, [transactions, month, year]);

  const whatsappText = useMemo(() => generateWhatsAppText(monthTxs, categories, month, year), [monthTxs, categories, month, year]);
  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const CHART_COLORS = { income: '#C7F284', expense: '#FF7A5A', balance: '#8FB7FF' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span style={{ fontWeight: 600, minWidth: 130, textAlign: 'center', fontSize: 14, textTransform: 'capitalize' }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button className="icon-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => exportToExcel(monthTxs, categories, month, year)} disabled={monthTxs.length === 0}>
            <FileSpreadsheet size={14} style={{ color: 'var(--positive)' }} /> Excel
          </button>
          <button className="btn" onClick={() => downloadPDF(monthTxs, categories, month, year)} disabled={monthTxs.length === 0}>
            <FileText size={14} style={{ color: 'var(--negative)' }} /> PDF
          </button>
          <button className="btn" onClick={() => setShowWhatsapp(p => !p)}>
            <MessageSquare size={14} /> WhatsApp
          </button>
        </div>
      </div>

      {/* WhatsApp panel */}
      {showWhatsapp && (
        <div className="card" style={{ borderColor: 'color-mix(in oklab, #25D366 30%, var(--line))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: '#25D366', borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <MessageSquare size={15} style={{ color: '#fff' }} />
            </div>
            <span style={{ fontWeight: 600 }}>Compartilhar via WhatsApp</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Prévia</div>
              <textarea readOnly value={privacy ? '[modo privado ativo]' : whatsappText} rows={8}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace', resize: 'none' }} />
              <button className="btn" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={handleCopy}>
                {copied ? <Check size={14} style={{ color: 'var(--positive)' }} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="field-input" type="tel" placeholder="Número (ex: 5511999999999)" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} />
              <button className="btn primary" style={{ justifyContent: 'center' }} onClick={() => {
                const text = encodeURIComponent(whatsappText);
                const phone = whatsappPhone.replace(/\D/g, '');
                window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
              }}>
                <Share2 size={14} /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Entradas', value: income, color: 'var(--positive)', Icon: TrendingUp },
          { label: 'Saídas', value: expense, color: 'var(--negative)', Icon: TrendingDown },
          { label: 'Saldo Líquido', value: balance, color: balance >= 0 ? 'var(--info)' : 'var(--negative)', Icon: Wallet },
          { label: 'Taxa de Poupança', value: null, raw: `${savingsRate}%`, color: 'var(--accent)', Icon: TrendingUp },
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="t-label">{kpi.label}</span>
              <kpi.Icon size={14} style={{ color: kpi.color, opacity: 0.7 }} />
            </div>
            <div className="t-num" style={{ fontSize: 18, fontWeight: 700, color: kpi.color }}>
              {kpi.raw ?? (privacy ? '••••' : formatCurrency(kpi.value))}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'categories', label: 'Categorias' },
          { id: 'evolution', label: 'Evolução Anual' },
        ].map(t => (
          <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>Entradas vs Saídas — últimos 6 meses</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData.slice(-6)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Entradas" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                Lançamentos — {MONTHS[month - 1]} {year}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{monthTxs.length} registros</span>
            </div>
            {monthTxs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>Nenhum lançamento neste período.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tx-table" style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
                      const cat = categories.find(c => c.id === t.categoryId);
                      return (
                        <tr key={t.id}>
                          <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{formatDate(t.date)}</td>
                          <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {privacy ? '••••••••' : t.description}
                          </td>
                          <td>
                            {cat ? (
                              <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: cat.color + '20', color: cat.color }}>
                                {cat.icon} {cat.name}
                              </span>
                            ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontWeight: 600, color: t.type === 'income' ? 'var(--positive)' : 'var(--negative)' }}>
                            {t.type === 'income' ? '+' : '-'}{privacy ? '••••' : formatCurrency(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Categories */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>Distribuição das Saídas</div>
            {catBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={catBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={52} dataKey="value" paddingAngle={3}>
                    {catBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Sem saídas este mês
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>Ranking de Gastos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {catBreakdown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>Sem dados</div>
              ) : catBreakdown.map((cat, i) => {
                const pct = expense > 0 ? (cat.value / expense * 100).toFixed(1) : 0;
                return (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-4)', width: 16 }}>#{i + 1}</span>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{cat.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="t-num" style={{ fontSize: 13, fontWeight: 600 }}>{privacy ? '••••' : formatCurrency(cat.value)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>({pct}%)</span>
                      </div>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Evolution */}
      {activeTab === 'evolution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>Evolução do Saldo (12 meses)</div>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.balance} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS.balance} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Entradas" stroke={CHART_COLORS.income} strokeWidth={1.5} fill="url(#gradIncome)" dot={false} strokeDasharray="5 3" />
                <Area type="monotone" dataKey="Saldo" stroke={CHART_COLORS.balance} strokeWidth={2.5} fill="url(#gradBalance)" dot={{ r: 3, fill: CHART_COLORS.balance, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)' }}>Tabela Anual</div>
            <table className="tx-table" style={{ minWidth: 380 }}>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{ textAlign: 'right', color: 'var(--positive)' }}>Entradas</th>
                  <th style={{ textAlign: 'right', color: 'var(--negative)' }}>Saídas</th>
                  <th style={{ textAlign: 'right', color: 'var(--info)' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.name}</td>
                    <td style={{ textAlign: 'right' }} className="t-num pos">{privacy ? '••••' : formatCurrency(row.Entradas)}</td>
                    <td style={{ textAlign: 'right' }} className="t-num neg">{privacy ? '••••' : formatCurrency(row.Saídas)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }} className={`t-num ${row.Saldo >= 0 ? '' : 'neg'}`} style={{ textAlign: 'right', fontWeight: 700, color: row.Saldo >= 0 ? 'var(--info)' : 'var(--negative)' }}>
                      {privacy ? '••••' : formatCurrency(row.Saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--chip)' }}>
                  <td style={{ fontWeight: 700 }}>TOTAL</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }} className="t-num pos">{privacy ? '••••' : formatCurrency(monthlyData.reduce((s, r) => s + r.Entradas, 0))}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }} className="t-num neg">{privacy ? '••••' : formatCurrency(monthlyData.reduce((s, r) => s + r.Saídas, 0))}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: monthlyData.reduce((s, r) => s + r.Saldo, 0) >= 0 ? 'var(--info)' : 'var(--negative)' }} className="t-num">
                    {privacy ? '••••' : formatCurrency(monthlyData.reduce((s, r) => s + r.Saldo, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
