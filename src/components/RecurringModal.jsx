import { useState } from 'react';
import { X, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';

export default function RecurringModal({ onClose }) {
  const { recurring, categories, addRecurring, updateRecurring, deleteRecurring, toggleRecurring } = useFinance();

  const emptyForm = () => ({
    type:        'expense',
    description: '',
    amount:      '',
    categoryId:  '',
    dayOfMonth:  1,
    nextDate:    new Date().toISOString().split('T')[0],
  });

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setShowForm(true); };

  const openEdit = (rec) => {
    setForm({
      type:        rec.type,
      description: rec.description,
      amount:      String(rec.amount),
      categoryId:  rec.categoryId || '',
      dayOfMonth:  rec.dayOfMonth,
      nextDate:    rec.nextDate,
    });
    setEditingId(rec.id);
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type:        form.type,
        description: form.description.trim(),
        amount:      parseFloat(String(form.amount).replace(',', '.')),
        categoryId:  form.categoryId || null,
        dayOfMonth:  Number(form.dayOfMonth),
        nextDate:    form.nextDate,
      };
      if (editingId) {
        const existing = recurring.find(r => r.id === editingId);
        await updateRecurring({ ...payload, id: editingId, active: existing?.active ?? true });
      } else {
        await addRecurring(payload);
      }
      cancelForm();
    } finally {
      setSaving(false);
    }
  };

  const catOptions = categories.filter(c => c.type === form.type);
  const hasList    = recurring.length > 0;

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} style={{ color: 'var(--accent)' }} />
            <h2>Transações Recorrentes</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-form" style={{ gap: 0, padding: hasList || showForm ? undefined : '0 20px' }}>

          {/* ── List ── */}
          {hasList && (
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {recurring.map(rec => {
                const cat = categories.find(c => c.id === rec.categoryId);
                return (
                  <div
                    key={rec.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 2px', borderBottom: '1px solid var(--line)',
                      opacity: rec.active ? 1 : 0.45, transition: 'opacity 120ms',
                    }}
                  >
                    <div style={{ fontSize: 20, width: 30, textAlign: 'center', flexShrink: 0 }}>
                      {cat?.icon || (rec.type === 'income' ? '💰' : '📋')}
                    </div>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => openEdit(rec)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.description}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                        todo dia {rec.dayOfMonth} · {cat?.name || 'Sem categoria'} · próx. {new Date(rec.nextDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 600, fontFamily: 'Geist Mono, monospace',
                      color: rec.type === 'income' ? 'var(--positive)' : 'var(--negative)', flexShrink: 0,
                    }}>
                      {rec.type === 'income' ? '+' : '−'}{formatCurrency(rec.amount)}
                    </span>
                    <button
                      className="icon-btn"
                      onClick={() => toggleRecurring(rec.id)}
                      title={rec.active ? 'Pausar' : 'Ativar'}
                      style={{ color: rec.active ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, width: 30, height: 30 }}
                    >
                      {rec.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--negative)', flexShrink: 0, width: 30, height: 30 }}
                      onClick={() => deleteRecurring(rec.id)}
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!hasList && !showForm && (
            <div style={{ textAlign: 'center', padding: '28px 0 8px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔄</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Nenhuma recorrência cadastrada</div>
              <div style={{ fontSize: 12.5 }}>Automatize lançamentos que se repetem todo mês.</div>
            </div>
          )}

          {/* ── Form ── */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                marginTop: hasList ? 18 : 0,
                paddingTop: hasList ? 18 : 0,
                borderTop: hasList ? '1px solid var(--line)' : 'none',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {editingId ? 'Editar recorrência' : 'Nova recorrência'}
              </div>

              <div className="seg" style={{ width: '100%' }}>
                {['expense', 'income'].map(t => (
                  <button
                    key={t} type="button"
                    style={{ flex: 1, justifyContent: 'center' }}
                    className={form.type === t ? 'active' : ''}
                    onClick={() => setForm(f => ({ ...f, type: t, categoryId: '' }))}
                  >
                    {t === 'income' ? '↑ Entrada' : '↓ Saída'}
                  </button>
                ))}
              </div>

              <div className="field">
                <label className="field-label">Descrição *</label>
                <input
                  className="field-input" type="text" required
                  placeholder="Ex: Netflix, Salário, Aluguel..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Valor (R$) *</label>
                  <input
                    className="field-input" type="number" required min="0.01" step="0.01"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Dia do mês (1–28)</label>
                  <input
                    className="field-input" type="number" min="1" max="28"
                    value={form.dayOfMonth}
                    onChange={e => setForm(f => ({ ...f, dayOfMonth: Math.min(28, Math.max(1, Number(e.target.value))) }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Categoria</label>
                  <select
                    className="field-input"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Sem categoria</option>
                    {catOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Próxima ocorrência</label>
                  <input
                    className="field-input" type="date"
                    value={form.nextDate}
                    onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={cancelForm}>
                  Cancelar
                </button>
                <button
                  type="submit" className="btn primary"
                  style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : <><Plus size={14} /> Adicionar</>}
                </button>
              </div>
            </form>
          )}
        </div>

        {!showForm && (
          <div className="modal-actions">
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Fechar
            </button>
            <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={openAdd}>
              <Plus size={14} /> Nova Recorrência
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
