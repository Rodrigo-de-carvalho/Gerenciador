import { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
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
  const { showToast } = useToast();
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
    // categoria agora é escolhida por tiles (sem o required do select)
    if (!form.categoryId) { setError(t('transactionModal.categoryPlaceholder')); return; }
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
        // Otimista: a transação já aparece na lista, então fechamos na hora
        // e só ficamos de olho no resultado real em segundo plano.
        const { persist } = addTransaction(payload);
        persist.catch(() => showToast(t('common.saveFailedToast'), 'error'));
      }
      showToast(t('common.savedToast'));
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

            <div className="modal-form-row-2" style={{ gap: 12 }}>
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
              {filteredCats.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '10px 12px', background: 'var(--chip)', borderRadius: 10 }}>
                  {t('transactionModal.categoryPlaceholder')}
                </div>
              ) : (
                <div className="cat-picker">
                  {filteredCats.map(c => {
                    const sel = form.categoryId === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        className={`cat-tile${sel ? ' sel' : ''}`}
                        onClick={() => set('categoryId', c.id)}
                        title={c.name}
                        aria-pressed={sel}
                        style={sel ? { borderColor: c.color, background: `color-mix(in oklab, ${c.color} 14%, transparent)` } : undefined}
                      >
                        <span className="cat-tile-ic" style={{ background: c.color + '22', border: `1px solid ${c.color}40` }}>{c.icon}</span>
                        <span className="cat-tile-name">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {projects.length > 0 && (
              <div className="field">
                <label className="field-label">{t('transactionModal.project')}</label>
                <div className="cat-picker">
                  <button type="button" className={`cat-tile${!form.projectId ? ' sel' : ''}`} onClick={() => set('projectId', '')} aria-pressed={!form.projectId}>
                    <span className="cat-tile-ic" style={{ background: 'var(--chip)' }}>—</span>
                    <span className="cat-tile-name">{t('transactionModal.noProject')}</span>
                  </button>
                  {projects.map(p => {
                    const sel = form.projectId === p.id;
                    return (
                      <button type="button" key={p.id} className={`cat-tile${sel ? ' sel' : ''}`} onClick={() => set('projectId', p.id)} title={p.name} aria-pressed={sel}
                        style={sel ? { borderColor: p.color, background: `color-mix(in oklab, ${p.color} 14%, transparent)` } : undefined}>
                        <span className="cat-tile-ic" style={{ background: p.color + '22', border: `1px solid ${p.color}40` }}>{p.icon}</span>
                        <span className="cat-tile-name">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {form.type === 'expense' && cards.length > 0 && (
              <div className="field">
                <label className="field-label">{t('transactionModal.card')}</label>
                <div className="cat-picker">
                  <button type="button" className={`cat-tile${!form.cardId ? ' sel' : ''}`} onClick={() => set('cardId', '')} aria-pressed={!form.cardId}>
                    <span className="cat-tile-ic" style={{ background: 'var(--chip)' }}>💵</span>
                    <span className="cat-tile-name">{t('transactionModal.noCard')}</span>
                  </button>
                  {cards.map(c => {
                    const sel = form.cardId === c.id;
                    return (
                      <button type="button" key={c.id} className={`cat-tile${sel ? ' sel' : ''}`} onClick={() => set('cardId', c.id)} title={c.name} aria-pressed={sel}
                        style={sel ? { borderColor: c.color, background: `color-mix(in oklab, ${c.color} 14%, transparent)` } : undefined}>
                        <span className="cat-tile-ic" style={{ background: c.color + '22', border: `1px solid ${c.color}40` }}>{c.icon}</span>
                        <span className="cat-tile-name">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
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
