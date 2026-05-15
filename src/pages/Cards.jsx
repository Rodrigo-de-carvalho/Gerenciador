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
    onSave({
      ...form,
      limitAmount: form.limitAmount ? Number(form.limitAmount) : null,
      closingDay: Number(form.closingDay),
      color: '#6b7280',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">{card ? 'Editar Cartão' : 'Novo Cartão'}</h2>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome do cartão *</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Nubank Ultraviolet" />
          </div>
          <div>
            <label className="label">Limite (opcional)</label>
            <input type="number" className="input-field" value={form.limitAmount} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))} placeholder="Ex: 5000" min="0" step="0.01" />
          </div>
          <div>
            <label className="label">Dia de fechamento</label>
            <input type="number" className="input-field" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))} min="1" max="31" required />
          </div>
          <div>
            <label className="label">Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-10 h-10 rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${form.icon === icon ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500' : ''}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Plus className="w-4 h-4" /> {card ? 'Salvar' : 'Criar'}
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

  const getCardStyle = (card, index) => CARD_STYLES[index % CARD_STYLES.length];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir cartão?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">O cartão será removido. Os lançamentos vinculados serão mantidos.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => { deleteCard(showDeleteConfirm); setShowDeleteConfirm(null); if (selectedCardId === showDeleteConfirm) setSelectedCardId(null); }}>
                <Trash2 className="w-4 h-4" /> Excluir
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
