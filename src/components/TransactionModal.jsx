import { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const emptyForm = {
  type: 'expense',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  categoryId: '',
  projectId: '',
  notes: '',
  cardId: '',
  installments: 1,
};

export default function TransactionModal({ transaction, onClose, defaultProjectId, defaultCardId }) {
  const { categories, projects, cards, addTransaction, updateTransaction, addInstallmentTransaction } = useFinance();
  const [form, setForm] = useState(emptyForm);
  const isEdit = !!transaction;

  useEffect(() => {
    if (transaction) {
      setForm({
        ...transaction,
        amount: String(transaction.amount),
        projectId: transaction.projectId || '',
        cardId: transaction.cardId || '',
        installments: transaction.installmentTotal || 1,
      });
    } else {
      setForm({
        ...emptyForm,
        date: new Date().toISOString().split('T')[0],
        projectId: defaultProjectId || '',
        cardId: defaultCardId || '',
      });
    }
  }, [transaction, defaultProjectId, defaultCardId]);

  const filteredCats = categories.filter(c => c.type === form.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: parseFloat(String(form.amount).replace(',', '.')),
      projectId: form.projectId || null,
      cardId: form.cardId || null,
    };
    if (isEdit) {
      updateTransaction(payload);
    } else if (!isEdit && form.cardId && Number(form.installments) > 1) {
      addInstallmentTransaction(payload, Number(form.installments));
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  const set = (field, value) => setForm(prev => ({
    ...prev,
    [field]: value,
    ...(field === 'type' ? { categoryId: '' } : {}),
  }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            {/* Type toggle */}
            <div className="seg" style={{ width: '100%' }}>
              <button
                type="button"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                className={form.type === 'income' ? 'active' : ''}
                onClick={() => set('type', 'income')}
              >
                <TrendingUp size={14} style={{ color: form.type === 'income' ? 'var(--positive)' : 'inherit' }} />
                Entrada
              </button>
              <button
                type="button"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                className={form.type === 'expense' ? 'active' : ''}
                onClick={() => set('type', 'expense')}
              >
                <TrendingDown size={14} style={{ color: form.type === 'expense' ? 'var(--negative)' : 'inherit' }} />
                Saída
              </button>
            </div>

            <div className="field">
              <label className="field-label">Descrição *</label>
              <input type="text" className="field-input" placeholder="Ex: Salário março" value={form.description} onChange={e => set('description', e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Valor (R$) *</label>
                <input type="number" step="0.01" min="0.01" className="field-input" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Data *</label>
                <input type="date" className="field-input" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Categoria *</label>
              <select className="field-input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                <option value="">Selecione uma categoria</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {projects.length > 0 && (
              <div className="field">
                <label className="field-label">Projeto <span style={{ color: 'var(--text-4)', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <select className="field-input" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                  <option value="">Nenhum projeto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
            )}

            {form.type === 'expense' && cards.length > 0 && (
              <div className="field">
                <label className="field-label">Cartão <span style={{ color: 'var(--text-4)', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <select className="field-input" value={form.cardId} onChange={e => set('cardId', e.target.value)}>
                  <option value="">Sem cartão (pagamento direto)</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}

            {form.type === 'expense' && form.cardId && !isEdit && (
              <div className="field">
                <label className="field-label">Parcelas</label>
                <input type="number" min="1" max="24" className="field-input" value={form.installments} onChange={e => set('installments', e.target.value)} />
              </div>
            )}

            <div className="field">
              <label className="field-label">Observações</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2} placeholder="Notas opcionais..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center', background: form.type === 'income' ? 'var(--positive)' : undefined }}>
              <Plus size={14} />
              {isEdit ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
