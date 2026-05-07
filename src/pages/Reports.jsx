import { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet, FileText, MessageSquare, Copy, Check,
  ChevronLeft, ChevronRight, Download, Share2, ExternalLink, Phone
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import { exportToExcel, downloadPDF, generateWhatsAppText } from '../utils/exportUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function Reports() {
  const { transactions, categories, getSummary } = useFinance();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [copied, setCopied] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [showWhatsappPanel, setShowWhatsappPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const whatsappApiKey = useRef('');
  const [whatsappApiKeyInput, setWhatsappApiKeyInput] = useState('');

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const { income, expense, balance, transactions: monthTxs } = useMemo(
    () => getSummary(month, year),
    [transactions, month, year]
  );

  // Category expense breakdown
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

  // Monthly evolution (12 months)
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      let m = month - i;
      let y = year;
      while (m <= 0) { m += 12; y -= 1; }
      const sum = getSummary(m, y);
      data.push({
        name: `${MONTHS[m - 1].slice(0, 3)}/${y.toString().slice(-2)}`,
        Entradas: sum.income,
        Saídas: sum.expense,
        Saldo: sum.balance,
      });
    }
    return data;
  }, [transactions, month, year]);

  const whatsappText = useMemo(
    () => generateWhatsAppText(monthTxs, categories, month, year),
    [monthTxs, categories, month, year]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(whatsappText);
    const phone = whatsappPhone.replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppAPI = async () => {
    if (!whatsappApiKeyInput || !whatsappPhone) {
      alert('Informe o número e a chave da API.');
      return;
    }
    const phone = whatsappPhone.replace(/\D/g, '');
    try {
      const res = await fetch('https://api.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/send-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': whatsappApiKeyInput,
        },
        body: JSON.stringify({ phone, message: whatsappText }),
      });
      if (res.ok) alert('Mensagem enviada com sucesso!');
      else alert('Erro ao enviar. Verifique os dados da API.');
    } catch {
      alert('Erro de conexão com a API.');
    }
  };

  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;

  return (
    <div className="space-y-5">
      {/* Month selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-icon border border-slate-200" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 capitalize min-w-[150px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button className="btn-icon border border-slate-200" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-success text-sm py-2 px-3"
            onClick={() => exportToExcel(monthTxs, categories, month, year)}
            disabled={monthTxs.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            className="btn-danger text-sm py-2 px-3"
            onClick={() => downloadPDF(monthTxs, categories, month, year)}
            disabled={monthTxs.length === 0}
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            className="btn-primary text-sm py-2 px-3"
            onClick={() => setShowWhatsappPanel(p => !p)}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* WhatsApp panel */}
      {showWhatsappPanel && (
        <div className="card border-2 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-slate-700">Compartilhar via WhatsApp</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Text preview */}
            <div>
              <label className="label">Prévia da mensagem</label>
              <textarea
                readOnly
                value={whatsappText}
                className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-600 bg-white resize-none font-mono"
                rows={10}
              />
              <button
                className={`btn-secondary mt-2 text-sm w-full justify-center ${copied ? 'text-emerald-600 border-emerald-300' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>

            {/* Send options */}
            <div className="space-y-4">
              {/* Option 1: Direct link */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-green-600" />
                  Opção 1 — Link Direto (wa.me)
                </h4>
                <p className="text-xs text-slate-500 mb-3">Abre o WhatsApp com a mensagem pronta. Número opcional.</p>
                <input
                  type="tel"
                  className="input-field mb-2"
                  placeholder="Número (ex: 5511999999999)"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                />
                <button className="btn-success w-full justify-center text-sm" onClick={handleWhatsAppDirect}>
                  <Share2 className="w-4 h-4" />
                  Abrir WhatsApp
                </button>
              </div>

              {/* Option 2: API */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Opção 2 — API (Z-API / Automação)
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Envie diretamente via API. Compatible com Z-API, WPPConnect, etc.
                  <br />Configure o endpoint no código <code className="bg-slate-100 px-1 rounded">exportUtils.js</code>.
                </p>
                <input
                  type="tel"
                  className="input-field mb-2"
                  placeholder="Número destino (ex: 5511999999999)"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                />
                <input
                  type="password"
                  className="input-field mb-2"
                  placeholder="Client-Token da sua API"
                  value={whatsappApiKeyInput}
                  onChange={e => setWhatsappApiKeyInput(e.target.value)}
                />
                <button
                  className="btn-primary w-full justify-center text-sm"
                  onClick={handleWhatsAppAPI}
                >
                  <MessageSquare className="w-4 h-4" />
                  Enviar via API
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  ⚠️ Configure a URL da API no arquivo <code>src/utils/exportUtils.js</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'categories', label: 'Categorias' },
          { id: 'evolution', label: 'Evolução Anual' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Entradas', value: income, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Total Saídas', value: expense, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
              { label: 'Saldo Líquido', value: balance, color: balance >= 0 ? 'text-blue-600' : 'text-orange-600', bg: 'bg-blue-50', border: 'border-blue-200' },
              { label: 'Taxa de Poupança', value: null, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', raw: `${savingsRate}%` },
            ].map((kpi, i) => (
              <div key={i} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4`}>
                <p className="text-xs text-slate-500 font-medium mb-1">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color}`}>
                  {kpi.raw ?? formatCurrency(kpi.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Entradas vs Saídas por Mês</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData.slice(-6)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Transactions list */}
          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">
              Todos os Lançamentos — {MONTHS[month - 1]} {year} ({monthTxs.length})
            </h3>
            {monthTxs.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Nenhum lançamento neste período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Data</th>
                      <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Descrição</th>
                      <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Categoria</th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...monthTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
                      const cat = categories.find(c => c.id === t.categoryId);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{formatDate(t.date)}</td>
                          <td className="py-2 pr-4 text-slate-700 max-w-[200px] truncate">{t.description}</td>
                          <td className="py-2 pr-4">
                            {cat ? (
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cat.color + '20', color: cat.color }}>
                                {cat.icon} {cat.name}
                              </span>
                            ) : '-'}
                          </td>
                          <td className={`py-2 text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Distribuição das Saídas</h3>
            {catBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={catBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={3}>
                    {catBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Sem saídas este mês</div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Ranking de Gastos</h3>
            <div className="space-y-3">
              {catBreakdown.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Sem dados</p>
              ) : (
                catBreakdown.map((cat, i) => {
                  const pct = expense > 0 ? (cat.value / expense * 100).toFixed(1) : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="font-medium text-slate-700">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-700">{formatCurrency(cat.value)}</span>
                          <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Evolution */}
      {activeTab === 'evolution' && (
        <div className="space-y-5">
          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Evolução do Saldo (12 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                <Line type="monotone" dataKey="Entradas" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-x-auto">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Tabela Anual</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Mês</th>
                  <th className="text-right text-xs font-semibold text-emerald-600 pb-2 pr-4">Entradas</th>
                  <th className="text-right text-xs font-semibold text-red-600 pb-2 pr-4">Saídas</th>
                  <th className="text-right text-xs font-semibold text-blue-600 pb-2">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlyData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{row.name}</td>
                    <td className="py-2 pr-4 text-right text-emerald-600 font-medium">{formatCurrency(row.Entradas)}</td>
                    <td className="py-2 pr-4 text-right text-red-600 font-medium">{formatCurrency(row.Saídas)}</td>
                    <td className={`py-2 text-right font-bold ${row.Saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(row.Saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="py-2 pr-4 font-bold text-slate-700">TOTAL</td>
                  <td className="py-2 pr-4 text-right font-bold text-emerald-600">
                    {formatCurrency(monthlyData.reduce((s, r) => s + r.Entradas, 0))}
                  </td>
                  <td className="py-2 pr-4 text-right font-bold text-red-600">
                    {formatCurrency(monthlyData.reduce((s, r) => s + r.Saídas, 0))}
                  </td>
                  <td className={`py-2 text-right font-bold ${monthlyData.reduce((s, r) => s + r.Saldo, 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(monthlyData.reduce((s, r) => s + r.Saldo, 0))}
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
