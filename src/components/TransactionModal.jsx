import { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  const { categories, projects, cards, addTransaction, updateTransaction, addInstallmentTransaction } = useFinance();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  // Acessibilidade: fecha o modal com a tecla Esc.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const filteredCats = categories.filter(c => c.type === form.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        amount: parseFloat(String(form.amount).replace(',', '.')),
        projectId: form.projectId || null,
        cardId: form.cardId || null,
      };
      if (isEdit) {
        await updateTransaction(payload);
      } else if (!isEdit && form.cardId && Number(form.installments) > 1) {
        await addInstallmentTransaction(payload, Number(form.installments));
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setForm(prev => ({
    ...prev,
    [field]: value,
    ...(field === 'type' ? { categoryId: '' } : {}),
  }));

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isEdit ? t('transactionModal.edit') : t('transactionModal.new')}</h2>
          <button className="icon-btn" onClick={onClose} disabled={saving} aria-label="Fechar">
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
                {t('transactionModal.income')}
              </button>
              <button
                type="button"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                className={form.type === 'expense' ? 'active' : ''}
                onClick={() => set('type', 'expense')}
              >
                <TrendingDown size={14} style={{ color: form.type === 'expense' ? 'var(--negative)' : 'inherit' }} />
                {t('transactionModal.expense')}
              </button>
            </div>

            <div className="field">
              <label className="field-label">{t('transactionModal.description')}</label>
              <input type="text" className="field-input" placeholder="Ex: Salário março" value={form.description} onChange={e => set('description', e.target.value)} required maxLength={120} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('transactionModal.amount')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="field-input"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  onBlur={e => {
                    // normalize comma to dot so parseFloat works
                    const v = e.target.value.replace(',', '.');
                    if (!isNaN(parseFloat(v)) && parseFloat(v) > 0) set('amount', v);
                  }}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">{t('transactionModal.date')}</label>
                <input type="date" className="field-input" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>
            </div>

            <div className="field">
              <label className="field-label">{t('transactionModal.category')}</label>
              <select className="field-input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                <option value="">{t('transactionModal.categoryPlaceholder')}</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {projects.length > 0 && (
              <div className="field">
                <label className="field-label">{t('transactionModal.project')}</label>
                <select className="field-input" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                  <option value="">{t('transactionModal.noProject')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
            )}

            {form.type === 'expense' && cards.length > 0 && (
              <div className="field">
                <label className="field-label">{t('transactionModal.card')}</label>
                <select className="field-input" value={form.cardId} onChange={e => set('cardId', e.target.value)}>
                  <option value="">{t('transactionModal.noCard')}</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}

            {form.type === 'expense' && form.cardId && !isEdit && (
              <div className="field">
                <label className="field-label">{t('transactionModal.installments')}</label>
                <input type="number" min="1" max="24" className="field-input" value={form.installments} onChange={e => set('installments', e.target.value)} />
              </div>
            )}

            <div className="field">
              <label className="field-label">{t('transactionModal.notes')}</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2} placeholder={t('transactionModal.notesPlaceholder')} value={form.notes} onChange={e => set('notes', e.target.value)} maxLength={300} />
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 8,
                background: 'color-mix(in oklab, var(--negative) 12%, transparent)',
                border: '1px solid color-mix(in oklab, var(--negative) 30%, transparent)',
                fontSize: 13, color: 'var(--negative)',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn primary"
              style={{
                flex: 1, justifyContent: 'center',
                background: form.type === 'income' ? 'var(--positive)' : undefined,
                opacity: saving ? 0.7 : 1,
              }}
              disabled={saving}
            >
              {saving
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('common.savingEllipsis')}</>
                : <><Plus size={14} /> {isEdit ? t('common.save') : t('common.add')}</>
              }
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
