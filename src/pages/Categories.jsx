import { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const ICONS = ['💼','💻','📈','💰','🏦','💳','🎁','🍽️','🚗','🏠','❤️','📚','🎮','🛍️','✈️','🎵','🏋️','💡','🛒','📱','🔧','🎓','👕','🐾','🌱','💊','🚌','⛽'];
const DEFAULT_COLORS = ['#22c55e','#10b981','#3b82f6','#8b5cf6','#f97316','#f59e0b','#ef4444','#ec4899','#06b6d4','#a855f7','#d946ef','#6b7280'];

export default function Categories() {
  const { categories, transactions, addCategory, deleteCategory } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'expense', color: '#6b7280', icon: '📋' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const CatList = ({ cats, label, icon: Icon, color }) => (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{label}</h3>
        <span className="ml-auto bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-2 py-0.5 rounded-full">
          {cats.length}
        </span>
      </div>
      <div className="space-y-2">
        {cats.map(cat => {
          const usage = getCategoryUsage(cat.id);
          return (
            <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: cat.color + '25' }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{cat.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{usage} lançamento{usage !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <button
                className="btn-icon opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 flex-shrink-0"
                onClick={() => handleDelete(cat.id)}
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {cats.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Nenhuma categoria</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CatList cats={incomeCategories} label="Categorias de Entrada" icon={TrendingUp} color="bg-emerald-500" />
        <CatList cats={expenseCategories} label="Categorias de Saída" icon={TrendingDown} color="bg-red-500" />
      </div>

      {/* New Category Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Nova Categoria</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                {(['expense', 'income']).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      form.type === t
                        ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t === 'income' ? '↑ Entrada' : '↓ Saída'}
                  </button>
                ))}
              </div>

              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Ex: Alimentação"
                />
              </div>

              <div>
                <label className="label">Ícone</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin p-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-lg text-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${
                        form.icon === icon ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                        form.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 rounded-full cursor-pointer border-0"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: form.color + '25' }}>
                  {form.icon}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.name || 'Prévia'}</span>
                <div className="w-3 h-3 rounded-full ml-auto" style={{ backgroundColor: form.color }} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center">
                  <Plus className="w-4 h-4" /> Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete with usage confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Categoria em uso</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Esta categoria possui {getCategoryUsage(deleteConfirm)} lançamento(s). Ao excluí-la, esses lançamentos ficarão sem categoria.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => { deleteCategory(deleteConfirm); setDeleteConfirm(null); }}>
                <Trash2 className="w-4 h-4" /> Excluir mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
