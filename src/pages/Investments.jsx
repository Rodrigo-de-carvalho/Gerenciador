import { useState, useMemo } from 'react';
import { Plus, X, Edit2, Trash2, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePrivacy } from '../context/PrivacyContext';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';
import PageLoader from '../components/PageLoader';
import { useI18n } from '../i18n';

const TYPES = [
  { id: 'acoes',      label: 'Ações',       color: '#2DD4A7' },
  { id: 'fiis',       label: 'FIIs',        color: '#60A5FA' },
  { id: 'renda_fixa', label: 'Renda Fixa',  color: '#FFC04A' },
  { id: 'crypto',     label: 'Cripto',      color: '#FB7185' },
  { id: 'outros',     label: 'Outros',      color: '#B4A0FF' },
];
const typeColor = (id) => TYPES.find(t => t.id === id)?.color || '#888';

const emptyForm = { name: '', type: 'acoes', invested: '', currentValue: '', notes: '' };

function InvestmentModal({ inv, onClose, onSave }) {
  const { t } = useI18n();
  const isEdit = !!inv;
  const [form, setForm] = useState(inv ? {
    name: inv.name,
    type: inv.type,
    invested: String(inv.invested),
    currentValue: String(inv.currentValue),
    notes: inv.notes || '',
  } : emptyForm);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...inv,
      id: inv?.id || crypto.randomUUID(),
      name: form.name,
      type: form.type,
      invested: parseFloat(form.invested) || 0,
      currentValue: parseFloat(form.currentValue) || 0,
      notes: form.notes,
      date: inv?.date || new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isEdit ? t('investments.editInvestment') : t('investments.newInvestment')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="field">
              <label className="field-label">{t('investments.nameTicker')}</label>
              <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('investments.nameTickerPlaceholder')} required maxLength={60} />
            </div>

            <div className="field">
              <label className="field-label">{t('investments.typeLabel')}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TYPES.map(tp => (
                  <button key={tp.id} type="button"
                    onClick={() => set('type', tp.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                      fontFamily: 'inherit', border: '1px solid',
                      background: form.type === tp.id ? tp.color + '18' : 'transparent',
                      borderColor: form.type === tp.id ? tp.color : 'var(--line)',
                      color: form.type === tp.id ? tp.color : 'var(--text-3)',
                      fontWeight: form.type === tp.id ? 600 : 400,
                    }}>
                    {t('investments.' + tp.id)}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-form-row-2" style={{ gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('investments.investedAmount')}</label>
                <input type="number" step="0.01" min="0" className="field-input" value={form.invested} onChange={e => set('invested', e.target.value)} placeholder="0,00" required />
              </div>
              <div className="field">
                <label className="field-label">{t('investments.currentAmount')}</label>
                <input type="number" step="0.01" min="0" className="field-input" value={form.currentValue} onChange={e => set('currentValue', e.target.value)} placeholder="0,00" required />
              </div>
            </div>

            <div className="field">
              <label className="field-label">{t('common.notes')}</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('investments.notesPlaceholder')} maxLength={300} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Plus size={14} /> {isEdit ? t('common.save') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Investments() {
  const { t } = useI18n();
  const { privacy } = usePrivacy();
  const { investments, addInvestment, updateInvestment, deleteInvestment, loading } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [editInv, setEditInv] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleSave = async (inv) => {
    const isEdit = investments.some(i => i.id === inv.id);
    if (isEdit) await updateInvestment(inv);
    else await addInvestment(inv);
  };

  const totals = useMemo(() => ({
    invested: investments.reduce((s, i) => s + i.invested, 0),
    current: investments.reduce((s, i) => s + i.currentValue, 0),
  }), [investments]);

  const returnAbs = totals.current - totals.invested;
  const returnPct = totals.invested > 0 ? ((returnAbs / totals.invested) * 100).toFixed(2) : 0;

  const allocation = useMemo(() => {
    const map = {};
    investments.forEach(inv => {
      if (!map[inv.type]) map[inv.type] = 0;
      map[inv.type] += inv.currentValue;
    });
    return TYPES.filter(tp => map[tp.id] > 0).map(tp => ({ name: t('investments.' + tp.id), value: map[tp.id], color: tp.color, id: tp.id }));
  }, [investments, t]);

  const filtered = filterType === 'all' ? investments : investments.filter(i => i.type === filterType);

  // 1ª carga sem cache: evita mostrar "nenhum ativo" antes dos dados chegarem.
  if (loading && investments.length === 0) return <PageLoader />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>{t('investments.portfolio')}</div>
          <h2 className="t-display" style={{ fontSize: 24 }}>
            {investments.length} <em>{investments.length !== 1 ? t('investments.assets') : t('investments.asset')}</em>
          </h2>
        </div>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> {t('investments.newAsset')}
        </button>
      </div>

      {investments.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div className="kpi-grid-4">
            {[
              { label: t('investments.totalInvested'), value: totals.invested, color: 'var(--text)' },
              { label: t('investments.currentValue'), value: totals.current, color: 'var(--info)' },
              { label: t('investments.returnBRL'), value: returnAbs, color: returnAbs >= 0 ? 'var(--positive)' : 'var(--negative)' },
              { label: t('investments.profitability'), raw: `${returnAbs >= 0 ? '+' : ''}${returnPct}%`, color: returnAbs >= 0 ? 'var(--positive)' : 'var(--negative)' },
            ].map((kpi, i) => (
              <div key={i} className="card" style={{ padding: '16px 18px' }}>
                <div className="t-label" style={{ marginBottom: 8 }}>{kpi.label}</div>
                <div className="t-num" style={{ fontSize: 18, fontWeight: 700, color: kpi.color }}>
                  {kpi.raw ?? (privacy ? '••••' : formatCurrency(kpi.value))}
                </div>
              </div>
            ))}
          </div>

          {/* Allocation chart */}
          {allocation.length > 0 && (
            <div className="alloc-grid">
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>{t('investments.allocationByType')}</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={allocation} cx="50%" cy="50%" outerRadius={80} innerRadius={46} dataKey="value" paddingAngle={3}>
                      {allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>{t('investments.distribution')}</div>
                {allocation.map((a) => {
                  const pct = totals.current > 0 ? (a.value / totals.current * 100).toFixed(1) : 0;
                  return (
                    <div key={a.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13 }}>{a.name}</span>
                        </div>
                        <span className="t-num" style={{ fontSize: 12, color: 'var(--text-3)' }}>{pct}%</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%`, background: a.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Filter chips */}
      {investments.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`chip${filterType === 'all' ? ' active' : ''}`} onClick={() => setFilterType('all')}>
            {t('investments.allFilter')} ({investments.length})
          </button>
          {TYPES.filter(tp => investments.some(i => i.type === tp.id)).map(tp => (
            <button key={tp.id} className={`chip${filterType === tp.id ? ' active' : ''}`} onClick={() => setFilterType(tp.id)}>
              <span style={{ width: 6, height: 6, borderRadius: 50, background: tp.color, display: 'inline-block' }} />
              {t('investments.' + tp.id)}
            </button>
          ))}
        </div>
      )}

      {/* Investment list */}
      {investments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <TrendingUp size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('investments.noAssetsFound')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            {t('investments.noAssetsDesc')}
          </p>
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> {t('investments.addFirstAsset')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: 13 }}>
          {t('investments.noCategoryAssets')}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tx-table">
            <thead>
              <tr>
                <th>{t('investments.assetHeader')}</th>
                <th>{t('investments.typeHeader')}</th>
                <th style={{ textAlign: 'right' }}>{t('investments.investedHeader')}</th>
                <th style={{ textAlign: 'right' }}>{t('investments.currentHeader')}</th>
                <th style={{ textAlign: 'right' }}>{t('investments.returnHeader')}</th>
                <th style={{ textAlign: 'right' }}>%</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const ret = inv.currentValue - inv.invested;
                const retPct = inv.invested > 0 ? ((ret / inv.invested) * 100).toFixed(2) : 0;
                const isPos = ret >= 0;
                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.name}</div>
                      {inv.notes && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{inv.notes}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: typeColor(inv.type) + '18', color: typeColor(inv.type) }}>
                        {t('investments.' + inv.type)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="t-num">{privacy ? '••••' : formatCurrency(inv.invested)}</td>
                    <td style={{ textAlign: 'right' }} className="t-num">{privacy ? '••••' : formatCurrency(inv.currentValue)}</td>
                    <td style={{ textAlign: 'right', color: isPos ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }} className="t-num">
                      {isPos ? '+' : ''}{privacy ? '••••' : formatCurrency(ret)}
                    </td>
                    <td style={{ textAlign: 'right', color: isPos ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }} className="t-num">
                      {isPos ? '+' : ''}{retPct}%
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => { setEditInv(inv); }} title={t('common.edit')} aria-label={t('common.edit')}><Edit2 size={13} /></button>
                        <button className="icon-btn" onClick={() => setDeleteConfirm(inv.id)} title={t('common.delete')} aria-label={t('common.delete')} style={{ color: 'var(--negative)' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <InvestmentModal onClose={() => setShowModal(false)} onSave={handleSave} />}
      {editInv && <InvestmentModal inv={editInv} onClose={() => setEditInv(null)} onSave={handleSave} />}

      {deleteConfirm && (
        <ConfirmModal
          title={t('investments.deleteInvestment')}
          message={t('investments.deleteNotReversible')}
          confirmLabel={t('common.delete')}
          onConfirm={() => deleteInvestment(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
