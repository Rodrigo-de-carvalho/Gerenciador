import { useState, useMemo } from 'react';
import { Plus, ArrowRight, Sparkles, Send, Award } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, getCurrentMonthYear } from '../utils/formatters';
import { parseQuickEntry, resolveCategory } from '../utils/quickParse';
import TransactionModal from '../components/TransactionModal';
import CategoryDonut from '../components/CategoryDonut';
import PageLoader from '../components/PageLoader';
import DashHeader from '../components/dashboard/DashHeader';
import Thermometer from '../components/dashboard/Thermometer';
import BalanceChart from '../components/dashboard/BalanceChart';
import StatStrip from '../components/dashboard/StatStrip';
import { useI18n } from '../i18n';

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

// ── Ofensiva (streak) ────────────────────────────────────────────────────────
// Conta dias consecutivos com pelo menos 1 lançamento registrado (pela data de
// criação, não pela data do lançamento — o hábito que queremos premiar é abrir
// o app e lançar). Se hoje ainda não lançou, a sequência de ontem segue valendo.
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function computeStreak(transactions) {
  const days = new Set(
    transactions.map(t => (t.createdAt ? dayKey(new Date(t.createdAt)) : t.date))
  );
  const cursor = new Date();
  const hasToday = days.has(dayKey(cursor));
  if (!hasToday) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, hasToday };
}

function StreakCard({ streak, hasToday }) {
  const { t } = useI18n();
  const goal = 7;
  return (
    <div className="streak-card">
      <div className={`streak-flame${hasToday ? ' lit' : ''}`}>🔥</div>
      <div className="streak-info">
        <div className="streak-count">{t('dashboard.streakDaysFn')(streak)}</div>
        <div className="streak-msg">
          {streak >= goal
            ? t('dashboard.streakCongrats')
            : hasToday ? t('dashboard.streakDone') : streak > 0 ? t('dashboard.streakPending') : t('dashboard.streakHint')}
        </div>
        <div className="streak-track" aria-label={`${Math.min(streak, goal)}/${goal}`}>
          {Array.from({ length: goal }, (_, i) => (
            <span key={i} className={`sd${i < Math.min(streak, goal) ? ' on' : ''}`} />
          ))}
        </div>
      </div>
      {streak >= goal && (
        <div className="streak-badge">
          <Award size={15} /> {t('dashboard.streakBadge')}
        </div>
      )}
    </div>
  );
}

