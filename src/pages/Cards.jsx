import { useState, useMemo } from 'react';
import { Plus, CreditCard, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatDate, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

const CARD_STYLES = ['cc-1', 'cc-2', 'cc-3', 'cc-4'];
const CARD_ICONS = ['💳', '🏦', '💰', '🏧', '⭐', '♟️', '🌟', '📎'];

function CardFormModal({ card, onClose, onSave }) {
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
          <h2>{card ? 'Editar Cartão' : 'Novo Cartão'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="field">
              <label className="field-label">Nome do cartão *</label>
              <input type="text" className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Nubank Ultraviolet" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Limite (opcional)</label>
                <input type="number" className="field-input" value={form.limitAmount} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))} placeholder="Ex: 5000" min="0" step="0.01" />
              </div>
              <div className="field">
                <label className="field-label">Dia de fechamento</label>
                <input type="number" className="field-input" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))} min="1" max="31" required />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Ícone</label>
              <div className="icon-grid">
                {CARD_ICONS.map(icon => (
                  <button key={icon} type="button" className={`icon-pick${form.icon === icon ? ' sel' : ''}`} onClick={() => setForm(f => ({ ...f, icon }))}>{icon}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Plus size={14} /> {card ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Cards() {
  const { cards, transactions, categories, addCard, updateCard, deleteCard, getCardBill } = useFinance();
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

  const getCardStyle = (card, index) => CARD_STYLES[index % CARD_STYLES.length];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button className="icon-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
        </div>
        <button className="btn primary" onClick={() => { setEditCard(null); setShowForm(true); }}>
          <Plus size={14} /> Novo Cartão
        </button>
      </div>

      {/* Tabs */}
      {cards.length > 0 && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab${activeTab === 'bills' ? ' active' : ''}`} onClick={() => setActiveTab('bills')}>Faturas</button>
          <button className={`tab${activeTab === 'installments' ? ' active' : ''}`} onClick={() => setActiveTab('installments')}>
            Parcelas Futuras {futureInstallments.length > 0 && <span style={{ marginLeft: 4, fontSize: 10.5, background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 999, padding: '1px 6px' }}>{futureInstallments.reduce((s, m) => s + m.items.length, 0)}</span>}
          </button>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CreditCard size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum cartão cadastrado</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
            Adicione seus cartões para acompanhar faturas e gastos.
          </p>
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Adicionar cartão
          </button>
        </div>
      ) : activeTab === 'installments' ? (
        /* Parcelas Futuras tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {futureInstallments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)', fontSize: 13 }}>
              Nenhuma parcela futura encontrada.
            </div>
          ) : (
            futureInstallments.map(group => (
              <div key={`${group.year}-${group.month}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-3)', fontWeight: 500 }}>
                    {MONTHS[group.month - 1]} {group.year}
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
                      Fatura {MONTHS[month - 1]}
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
                        <span>Utilizado</span>
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
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                      Fecha dia {card.closingDay} · {card.bill?.transactions?.length || 0} lançamentos
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
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>Detalhes da fatura</span>
                      <button className="btn primary" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setShowTxModal(true)}>
                        <Plus size={12} /> Lançamento
                      </button>
                    </div>
                    {selectedBill.transactions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-3)', fontSize: 13 }}>
                        Nenhum lançamento nesta fatura
                      </div>
                    ) : (
                      <table className="tx-table">
                        <tbody>
                          {selectedBill.transactions.map(t => {
                            const cat = categories.find(c => c.id === t.categoryId);
                            return (
                              <tr key={t.id}>
                                <td style={{ width: 36, paddingRight: 0 }}>
                                  <div className="tx-row-icon"><span style={{ fontSize: 12 }}>{cat?.icon || '📋'}</span></div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(t.date)}</div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className={`t-num ${t.type === 'income' ? 'pos' : 'neg'}`} style={{ fontSize: 13, fontWeight: 600 }}>
                                    {privacy ? 'R$ ••••' : `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}`}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-3)' }}>Total da fatura</span>
                      <span className="t-num neg" style={{ fontWeight: 600 }}>
                        {privacy ? 'R$ ••••' : formatCurrency(selectedBill.total)}
                      </span>
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
            <div className="modal-head"><h2>Excluir cartão?</h2></div>
            <div className="modal-form" style={{ gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>O cartão será removido. Os lançamentos vinculados serão mantidos.</p>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent' }}
                onClick={() => { deleteCard(showDeleteConfirm); setShowDeleteConfirm(null); if (selectedCardId === showDeleteConfirm) setSelectedCardId(null); }}>
                <Trash2 size={14} /> Excluir
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
