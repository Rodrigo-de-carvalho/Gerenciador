import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Pencil, Trash2, HandCoins, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, parseAmount } from '../utils/formatters';
import { friendlyErrorMessage } from '../utils/errorMessages';
import ConfirmModal from '../components/ConfirmModal';
import PageLoader from '../components/PageLoader';
import { useI18n } from '../i18n';

// ── Modal de adicionar/editar empréstimo (padrão visual do GoalModal) ──────────
function LoanModal({ loan, defaultDirection, onClose, onSave }) {
  const { t } = useI18n();
  const isEdit = !!loan;
  const [form, setForm] = useState(loan ? {
    direction:    loan.direction,
    counterparty: loan.counterparty,
    totalAmount:  String(loan.totalAmount),
    dueDate:      loan.dueDate || '',
    notes:        loan.notes || '',
  } : {
    direction:    defaultDirection || 'owe',
    counterparty: '',
    totalAmount:  '',
    dueDate:      '',
    notes:        '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseAmount(form.totalAmount);
    if (isNaN(amount) || amount <= 0) return; // input já exige número > 0
    setSaving(true);
    try {
      await onSave({
        id:           loan?.id,
        direction:    form.direction,
        counterparty: form.counterparty.trim(),
        totalAmount:  amount,
        dueDate:      form.dueDate || null,
        notes:        form.notes || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isEdit ? t('loans.editLoan') : t('loans.newLoan')}</h2>
          <button className="icon-btn" onClick={onClose} disabled={saving}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            {/* Direção */}
            <div className="seg" style={{ width: '100%' }}>
              <button type="button" style={{ flex: 1, justifyContent: 'center' }}
                className={form.direction === 'owe' ? 'active' : ''}
                onClick={() => set('direction', 'owe')}>
                {t('loans.directionOwe')}
              </button>
              <button type="button" style={{ flex: 1, justifyContent: 'center' }}
                className={form.direction === 'owed' ? 'active' : ''}
                onClick={() => set('direction', 'owed')}>
                {t('loans.directionOwed')}
              </button>
            </div>

            <div className="field">
              <label className="field-label">{t('loans.counterparty')}</label>
              <input className="field-input" value={form.counterparty}
                onChange={e => set('counterparty', e.target.value)}
                placeholder={t('loans.counterpartyPlaceholder')} required maxLength={80} />
            </div>

            <div className="modal-form-row-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('loans.totalAmount')}</label>
                <input type="text" inputMode="decimal" className="field-input"
                  value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)}
                  placeholder="0,00" required />
              </div>
              <div className="field">
                <label className="field-label">{t('loans.dueDate')}</label>
                <input type="date" className="field-input" value={form.dueDate}
                  onChange={e => set('dueDate', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="field-label">{t('loans.notes')}</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder={t('loans.notesPlaceholder')} maxLength={200} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }} disabled={saving}>
              <Plus size={14} /> {isEdit ? t('common.save') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Modal pequeno de registrar pagamento ───────────────────────────────────────
function PaymentModal({ loan, onClose, onConfirm }) {
  const { t } = useI18n();
  const remaining = Math.max(loan.totalAmount - loan.paidAmount, 0);
  const [value, setValue] = useState(String(remaining.toFixed(2)));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseAmount(value);
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await onConfirm(amount);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <h2>{t('loans.registerPayment')}</h2>
          <button className="icon-btn" onClick={onClose} disabled={saving}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              {loan.counterparty} · {t('loans.remaining')}: {formatCurrency(remaining)}
            </div>
            <div className="field">
              <label className="field-label">{t('loans.paymentAmount')}</label>
              <input type="text" inputMode="decimal" className="field-input"
                value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" required autoFocus />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }} disabled={saving}>
              <Check size={14} /> {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Card de um empréstimo (barra de progresso estilo Goals) ─────────────────────
function LoanCard({ loan, onEdit, onDelete, onPay }) {
  const { t } = useI18n();
  const { privacy } = usePrivacy();

  const pct = loan.totalAmount > 0 ? Math.min((loan.paidAmount / loan.totalAmount) * 100, 100) : 0;
  const remaining = Math.max(loan.totalAmount - loan.paidAmount, 0);
  const done = loan.paidAmount >= loan.totalAmount;
  const mask = (v) => privacy ? 'R$ ••••' : formatCurrency(v);

  return (
    <div className="card" style={{ padding: '18px 20px', opacity: done ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: done ? 'color-mix(in oklab, var(--positive) 16%, transparent)' : 'var(--chip)',
          color: done ? 'var(--positive)' : 'var(--text-3)',
        }}>
          {done ? <Check size={18} /> : <HandCoins size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.counterparty}</span>
            {done && (
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--positive)', background: 'color-mix(in oklab, var(--positive) 14%, transparent)', padding: '1px 7px', borderRadius: 999 }}>
                {t('loans.completed')}
              </span>
            )}
          </div>
          {loan.dueDate && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
              {t('loans.dueOn')} {formatDate(loan.dueDate)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {!done && (
            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={onPay}>
              {t('loans.registerPayment')}
            </button>
          )}
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={onEdit} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={13} /></button>
          <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--negative)' }} onClick={onDelete} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="bar-track" style={{ marginBottom: 8 }}>
        <div className="bar-fill" style={{ width: `${pct}%`, background: done ? 'var(--positive)' : 'var(--accent)' }} />
      </div>

      <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-3)', flexWrap: 'wrap' }}>
        <span>{t('loans.paid')}: <span className="t-num" style={{ fontWeight: 600, color: 'var(--text-2)' }}>{mask(loan.paidAmount)}</span> {t('loans.of')} <span className="t-num" style={{ fontWeight: 600, color: 'var(--text-2)' }}>{mask(loan.totalAmount)}</span></span>
        {!done && <span>{t('loans.remaining')}: <span className="t-num" style={{ fontWeight: 600, color: 'var(--text)' }}>{mask(remaining)}</span></span>}
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────────
export default function Loans() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { loans, addLoan, updateLoan, deleteLoan, registerLoanPayment, loading } = useFinance();
  const [activeTab, setActiveTab] = useState('owe');
  const [showModal, setShowModal] = useState(false);
  const [editLoan, setEditLoan] = useState(null);
  const [payLoan, setPayLoan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // loan id

  // 1ª carga sem cache: evita mostrar "nenhum empréstimo" antes dos dados chegarem.
  if (loading && loans.length === 0) return <PageLoader />;

  const list = loans.filter(l => l.direction === activeTab);

  const handleSave = async (data) => {
    try {
      if (data.id) await updateLoan(data);
      else await addLoan(data);
      showToast(t('common.savedToast'));
    } catch (e) {
      showToast(friendlyErrorMessage(e, t), 'error');
      throw e; // mantém o modal aberto em caso de erro
    }
  };

  const handlePay = async (amount) => {
    try {
      await registerLoanPayment(payLoan.id, amount);
      showToast(t('common.savedToast'));
    } catch (e) {
      showToast(friendlyErrorMessage(e, t), 'error');
      throw e;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>{t('loans.title')}</div>
          <h2 className="t-display" style={{ fontSize: 24 }}>{t('loans.subtitle')}</h2>
        </div>
        <button className="btn primary" onClick={() => { setEditLoan(null); setShowModal(true); }}>
          <Plus size={14} /> {t('loans.newLoan')}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab${activeTab === 'owe' ? ' active' : ''}`} onClick={() => setActiveTab('owe')}>{t('loans.youOwe')}</button>
        <button className={`tab${activeTab === 'owed' ? ' active' : ''}`} onClick={() => setActiveTab('owed')}>{t('loans.owedToYou')}</button>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <HandCoins size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {activeTab === 'owe' ? t('loans.noOwe') : t('loans.noOwed')}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            {t('loans.emptyDesc')}
          </p>
          <button className="btn primary" onClick={() => { setEditLoan(null); setShowModal(true); }}>
            <Plus size={14} /> {t('loans.newLoan')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(loan => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onEdit={() => { setEditLoan(loan); setShowModal(true); }}
              onDelete={() => setDeleteConfirm(loan.id)}
              onPay={() => setPayLoan(loan)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <LoanModal
          loan={editLoan}
          defaultDirection={activeTab}
          onClose={() => { setShowModal(false); setEditLoan(null); }}
          onSave={handleSave}
        />
      )}

      {payLoan && (
        <PaymentModal
          loan={payLoan}
          onClose={() => setPayLoan(null)}
          onConfirm={handlePay}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title={t('loans.deleteLoan')}
          message={t('loans.deleteLoanDesc')}
          confirmLabel={t('common.delete')}
          onConfirm={async () => { await deleteLoan(deleteConfirm); }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
