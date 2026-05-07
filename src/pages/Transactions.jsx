import { useState, useMemo } from 'react';
import {
  Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  ArrowUpDown, Filter
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

export default function Transactions() {
  const { transactions, categories, deleteTransaction } = useFinance();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editTx, setEditTx] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const filtered = useMemo(() => {
    let list = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (catFilter) list = list.filter(t => t.categoryId === catFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(q)
      );
    }
    list = list.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === 'amount') { av = Number(av); bv = Number(bv); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [transactions, month, year, search, typeFilter, catFilter, sortField, sortDir, categories]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleEdit = (tx) => { setEditTx(tx); setShowModal(true); };
  const handleDelete = (id) => { setDeleteConfirm(id); };
  const confirmDelete = () => { deleteTransaction(deleteConfirm); setDeleteConfirm(null); };

  return (
    <div className="space-y-4">
      {/* Month nav + add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn-icon border border-slate-200" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 capitalize min-w-[150px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button className="btn-icon border border-slate-200" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button className="btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-xs text-emerald-600 font-medium">Entradas</p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-xs text-red-600 font-medium">Saídas</p>
          <p className="text-base font-bold text-red-700 mt-0.5">{formatCurrency(totalExpense)}</p>
        </div>
        <div className={`border rounded-xl p-3 ${totalIncome - totalExpense >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-xs font-medium ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Saldo</p>
          <p className={`text-base font-bold mt-0.5 ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="select-field" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
          <select className="select-field" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  { label: 'Data', field: 'date' },
                  { label: 'Descrição', field: 'description' },
                  { label: 'Categoria', field: 'categoryId' },
                  { label: 'Tipo', field: 'type' },
                  { label: 'Valor', field: 'amount' },
                ].map(col => (
                  <th
                    key={col.field}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap"
                    onClick={() => toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <p className="text-3xl mb-2">📭</p>
                    <p>Nenhum lançamento encontrado</p>
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700 truncate max-w-[200px]">{t.description}</p>
                        {t.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{t.notes}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                            {cat.icon} {cat.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          t.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type === 'income' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-icon" onClick={() => handleEdit(t)} title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button className="btn-icon hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(t.id)} title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={confirmDelete}>
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <TransactionModal
          transaction={editTx}
          onClose={() => { setShowModal(false); setEditTx(null); }}
        />
      )}
    </div>
  );
}
