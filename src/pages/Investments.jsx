import { useState, useMemo, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePrivacy } from '../context/PrivacyContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';

const TYPES = [
  { id: 'acoes',      label: 'Ações',       color: '#C7F284' },
  { id: 'fiis',       label: 'FIIs',        color: '#8FB7FF' },
  { id: 'renda_fixa', label: 'Renda Fixa',  color: '#FFC04A' },
  { id: 'crypto',     label: 'Cripto',      color: '#FF7A5A' },
  { id: 'outros',     label: 'Outros',      color: '#B4A0FF' },
];
const typeLabel = (id) => TYPES.find(t => t.id === id)?.label || id;
const typeColor = (id) => TYPES.find(t => t.id === id)?.color || '#888';

const emptyForm = { name: '', type: 'acoes', invested: '', currentValue: '', notes: '' };

function InvestmentModal({ inv, onClose, onSave }) {
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
          <h2>{isEdit ? 'Editar Investimento' : 'Novo Investimento'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="field">
              <label className="field-label">Nome / Ticker *</label>
              <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: PETR4, Tesouro Selic, Bitcoin" required />
            </div>

            <div className="field">
              <label className="field-label">Tipo</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TYPES.map(t => (
                  <button key={t.id} type="button"
                    onClick={() => set('type', t.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                      fontFamily: 'inherit', border: '1px solid',
                      background: form.type === t.id ? t.color + '18' : 'transparent',
                      borderColor: form.type === t.id ? t.color : 'var(--line)',
                      color: form.type === t.id ? t.color : 'var(--text-3)',
                      fontWeight: form.type === t.id ? 600 : 400,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Valor investido (R$) *</label>
                <input type="number" step="0.01" min="0" className="field-input" value={form.invested} onChange={e => set('invested', e.target.value)} placeholder="0,00" required />
              </div>
              <div className="field">
                <label className="field-label">Valor atual (R$) *</label>
                <input type="number" step="0.01" min="0" className="field-input" value={form.currentValue} onChange={e => set('currentValue', e.target.value)} placeholder="0,00" required />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Observações</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Corretora, vencimento, notas..." />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Plus size={14} /> {isEdit ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Investments() {
  const { privacy } = usePrivacy();
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editInv, setEditInv] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setInvestments(data.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          invested: Number(r.invested),
          currentValue: Number(r.current_value),
          notes: r.notes || '',
          date: r.date,
        })));
      });
  }, [user]);

  const handleSave = async (inv) => {
    const isEdit = investments.some(i => i.id === inv.id);
    if (isEdit) {
      const { data } = await supabase
        .from('investments')
        .update({ name: inv.name, type: inv.type, invested: inv.invested, current_value: inv.currentValue, notes: inv.notes })
        .eq('id', inv.id)
        .eq('user_id', user.id)
        .select().single();
      if (data) setInvestments(prev => prev.map(i => i.id === inv.id ? { ...inv, currentValue: Number(data.current_value), invested: Number(data.invested) } : i));
    } else {
      const { data } = await supabase
        .from('investments')
        .insert({ user_id: user.id, name: inv.name, type: inv.type, invested: inv.invested, current_value: inv.currentValue, notes: inv.notes, date: inv.date })
        .select().single();
      if (data) setInvestments(prev => [{ id: data.id, name: data.name, type: data.type, invested: Number(data.invested), currentValue: Number(data.current_value), notes: data.notes || '', date: data.date }, ...prev]);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este investimento?')) return;
    await supabase.from('investments').delete().eq('id', id).eq('user_id', user.id);
    setInvestments(prev => prev.filter(i => i.id !== id));
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
    return TYPES.filter(t => map[t.id] > 0).map(t => ({ name: t.label, value: map[t.id], color: t.color }));
  }, [investments]);

  const filtered = filterType === 'all' ? investments : investments.filter(i => i.type === filterType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Carteira de investimentos</div>
          <h2 className="t-display" style={{ fontSize: 24 }}>
            {investments.length} <em>ativo{investments.length !== 1 ? 's' : ''}</em>
          </h2>
        </div>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Novo Ativo
        </button>
      </div>

      {investments.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Investido', value: totals.invested, color: 'var(--text)' },
              { label: 'Valor Atual', value: totals.current, color: 'var(--info)' },
              { label: 'Retorno (R$)', value: returnAbs, color: returnAbs >= 0 ? 'var(--positive)' : 'var(--negative)' },
              { label: 'Rentabilidade', raw: `${returnAbs >= 0 ? '+' : ''}${returnPct}%`, color: returnAbs >= 0 ? 'var(--positive)' : 'var(--negative)' },
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>Alocação por tipo</div>
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
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Distribuição</div>
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
            Todos ({investments.length})
          </button>
          {TYPES.filter(t => investments.some(i => i.type === t.id)).map(t => (
            <button key={t.id} className={`chip${filterType === t.id ? ' active' : ''}`} onClick={() => setFilterType(t.id)}>
              <span style={{ width: 6, height: 6, borderRadius: 50, background: t.color, display: 'inline-block' }} />
              {t.label}
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
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum ativo cadastrado</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            Acompanhe sua carteira: ações, FIIs, renda fixa, cripto e mais.
          </p>
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Adicionar primeiro ativo
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: 13 }}>
          Nenhum ativo nesta categoria.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tx-table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Investido</th>
                <th style={{ textAlign: 'right' }}>Atual</th>
                <th style={{ textAlign: 'right' }}>Retorno</th>
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
                        {typeLabel(inv.type)}
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
                        <button className="icon-btn" onClick={() => { setEditInv(inv); }} title="Editar"><Edit2 size={13} /></button>
                        <button className="icon-btn" onClick={() => handleDelete(inv.id)} title="Excluir" style={{ color: 'var(--negative)' }}><Trash2 size={13} /></button>
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
    </div>
  );
}