// ── Lançamento Rápido por Texto ("Uber 25,00" → Transporte) ─────────────────
function QuickAdd() {
  const { t } = useI18n();
  const { categories, addTransaction } = useFinance();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const preview = useMemo(() => {
    const parsed = parseQuickEntry(text);
    if (!parsed) return null;
    const cat = resolveCategory(categories, parsed.type, parsed.categoryName);
    return { ...parsed, cat };
  }, [text, categories]);

  const submit = (e) => {
    e.preventDefault();
    const parsed = parseQuickEntry(text);
    if (!parsed) { setError(t('dashboard.quickAddErr')); return; }
    const cat = resolveCategory(categories, parsed.type, parsed.categoryName);
    const { persist } = addTransaction({
      type: parsed.type,
      description: parsed.description,
      amount: parsed.amount,
      date: new Date().toISOString().split('T')[0],
      categoryId: cat?.id || null,
      projectId: null,
      notes: null,
      cardId: null,
    });
    persist.catch(() => showToast(t('common.saveFailedToast'), 'error'));
    showToast(t('dashboard.quickAddDoneFn')(cat?.name || t('common.noCategory')));
    setText('');
    setError('');
  };

  return (
    <div className="quick-add">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t('dashboard.quickAddTitle')}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{t('dashboard.quickAddSub')}</div>
      <form className="quick-add-row" onSubmit={submit}>
        <input
          className="quick-add-input"
          value={text}
          onChange={e => { setText(e.target.value); setError(''); }}
          placeholder={t('dashboard.quickAddPlaceholder')}
          maxLength={80}
        />
        <button type="submit" className="quick-add-btn" disabled={!text.trim()}>
          <Send size={14} /> {t('dashboard.quickAddBtn')}
        </button>
      </form>
      <div className="quick-add-preview">
        {error ? (
          <span style={{ color: 'var(--negative)' }}>{error}</span>
        ) : preview ? (
          <>
            <span>{preview.cat?.icon || '📋'}</span>
            <span>
              {preview.description} → <b style={{ color: 'var(--accent)' }}>{preview.cat?.name || t('common.noCategory')}</b>
            </span>
            <span style={{ marginLeft: 'auto', fontFamily: 'Geist Mono, monospace', color: preview.type === 'income' ? 'var(--positive)' : 'var(--negative)' }}>
              {preview.type === 'income' ? '+' : '-'}{formatCurrency(preview.amount)}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Meta Rápida ──────────────────────────────────────────────────────────────
function QuickGoal({ totalBalance }) {
  const { t } = useI18n();
  const daily = totalBalance > 0
    ? Math.min(50, Math.max(5, Math.round(totalBalance * 0.01)))
    : 5;
  return (
    <div className="quick-goal">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>🎯</span>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t('dashboard.quickGoalTitle')}</span>
      </div>
      <div className="qg-big">
        {t('dashboard.quickGoalFn')(formatCurrency(daily), formatCurrency(daily * 30))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>{t('dashboard.quickGoalHint')}</div>
    </div>
  );
}

// ── Desafio do Mês ───────────────────────────────────────────────────────────
// REGRA 1 — Aqui vive o ÚNICO botão "Adicionar Entrada" (com efeito pulso, REGRA 7).
function ChallengeHero({ onAddIncome }) {
  const { t } = useI18n();
  return (
    <div className="challenge-hero">
      <div className="t-eyebrow">🎯 {t('dashboard.challengeTitle')}</div>
      <h2>{t('dashboard.challengeSubtitle')}</h2>
      <button className="cta-big pulse" onClick={onAddIncome}>
        <Plus size={20} strokeWidth={2.6} /> {t('dashboard.addIncome')}
      </button>
    </div>
  );
}

// ── Estado vazio bonito (cofrinho) ───────────────────────────────────────────
function PiggySVG() {
  return (
    <svg viewBox="0 0 220 150" fill="none" aria-hidden="true">
      <path d="M18 118 L64 96 L104 104 L150 62 L196 34" stroke="var(--positive)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" opacity="0.7" />
      <path d="M196 34 l-12 -2 m12 2 l-3 12" stroke="var(--positive)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="102" cy="98" rx="50" ry="36" fill="var(--accent)" opacity="0.9" />
      <ellipse cx="102" cy="98" rx="50" ry="36" stroke="var(--accent-2)" strokeWidth="2" />
      <path d="M58 84 q-12 -2 -14 8 q6 8 14 4" fill="var(--accent)" opacity="0.9" />
      <circle cx="146" cy="92" r="9" fill="var(--accent-2)" />
      <circle cx="148" cy="92" r="2.6" fill="#0F172A" opacity="0.55" />
      <circle cx="82" cy="88" r="3.4" fill="#0F172A" opacity="0.55" />
      <path d="M70 70 q10 -12 24 -8" stroke="var(--accent-2)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="78" y="128" width="9" height="12" rx="3.5" fill="var(--accent-2)" />
      <rect x="116" y="128" width="9" height="12" rx="3.5" fill="var(--accent-2)" />
      <circle cx="102" cy="46" r="14" fill="var(--warn)" />
      <circle cx="102" cy="46" r="14" stroke="#0F172A" strokeOpacity="0.2" strokeWidth="2" />
      <text x="102" y="51" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F172A" opacity="0.65">$</text>
      <rect x="90" y="66" width="24" height="4" rx="2" fill="#0F172A" opacity="0.4" />
      <path d="M40 128 q0 -14 10 -18 q2 10 -6 16" fill="var(--positive)" />
      <path d="M40 128 q0 -10 -8 -13 q-2 8 5 12" fill="var(--positive)" opacity="0.7" />
      <line x1="40" y1="128" x2="40" y2="140" stroke="var(--positive)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Estado vazio: reaproveita o CTA único de adicionar (REGRA 1) com pulso (REGRA 7).
function EmptyJourney({ onAdd }) {
  const { t } = useI18n();
  return (
    <div className="empty-journey">
      <PiggySVG />
      <h3>{t('dashboard.emptyTitle')}</h3>
      <p>{t('dashboard.emptySubtitle')}</p>
      <button className="cta-big mint pulse" onClick={onAdd}>
        <Plus size={20} strokeWidth={2.6} /> {t('dashboard.emptyCta')}
      </button>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { t } = useI18n();
  const { transactions, categories, budgets, getSummary, getCumulativeBalance, loading } = useFinance();
  const { privacy } = usePrivacy();
  const { showToast } = useToast();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);

  const { income, expense, balance, transactions: monthTxs } = useMemo(
    () => getSummary(month, year),
    [getSummary, month, year]
  );

  const totalBalance = useMemo(
    () => getCumulativeBalance(month, year).balance,
    [getCumulativeBalance, month, year]
  );

  // Streak calculado UMA vez e passado ao cabeçalho (mascote) e ao StreakCard.
  const { streak, hasToday } = useMemo(() => computeStreak(transactions), [transactions]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const openModal = (type) => { setModalType(type); setShowModal(true); };

  const savingsRate = income > 0 ? Math.round((income - expense) / income * 100) : 0;

  const chartData = useMemo(() => {
    const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
    let run = getCumulativeBalance(prev.m, prev.y).balance;
    const daysInMonth = new Date(year, month, 0).getDate();
    const byDay = {};
    monthTxs.forEach(tx => {
      const d = Number(tx.date.slice(8, 10));
      byDay[d] = (byDay[d] || 0) + (tx.type === 'income' ? tx.amount : -tx.amount);
    });
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
    const data = [];
    for (let d = 1; d <= lastDay; d++) {
      run += byDay[d] || 0;
      data.push({ day: String(d), saldo: run });
    }
    return data;
  }, [getCumulativeBalance, monthTxs, month, year]);

  const catBreakdown = useMemo(() => {
    const othersLabel = t('common.others');
    const map = {};
    monthTxs.filter(tx => tx.type === 'expense').forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const name = cat?.name || othersLabel;
      const color = cat?.color || '#6b7280';
      const icon = cat?.icon || '📋';
      if (!map[name]) map[name] = { name, color, icon, value: 0 };
      map[name].value += tx.amount;
    });
    const arr = Object.values(map).sort((a, b) => b.value - a.value);
    const total = arr.reduce((s, c) => s + c.value, 0);
    return arr.map(c => ({ ...c, pct: total > 0 ? Math.round(c.value / total * 100) : 0 }));
  }, [monthTxs, categories, t]);

  const recentTxs = useMemo(
    () => [...monthTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [monthTxs]
  );

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

  if (loading && transactions.length === 0) return <PageLoader />;

  const isEmpty = transactions.length === 0;
  // "motivacional" = saldo acumulado ≤ 0 (inclui o estado vazio e o negativo):
  // é quando a tela precisa animar em vez de mostrar contabilidade fria.
  const motivational = totalBalance <= 0;
  const monthLabel = `${t('months')[month - 1]} ${year}`;

  return (
    // .dash-root controla a entrada em cascata (fade-up escalonado) dos filhos — REGRA 7.
    <div className="dash-root">
      {/* REGRA 1 + 5 — cabeçalho enxuto: sino, mês e mascote */}
      <DashHeader
        monthLabel={monthLabel}
        streak={streak}
        onPrev={prevMonth}
        onNext={nextMonth}
        onBell={() => showToast(t('dashboard.noNews'))}
      />

      {/* Ofensiva */}
      <StreakCard streak={streak} hasToday={hasToday} />

      {motivational ? (
        // ===== TELA MOTIVACIONAL (saldo ≤ 0) — ~90% motivacional (REGRA 4) =====
        <>
          {isEmpty
            ? <EmptyJourney onAdd={() => openModal(null)} />
            : <ChallengeHero onAddIncome={() => openModal('income')} />}

          {/* REGRA 2 — termômetro vertical (nº de lançamentos do mês) */}
          <Thermometer count={monthTxs.length} goal={3} />

          {/* REGRA 3 — gráfico motivacional (linha pontilhada subindo) */}
          <BalanceChart data={chartData} motivational />

          <QuickAdd />

          {/* REGRA 4 — números contábeis pequenos e roláveis no rodapé */}
          <StatStrip income={income} expense={expense} savingsRate={savingsRate} privacy={privacy} />
        </>
      ) : (
        // ===== TELA COM SALDO POSITIVO — mostra dados reais =====
        <>
          <div className="dash-hero-positive">
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>
              {t('dashboard.totalBalance')} · {t('dashboard.accumulated')} {t('dashboard.upToMonth')} {monthLabel}
            </div>
            <HeroNumber value={totalBalance} privacy={privacy} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 18px', color: 'var(--text-3)', fontSize: 12.5, flexWrap: 'wrap' }}>
              <span style={{ color: balance >= 0 ? 'var(--positive)' : 'var(--negative)', fontFamily: 'Geist Mono, monospace' }}>
                {balance >= 0 ? '▲' : '▼'} {privacy ? '••••' : formatCurrency(balance)} {t('dashboard.monthResult').toLowerCase()}
              </span>
            </div>
            {/* REGRA 1 — único botão "Adicionar Entrada" desta tela (com pulso, REGRA 7) */}
            <button className="cta-big pulse" onClick={() => openModal(null)}>
              <Plus size={20} strokeWidth={2.6} /> {t('dashboard.addIncome')}
            </button>
          </div>

          <div className="grid-cifra g-quick">
            <QuickAdd />
            <QuickGoal totalBalance={totalBalance} />
          </div>

          <div className="grid-cifra g-dash">
            <BalanceChart data={chartData} motivational={false} />
            <div className="card">
              <div className="t-eyebrow" style={{ marginBottom: 14 }}>{t('dashboard.whereMoneyWent')}</div>
              {catBreakdown.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  {t('dashboard.noExpensesThisMonth')}
                </div>
              ) : (
                <CategoryDonut data={catBreakdown} total={expense} privacy={privacy} totalLabel={t('common.total')} />
              )}
            </div>
          </div>

          {budgetProgress.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div className="t-eyebrow">{t('dashboard.budgets')}</div>
                <button
                  onClick={() => onNavigate('categories')}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {t('dashboard.manage')} <ArrowRight size={11} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {budgetProgress.map(b => {
                  const color = b.pct >= 100 ? 'var(--negative)' : b.pct >= 80 ? 'var(--warn)' : 'var(--positive)';
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

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 12px' }}>
              <div className="t-eyebrow">{t('dashboard.recentTransactions')}</div>
              <button
                onClick={() => onNavigate('transactions')}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {t('dashboard.viewAllF')} <ArrowRight size={11} />
              </button>
            </div>
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
                          {cat?.name} · {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
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
          </div>

          {/* REGRA 4 — resumo contábil pequeno no rodapé */}
          <StatStrip income={income} expense={expense} savingsRate={savingsRate} privacy={privacy} />
        </>
      )}

      {showModal && (
        <TransactionModal
          onClose={() => { setShowModal(false); setModalType(null); }}
          defaultType={modalType || undefined}
        />
      )}
    </div>
  );
}
