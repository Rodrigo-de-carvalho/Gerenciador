import { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const ICONS = ['💼','💻','📈','💰','🏦','💳','🎁','🍽️','🚗','🏠','❤️','📚','🎮','🛍️','✈️','🎵','🏋️','💡','🛒','📱','🔧','🎓','👕','🐾','🌱','💊','🚌','⛽'];
const DEFAULT_COLORS = ['#22c55e','#10b981','#3b82f6','#8b5cf6','#f97316','#f59e0b','#ef4444','#ec4899','#06b6d4','#a855f7','#d946ef','#6b7280'];

export default function Categories() {
  const { categories, transactions, addCategory, deleteCategory } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'expense', color: '#6b7280', icon: '📋' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [hoveredCat, setHoveredCat] = useState(null);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const getCategoryUsage = (id) => transactions.filter(t => t.categoryId === id).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    addCategory(form);
    setForm({ name: '', type: 'expense', color: '#6b7280', icon: '📋' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (getCategoryUsage(id) > 0) setDeleteConfirm(id);
    else deleteCategory(id);
  };

  const CatList = ({ cats, label, icon: Icon, positive }) => (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: positive ? 'rgba(199,242,132,0.15)' : 'rgba(255,122,90,0.12)',
          display: 'grid', placeItems: 'center',
          color: positive ? 'var(--positive)' : 'var(--negative)',
        }}>
          <Icon size={14} />
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span className="chip" style={{ marginLeft: 'auto', cursor: 'default', fontSize: 11 }}>{cats.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cats.map(cat => {
          const usage = getCategoryUsage(cat.id);
          const isHovered = hoveredCat === cat.id;
          return (
            <div
              key={cat.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: isHovered ? 'var(--chip)' : 'transparent',
                transition: 'background 120ms',
              }}
              onMouseEnter={() => setHoveredCat(cat.id)}
              onMouseLeave={() => setHoveredCat(null)}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0, background: cat.color + '22' }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{cat.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{usage} lançamento{usage !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <button
                className="icon-btn"
                style={{ width: 28, height: 28, opacity: isHovered ? 1 : 0, transition: 'opacity 120ms' }}
                onClick={() => handleDelete(cat.id)}
                title="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {cats.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
            Nenhuma categoria
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Nova Categoria
        </button>
      </div>

      <div className="grid-cifra g-2">
        <CatList cats={incomeCategories} label="Entradas" icon={TrendingUp} positive={true} />
        <CatList cats={expenseCategories} label="Saídas" icon={TrendingDown} positive={false} />
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <h2>Nova Categoria</h2>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-form">
                <div className="seg" style={{ width: '100%' }}>
                  {['expense', 'income'].map(t => (
                    <button
                      key={t}
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={form.type === t ? 'active' : ''}
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                    >
                      {t === 'income' ? '↑ Entrada' : '↓ Saída'}
                    </button>
                  ))}
                </div>

                <div className="field">
                  <label className="field-label">Nome *</label>
                  <input
                    type="text"
                    className="field-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="Ex: Alimentação"
                  />
                </div>

                <div className="field">
                  <label className="field-label">Ícone</label>
                  <div className="icon-grid" style={{ maxHeight: 112, overflowY: 'auto' }}>
                    {ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`icon-pick${form.icon === icon ? ' sel' : ''}`}
                        onClick={() => setForm(f => ({ ...f, icon }))}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Cor</label>
                  <div className="color-grid">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-pick${form.color === color ? ' sel' : ''}`}
                        style={{ background: color }}
                        onClick={() => setForm(f => ({ ...f, color }))}
                      />
                    ))}
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', border: 0, padding: 0 }}
                      title="Cor personalizada"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--chip)', borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 18, background: form.color + '22' }}>
                    {form.icon}
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{form.name || 'Prévia'}</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: form.color }} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Plus size={14} /> Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2>Categoria em uso</h2>
              <button className="icon-btn" onClick={() => setDeleteConfirm(null)}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                Esta categoria possui <strong style={{ color: 'var(--text)' }}>{getCategoryUsage(deleteConfirm)} lançamento(s)</strong>. Ao excluí-la, esses lançamentos ficarão sem categoria.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent' }}
                onClick={() => { deleteCategory(deleteConfirm); setDeleteConfirm(null); }}
              >
                <Trash2 size={14} /> Excluir mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
