import { useState, useMemo, Component } from 'react';
import { Plus, CreditCard, Pencil, Trash2, X, ChevronLeft, ChevronRight, CheckCircle2, Circle, Upload } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatDate, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';
import ImportCSV from '../components/ImportCSV';
import ConfirmModal from '../components/ConfirmModal';
import PageLoader from '../components/PageLoader';
import { useI18n } from '../i18n';

class ImportBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(e) { return { err: e?.message || String(e) }; }
  render() {
    if (this.state.err) return (
      <div className="modal-overlay">
        <div className="modal-box" style={{ maxWidth: 420 }}>
          <div className="modal-head"><h2>Erro na importação</h2></div>
          <div className="modal-form">
            <p style={{ fontSize: 13, color: 'var(--negative)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{this.state.err}</p>
          </div>
          <div className="modal-actions">
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { this.setState({ err: null }); this.props.onClose(); }}>Fechar</button>
          </div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const CARD_STYLES = ['cc-1', 'cc-2', 'cc-3', 'cc-4'];
const CARD_ICONS = ['💳', '🏦', '💰', '🏧', '⭐', '♟️', '🌟', '📎'];

function CardFormModal({ card, onClose, onSave }) {
  const { t } = useI18n();
  const isEdit = Boolean(card);
  const [form, setForm] = useState(
    card
      ? { name: card.name, limitAmount: card.limitAmount || '', closingDay: card.closingDay || 1, icon: card.icon || '💳' }
      : { name: '', limitAmount: '', closingDay: 1, icon: '💳' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, limitAmount: form.limitAmount ? Number(form.limitAmount) : null, closingDay: Number(form.closingDay), color: '#6b7280' });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isEdit ? t('cards.editCard') : t('cards.newCard')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="field">
              <label className="field-label">{t('cards.cardName')}</label>
              <input type="text" className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder={t('cards.cardNamePlaceholder')} maxLength={60} />
            </div>
            <div className="modal-form-row-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('cards.limit')}</label>
                <input type="number" className="field-input" value={form.limitAmount} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))} placeholder={t('cards.limitPlaceholder')} min="0" step="0.01" />
              </div>
              <div className="field">
                <label className="field-label">{t('cards.closingDay')}</label>
                <input type="number" className="field-input" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))} min="1" max="31" required />
              </div>
            </div>
            <div className="field">
              <label className="field-label">{t('cards.icon')}</label>
              <div className="icon-grid">
                {CARD_ICONS.map(icon => (
                  <button key={icon} type="button" className={`icon-pick${form.icon === icon ? ' sel' : ''}`} onClick={() => setForm(f => ({ ...f, icon }))}>{icon}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Plus size={14} /> {isEdit ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Cards() {
  const { t } = useI18n();
  const { cards, transactions, categories, addCard, updateCard, deleteCard, deleteTransaction, getCardBill, payCardBill, getCardUsedLimit, loading } = useFinance();
  const { privacy } = usePrivacy();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState(null);            // lançamento em edição na fatura
  const [deleteTxConfirm, setDeleteTxConfirm] = useState(null); // id do lançamento a excluir
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState('bills');
  const [paying, setPaying] = useState(false);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const selectedCard = cards.find(c => c.id === selectedCardId);

  const cardBills = useMemo(() => {
    return cards.map(card => {
      const bill = getCardBill(card.id, month, year);
      return { ...card, bill };
    });
  }, [cards, transactions, month, year]);

  const selectedBill = useMemo(() => {
    if (!selectedCardId) return null;
    return getCardBill(selectedCardId, month, year);
  }, [selectedCardId, transactions, month, year]);

  // Todos os lançamentos de cartão não pagos, agrupados por mês
  // (fatura atual + parcelas futuras + compras avulsas em aberto)
  const futureInstallments = useMemo(() => {
    const unpaid = transactions
      .filter(t => t.cardId && !t.paid)
      .sort((a, b) => a.date.localeCompare(b.date));
    const byMonth = {};
    unpaid.forEach(t => {
      const key = t.date.slice(0, 7); // "YYYY-MM"
      const [y, m] = key.split('-');
      if (!byMonth[key]) byMonth[key] = { month: Number(m), year: Number(y), items: [], total: 0 };
      byMonth[key].items.push(t);
      byMonth[key].total += t.amount;
    });
    return Object.values(byMonth).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month,
    );
  }, [transactions]);

  const futureTotalAmount = futureInstallments.reduce((s, g) => s + g.total, 0);
  const futureTotalItems  = futureInstallments.reduce((s, g) => s + g.items.length, 0);

  const handlePayBill = async (cardId) => {
    setPaying(true);
    try { await payCardBill(cardId, month, year); } finally { setPaying(false); }
  };

  const getCardStyle = (card, index) => CARD_STYLES[index % CARD_STYLES.length];

  // 1ª carga sem cache: evita mostrar "nenhum cartão" antes dos dados chegarem.
  if (loading && cards.length === 0) return <PageLoader />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
            {t('months')[month - 1]} {year}
          </span>
          <button className="icon-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowImport(true)}>
            <Upload size={14} /> {t('cards.importBill')}
          </button>
          <button className="btn primary" onClick={() => { setEditCard(null); setShowForm(true); }}>
            <Plus size={14} /> {t('cards.newCard')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      {cards.length > 0 && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab${activeTab === 'bills' ? ' active' : ''}`} onClick={() => setActiveTab('bills')}>{t('cards.invoices')}</button>
          <button className={`tab${activeTab === 'installments' ? ' active' : ''}`} onClick={() => setActiveTab('installments')}>
            {t('cards.futureInstallments')}
            {futureTotalItems > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10.5, background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 999, padding: '1px 6px' }}>
                {futureTotalItems}
              </span>
            )}
          </button>
        </div>
      )}

      {cards.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px 36px' }}>
            <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CreditCard size={24} style={{ color: 'var(--text-3)' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('cards.noCardsRegistered')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
              {t('cards.addCardsDesc')}
            </p>
            <button className="btn primary" onClick={() => setShowForm(true)}>
              <Plus size={14} /> {t('cards.addCard')}
            </button>
          </div>

          {/* How credit card tracking works */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t('cards.howItWorksTitle')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { num: '1', text: t('cards.howItWorksStep1') },
                { num: '2', text: t('cards.howItWorksStep2') },
                { num: '3', text: t('cards.howItWorksStep3') },
              ].map(({ num, text }) => (
                <div key={num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(45,212,167,0.15)', border: '1px solid rgba(45,212,167,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                  }}>{num}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'installments' ? (
        /* Compromissos futuros — todos os lançamentos de cartão em aberto */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {futureInstallments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
              {t('cards.noFutureInstallments')}
            </div>
          ) : (
            <>
              {/* Resumo geral */}
              <div className="card commit-summary" style={{ padding: '14px 18px' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                    Total comprometido
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--negative)', fontFamily: 'Geist Mono, monospace' }}>
                    {privacy ? 'R$ ••••' : formatCurrency(futureTotalAmount)}
                  </div>
                </div>
                <div className="commit-summary-stats" style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-3)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>{futureInstallments.length}</div>
                    <div>meses</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>{futureTotalItems}</div>
                    <div>lançamentos</div>
                  </div>
                </div>
              </div>

              {/* Por mês */}
              {futureInstallments.map(group => (
                <div key={`${group.year}-${group.month}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)' }}>
                      {t('months')[group.month - 1]} {group.year}
                    </span>
                    <span className="t-num neg" style={{ fontSize: 13, fontWeight: 600 }}>
                      {privacy ? 'R$ ••••' : formatCurrency(group.total)}
                    </span>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="tx-table">
                      <tbody>
                        {group.items.map(tx => {
                          const card = cards.find(c => c.id === tx.cardId);
                          const cat  = categories.find(c => c.id === tx.categoryId);
                          const isInstallment = tx.installmentTotal > 1;
                          const isLast = isInstallment && tx.installmentCurrent === tx.installmentTotal;
                          return (
                            <tr key={tx.id}>
                              <td style={{ width: 36, paddingRight: 0 }}>
                                <div className="tx-row-icon">
                                  <span style={{ fontSize: 12 }}>{cat?.icon || card?.icon || '💳'}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                                    {privacy ? '••••••' : tx.description}
                                  </span>
                                  {isInstallment && (
                                    <span style={{
                                      fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 5,
                                      background: isLast ? 'rgba(134,239,172,0.15)' : 'rgba(45,212,167,0.12)',
                                      color: isLast ? 'var(--positive)' : 'var(--accent)',
                                      border: `1px solid ${isLast ? 'rgba(134,239,172,0.3)' : 'rgba(45,212,167,0.25)'}`,
                                    }}>
                                      {tx.installmentCurrent}/{tx.installmentTotal}{isLast ? ' ✓' : ''}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                                  {card?.icon} {card?.name} · {formatDate(tx.date)}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="t-num neg" style={{ fontSize: 13, fontWeight: 600 }}>
                                  {privacy ? '••••' : formatCurrency(tx.amount)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="grid-cifra g-2" style={{ marginBottom: 24 }}>
          {cardBills.map((card, index) => {
            const billTotal  = card.bill?.total || 0;
            // usedTotal = tudo que está comprometido no cartão (fatura atual + parcelas futuras)
            const usedTotal  = getCardUsedLimit(card.id);
            const available  = card.limitAmount ? Math.max(card.limitAmount - usedTotal, 0) : null;
            const usedPct    = card.limitAmount ? Math.min(usedTotal / card.limitAmount * 100, 100) : 0;
            const style = getCardStyle(card, index);
            return (
              <div key={card.id}>
                {/* Credit card visual */}
                <div
                  className={`cc ${style}`}
                  style={{ cursor: 'pointer', marginBottom: 12 }}
                  onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="cc-name">{card.icon} {card.name}</div>
                    </div>
                    <div className="cc-brand">Cifra</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {t('cards.invoice')} {t('months')[month - 1]}
                    </div>
                    <div className="cc-bal">
                      {privacy ? 'R$ ••••' : `R$ ${billTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </div>
                    {card.limitAmount && (
                      <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 4 }}>
                        {privacy ? 'R$ ••••' : `R$ ${available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disponível
                      </div>
                    )}
                  </div>
                </div>

                {/* Card info bar */}
                <div className="card" style={{ padding: '12px 16px' }}>
                  {card.limitAmount && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginBottom: 6 }}>
                        <span>
                          {t('cards.used')}
                          {usedTotal !== billTotal && (
                            <span style={{ fontSize: 10.5, color: 'var(--text-4)', marginLeft: 6 }}>
                              (inclui parcelas futuras)
                            </span>
                          )}
                        </span>
                        <span>{Math.round(usedPct)}%</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{
                          width: `${usedPct}%`,
                          background: usedPct > 80 ? 'var(--negative)' : usedPct > 60 ? 'var(--warn)' : 'var(--accent)',
                        }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                        {t('cards.closesDay')} {card.closingDay} · {card.bill?.transactions?.length || 0} {t('cards.entries')}
                      </span>
                      {card.bill?.transactions?.length > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                          background: card.bill.paid ? 'rgba(134,239,172,0.15)' : 'rgba(251,191,36,0.15)',
                          color: card.bill.paid ? 'var(--positive)' : '#d97706',
                          border: `1px solid ${card.bill.paid ? 'rgba(134,239,172,0.3)' : 'rgba(251,191,36,0.3)'}`,
                        }}>
                          {card.bill.paid
                            ? <><CheckCircle2 size={10} /> {t('cards.billPaid')}</>
                            : <><Circle size={10} /> {t('cards.billPending')}</>
                          }
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => { setEditCard(card); setShowForm(true); }} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={12} /></button>
                      <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--negative)' }} onClick={() => setShowDeleteConfirm(card.id)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>

                {/* Bill detail (expandable) */}
                {selectedCardId === card.id && selectedBill && (
                  <div className="card" style={{ marginTop: 8, padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t('cards.invoiceDetails')}</span>
                      <button className="btn" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12 }}
                        onClick={() => { setEditTx(null); setShowTxModal(true); }}>
                        <Plus size={12} /> {t('cards.newEntry')}
                      </button>
                    </div>
                    {selectedBill.transactions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-3)', fontSize: 13 }}>
                        {t('cards.noEntriesInInvoice')}
                      </div>
                    ) : (
                      <table className="tx-table">
                        <tbody>
                          {selectedBill.transactions.map(tx => {
                            const cat = categories.find(c => c.id === tx.categoryId);
                            return (
                              <tr
                                key={tx.id}
                                onClick={() => { setEditTx(tx); setShowTxModal(true); }}
                                style={{ cursor: 'pointer' }}
                                title={t('common.edit')}
                              >
                                <td style={{ width: 36, paddingRight: 0 }}>
                                  <div className="tx-row-icon"><span style={{ fontSize: 12 }}>{cat?.icon || '📋'}</span></div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 13, fontWeight: 500 }}>{privacy ? '••••••' : tx.description}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(tx.date)}</div>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: 8 }}>
                                  <div className={`t-num ${tx.type === 'income' ? 'pos' : 'neg'}`} style={{ fontSize: 13, fontWeight: 600 }}>
                                    {privacy ? 'R$ ••••' : `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`}
                                  </div>
                                </td>
                                <td style={{ width: 24, paddingLeft: 0 }}>
                                  {tx.paid
                                    ? <CheckCircle2 size={13} style={{ color: 'var(--positive)' }} />
                                    : <Circle size={13} style={{ color: 'var(--text-3)', opacity: 0.4 }} />
                                  }
                                </td>
                                <td style={{ width: 40, paddingLeft: 0 }}>
                                  <div className="tx-actions" style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0 }}>
                                    <button
                                      className="icon-btn"
                                      style={{ width: 28, height: 28, color: 'var(--negative)' }}
                                      onClick={(e) => { e.stopPropagation(); setDeleteTxConfirm(tx.id); }}
                                      title={t('common.delete')}
                                      aria-label={t('common.delete')}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, gap: 8 }}>
                      <span style={{ color: 'var(--text-3)' }}>{t('cards.invoiceTotal')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                        <span className="t-num neg" style={{ fontWeight: 600 }}>
                          {privacy ? 'R$ ••••' : formatCurrency(selectedBill.total)}
                        </span>
                        {selectedBill.transactions.length > 0 && (
                          selectedBill.paid ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11.5, fontWeight: 600, color: 'var(--positive)',
                            }}>
                              <CheckCircle2 size={13} /> {t('cards.billPaid')}
                            </span>
                          ) : (
                            <button
                              className="btn primary"
                              style={{ padding: '4px 10px', fontSize: 12, opacity: paying ? 0.6 : 1 }}
                              onClick={() => handlePayBill(card.id)}
                              disabled={paying}
                            >
                              {paying ? t('cards.paying') : t('cards.payBill')}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <CardFormModal
          card={editCard}
          onClose={() => { setShowForm(false); setEditCard(null); }}
          onSave={(data) => {
            if (editCard) updateCard({ ...editCard, ...data });
            else addCard(data);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title={t('cards.deleteCard')}
          message={t('cards.deleteCardDesc')}
          confirmLabel={t('common.delete')}
          onConfirm={async () => {
            await deleteCard(showDeleteConfirm);
            if (selectedCardId === showDeleteConfirm) setSelectedCardId(null);
          }}
          onClose={() => setShowDeleteConfirm(null)}
        />
      )}

      {showTxModal && (
        <TransactionModal
          transaction={editTx}
          defaultCardId={selectedCardId}
          onClose={() => { setShowTxModal(false); setEditTx(null); }}
        />
      )}

      {deleteTxConfirm && (
        <ConfirmModal
          title={t('transactions.deleteTransaction')}
          message={t('transactions.deleteNotReversible')}
          confirmLabel={t('common.delete')}
          onConfirm={async () => { await deleteTransaction(deleteTxConfirm); }}
          onClose={() => setDeleteTxConfirm(null)}
        />
      )}

      {/* Revela o botão de excluir ao passar o mouse na linha da fatura
          (no toque, o índice global @media(pointer:coarse) já mantém visível). */}
      <style>{`.tx-table tbody tr:hover .tx-actions { opacity: 1 !important; }`}</style>

      {showImport && (
        <ImportBoundary onClose={() => setShowImport(false)}>
          <ImportCSV onClose={() => setShowImport(false)} />
        </ImportBoundary>
      )}
    </div>
  );
}
