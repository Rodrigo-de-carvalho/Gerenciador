import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

function groupByDate(txs) {
  const groups = {};
  txs.forEach(t => {
    const d = new Date(t.date);
    const key = t.date;
    if (!groups[key]) {
      groups[key] = {
        date: d,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' }),
        day: d.getDate(),
        txs: [],
      };
    }
    groups[key].txs.push(t);
  });
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

export default function Transactions() {
  const { transactions, categories, deleteTransaction } = useFinance();
  const { privacy } = usePrivacy();
  const now = getCurrentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('');
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
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, month, year, search, typeFilter, catFilter, categories]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button className="icon-btn" onClick={nextMonth}><ChevronRight size={15} /></button>

        <div style={{ display: 'flex', gap: 8, marginLeft: 8, flexWrap: 'wrap' }}>
          {['all', 'income', 'expense'].map(t => (
            <button
              key={t}
              className={`chip${typeFilter === t ? ' active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'Todos' : t === 'income' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>

        <button
          className="btn primary"
          style={{ marginLeft: 'auto' }}
          onClick={() => { setEditTx(null); setShowModal(true); }}
        >
          <Plus size={14} />
          <span>Lançamento</span>
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--chip)', borderRadius: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Entradas</span>
          <span className="t-num pos" style={{ fontSize: 13, fontWeight: 600 }}>
            {privacy ? 'R$ ••••' : formatCurrency(totalIncome)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--chip)', borderRadius: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Saídas</span>
          <span className="t-num neg" style={{ fontSize: 13, fontWeight: 600 }}>
            {privacy ? 'R$ ••••' : formatCurrency(totalExpense)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--chip)', borderRadius: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Saldo</span>
          <span className={`t-num ${totalIncome - totalExpense >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 13, fontWeight: 600 }}>
            {privacy ? 'R$ ••••' : formatCurrency(totalIncome - totalExpense)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Buscar descrição ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: 13,
              color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8,
            padding: '7px 12px', fontSize: 13, color: catFilter ? 'var(--text)' : 'var(--text-3)',
            cursor: 'pointer', fontFamily: 'inherit', minWidth: 160,
          }}
        >
          <option value="">Todas as categorias</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Transaction groups */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💭</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Nenhum lançamento encontrado</div>
          <div style={{ fontSize: 12.5, marginBottom: 20 }}>Tente ajustar os filtros ou adicione um novo lançamento</div>
          <button className="btn primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
            <Plus size={14} /> Novo Lançamento
          </button>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.date.toISOString()}>
            <div className="date-head">
              <span className="d">{group.day}</span>
              <span className="meta">{group.date.toLocaleDateString('pt-BR', { weekday: 'long', month: 'short' })}</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tx-table">
                <tbody>
                  {group.txs.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    return (
                      <tr key={t.id} className="group">
                        <td style={{ width: 40, paddingRight: 0 }}>
                          <div className="tx-row-icon">
                            <span style={{ fontSize: 13 }}>{cat?.icon || '📋'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13.5 }}>{t.description}</div>
                          {cat && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: cat.color + '18', color: cat.color,
                                padding: '1px 6px', borderRadius: 4, fontSize: 11,
                              }}>
                                {cat.name}
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={`t-num ${t.type === 'income' ? 'pos' : 'neg'}`} style={{ fontSize: 13.5, fontWeight: 600 }}>
                            {privacy ? 'R$ ••••' : `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}`}
                          </div>
                        </td>
                        <td style={{ width: 72, paddingLeft: 0 }}>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', opacity: 0 }}
                            className="tx-actions">
                            <button
                              className="icon-btn"
                              style={{ width: 28, height: 28 }}
                              onClick={() => { setEditTx(t); setShowModal(true); }}
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className="icon-btn"
                              style={{ width: 28, height: 28, color: 'var(--negative)' }}
                              onClick={() => setDeleteConfirm(t.id)}
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {filtered.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 24 }}>
          {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''} em {MONTHS[month - 1]} {year}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => { deleteTransaction(deleteConfirm); setDeleteConfirm(null); }}>
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

      <style>{`
        .tx-table tbody tr:hover .tx-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
