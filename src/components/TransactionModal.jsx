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
};

export default function TransactionModal({ transaction, onClose, defaultProjectId }) {
  const { categories, projects, addTransaction, updateTransaction } = useFinance();
  const [form, setForm] = useState(emptyForm);
  const isEdit = !!transaction;

  useEffect(() => {
    if (transaction) {
      setForm({ ...transaction, amount: String(transaction.amount), projectId: transaction.projectId || '' });
    } else {
      setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0], projectId: defaultProjectId || '' });
    }
  }, [transaction, defaultProjectId]);

  const filteredCats = categories.filter(c => c.type === form.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: parseFloat(form.amount.replace(',', '.')),
      projectId: form.projectId || null,
    };
    if (isEdit) updateTransaction(payload);
    else addTransaction(payload);
    onClose();
  };

  const set = (field, value) => setForm(prev => ({
    ...prev,
    [field]: value,
    ...(field === 'type' ? { categoryId: '' } : {}),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
            {isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <button
              type="button"
              onClick={() => set('type', 'income')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                form.type === 'income'
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => set('type', 'expense')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                form.type === 'expense'
                  ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Saída
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="label">Descrição *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Salário março"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              required
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input-field"
                placeholder="0,00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Data *</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Categoria *</label>
            <select
              className="select-field"
              value={form.categoryId}
              onChange={e => set('categoryId', e.target.value)}
              required
            >
              <option value="">Selecione uma categoria</option>
              {filteredCats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project (optional) */}
          {projects.length > 0 && (
            <div>
              <label className="label">Projeto <span className="text-slate-400 font-normal">(opcional)</span></label>
              <select
                className="select-field"
                value={form.projectId}
                onChange={e => set('projectId', e.target.value)}
              >
                <option value="">Nenhum projeto</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Observações</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Notas opcionais..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 justify-center ${form.type === 'income' ? 'btn-success' : 'btn-danger'}`}
            >
              <Plus className="w-4 h-4" />
              {isEdit ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
