import { useState, useMemo } from 'react';
import { Plus, CreditCard, Pencil, Trash2, X, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatDate, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';
import { useI18n } from '../i18n';

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
              <input type="text" className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Nubank Ultraviolet" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('cards.limit')}</label>
                <input type="number" className="field-input" value={form.limitAmount} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))} placeholder="Ex: 5000" min="0" step="0.01" />
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
  const { cards, transactions, categories, addCard, updateCard, deleteCard, getCardBill, payCardBill } = useFinance();
  const { privacy } = usePrivacy();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
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

  const futureInstallments = useMemo(() => {
    const today = new Date();
    const upcoming = transactions.filter(t => {
      if (!t.cardId || t.installmentTotal <= 1) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d > today;
    });
    const byMonth = {};
    upcoming.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { month: d.getMonth() + 1, year: d.getFullYear(), items: [], total: 0 };
      byMonth[key].items.push(t);
      byMonth[key].total += t.amount;
    });
    return Object.values(byMonth).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }, [transactions]);

  const handlePayBill = async (cardId) => {
    setPaying(true);
    try { await payCardBill(cardId, month, year); } finally { setPaying(false); }
  };

  const getCardStyle = (card, index) => CARD_STYLES[index % CARD_STYLES.length];

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
        <button className="btn primary" onClick={() => { setEditCard(null); setShowForm(true); }}>
          <Plus size={14} /> {t('cards.newCard')}
        </button>
      </div>

      {/* Tabs */}
      {cards.length > 0 && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab${activeTab === 'bills' ? ' active' : ''}`} onClick={() => setActiveTab('bills')}>{t('cards.invoices')}</button>
          <button className={`tab${activeTab === 'installments' ? ' active' : ''}`} onClick={() => setActiveTab('installments')}>
            {t('cards.futureInstallments')} {futureInstallments.length > 0 && <span style={{ marginLeft: 4, fontSize: 10.5, background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 999, padding: '1px 6px' }}>{futureInstallments.reduce((s, m) => s + m.items.length, 0)}</span>}
          </button>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
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
      ) : activeTab === 'installments' ? (
        /* Parcelas Futuras tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {futureInstallments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)', fontSize: 13 }}>
              {t('cards.noFutureInstallments')}
            </div>
          ) : (
            futureInstallments.map(group => (
              <div key={`${group.year}-${group.month}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-3)', fontWeight: 500 }}>
                    {t('months')[group.month - 1]} {group.year}
                  </div>
                  <span className="t-num neg" style={{ fontSize: 13, fontWeight: 600 }}>
                    {privacy ? 'R$ ••••' : formatCurrency(group.total)}
                  </span>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="tx-table">
                    <tbody>
                      {group.items.map(t => {
                        const card = cards.find(c => c.id === t.cardId);
                        const cat = categories.find(c => c.id === t.categoryId);
                        return (
                          <tr key={t.id}>
                            <td style={{ width: 36, paddingRight: 0 }}>
                              <div className="tx-row-icon"><span style={{ fontSize: 12 }}>{cat?.icon || '💳'}</span></div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{privacy ? '••••••' : t.description}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{card?.icon} {card?.name} · {formatDate(t.date)}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="t-num neg" style={{ fontSize: 13, fontWeight: 600 }}>
                                {privacy ? '••••' : formatCurrency(t.amount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid-cifra g-2" style={{ marginBottom: 24 }}>
          {cardBills.map((card, index) => {
            const billTotal = card.bill?.total || 0;
            const usedPct = card.limitAmount ? Math.min(billTotal / card.limitAmount * 100, 100) : 0;
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
                        de {privacy ? 'R$ ••••' : `R$ ${card.limitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} de limite
                      </div>
                    )}
                  </div>
                </div>

                {/* Card info bar */}
                <div className="card" style={{ padding: '12px 16px' }}>
                  {card.limitAmount && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginBottom: 6 }}>
                        <span>{t('cards.used')}</span>
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
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => { setEditCard(card); setShowForm(true); }} title="Editar"><Pencil size={12} /></button>
                      <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--negative)' }} onClick={() => setShowDeleteConfirm(card.id)} title="Excluir"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>

                {/* Bill detail (expandable) */}
                {selectedCardId === card.id && selectedBill && (
                  <div className="card" style={{ marginTop: 8, padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t('cards.invoiceDetails')}</span>
                      <button className="btn" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setShowTxModal(true)}>
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
                              <tr key={tx.id}>
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
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 360 }}>
            <div className="modal-head"><h2>{t('cards.deleteCard')}</h2></div>
            <div className="modal-form" style={{ gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{t('cards.deleteCardDesc')}</p>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent' }}
                onClick={() => { deleteCard(showDeleteConfirm); setShowDeleteConfirm(null); if (selectedCardId === showDeleteConfirm) setSelectedCardId(null); }}>
                <Trash2 size={14} /> {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTxModal && (
        <TransactionModal
          defaultCardId={selectedCardId}
          onClose={() => setShowTxModal(false)}
        />
      )}
    </div>
  );
}
