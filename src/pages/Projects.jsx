import { useState, useMemo } from 'react';
import {
  Plus, ArrowLeft, Pencil, Trash2, TrendingUp, TrendingDown,
  Wallet, FolderOpen, X, LayoutDashboard
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

const PROJECT_ICONS = ['🏗️','🏠','💻','📱','🚗','🎯','💼','🌱','🎨','🏋️','📚','🎵','✈️','🍕','🎮','🛒','💡','🔧','🎓','⚽','🎪','🏖️','🏢','🔬','🛡️'];
const PROJECT_COLORS = ['#3b82f6','#22c55e','#f97316','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f59e0b','#10b981','#6366f1','#84cc16','#14b8a6'];

function ProjectFormModal({ project, onClose, onSave }) {
  const [form, setForm] = useState(
    project
      ? { name: project.name, description: project.description || '', icon: project.icon, color: project.color, includeInOverview: project.includeInOverview ?? true }
      : { name: '', description: '', icon: '🏗️', color: '#3b82f6', includeInOverview: true }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">
            {project ? 'Editar Projeto' : 'Novo Projeto'}
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Ex: Reforma da Casa"
            />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descreva o projeto..."
            />
          </div>

          <div>
            <label className="label">Ícone</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg max-h-28 overflow-y-auto scrollbar-thin">
              {PROJECT_ICONS.map(icon => (
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
              {PROJECT_COLORS.map(color => (
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
            </div>
          </div>

          {/* Include in overview toggle */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
              form.includeInOverview
                ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30'
            }`}
            onClick={() => setForm(f => ({ ...f, includeInOverview: !f.includeInOverview }))}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${form.includeInOverview ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${form.includeInOverview ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  Incluir no financeiro geral
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {form.includeInOverview
                    ? 'Lançamentos somam no Dashboard e Relatórios'
                    : 'Lançamentos ficam isolados neste projeto'}
                </p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${form.includeInOverview ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.includeInOverview ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: form.color + '25' }}
            >
              {form.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">
                {form.name || 'Nome do projeto'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {form.description || 'Descrição'}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: form.color }} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Plus className="w-4 h-4" />
              {project ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onBack }) {
  const { transactions, categories, updateProject, deleteProject } = useFinance();
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTxConfirm, setDeleteTxConfirm] = useState(null);
  const { deleteTransaction } = useFinance();

  const projectTxs = useMemo(
    () => transactions.filter(t => t.projectId === project.id).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions, project.id]
  );

  const income = projectTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = projectTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const handleDeleteProject = () => {
    deleteProject(project.id);
    onBack();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button className="btn-icon border border-slate-200 dark:border-slate-600" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: project.color + '25' }}
        >
          {project.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">
              {project.name}
            </h2>
            {project.includeInOverview
              ? <span className="flex-shrink-0 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">no geral</span>
              : <span className="flex-shrink-0 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">isolado</span>
            }
          </div>
          {project.description && (
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{project.description}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button className="btn-icon" onClick={() => setShowEditProject(true)} title="Editar projeto">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            className="btn-icon hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
            onClick={() => setShowDeleteConfirm(true)}
            title="Excluir projeto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Entradas</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(income)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Saídas</p>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-base font-bold text-red-700 dark:text-red-400">{formatCurrency(expense)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Saldo</p>
            <Wallet className={`w-4 h-4 ${balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
          </div>
          <p className={`text-base font-bold ${balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
            Lançamentos ({projectTxs.length})
          </h3>
          <button className="btn-primary" onClick={() => { setEditTx(null); setShowTxModal(true); }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Lançamento</span>
          </button>
        </div>

        {projectTxs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm font-medium">Nenhum lançamento neste projeto</p>
            <p className="text-xs mt-1">Clique em "Novo Lançamento" para começar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {projectTxs.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: (cat?.color || '#6b7280') + '20' }}
                  >
                    {cat?.icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {cat?.name} · {formatDate(t.date)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button className="btn-icon" onClick={() => { setEditTx(t); setShowTxModal(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="btn-icon hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                      onClick={() => setDeleteTxConfirm(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showTxModal && (
        <TransactionModal
          transaction={editTx}
          defaultProjectId={project.id}
          onClose={() => { setShowTxModal(false); setEditTx(null); }}
        />
      )}

      {showEditProject && (
        <ProjectFormModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onSave={(data) => updateProject({ ...project, ...data })}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir projeto?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              O projeto será excluído. Os {projectTxs.length} lançamentos vinculados serão mantidos, mas ficarão sem projeto.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-danger flex-1 justify-center" onClick={handleDeleteProject}>
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTxConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteTxConfirm(null)}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => { deleteTransaction(deleteTxConfirm); setDeleteTxConfirm(null); }}>
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const { projects, transactions, addProject, updateProject } = useFinance();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  const getProjectStats = (projectId) => {
    const txs = transactions.filter(t => t.projectId === projectId);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, count: txs.length };
  };

  const allProjectTxs = transactions.filter(t => t.projectId);
  const totalIncome = allProjectTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = allProjectTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Meus Projetos</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditProject(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Projeto</span>
        </button>
      </div>

      {projects.length > 0 && allProjectTxs.length > 0 && (
        <div className="card bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 border-0 text-white">
          <p className="text-xs font-semibold opacity-70 mb-3 uppercase tracking-wide">Consolidado — Todos os Projetos</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs opacity-60 mb-1">Entradas</p>
              <p className="font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-1">Saídas</p>
              <p className="font-bold text-red-400">{formatCurrency(totalExpense)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-1">Saldo</p>
              <p className={`font-bold ${totalBalance >= 0 ? 'text-blue-300' : 'text-orange-400'}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Nenhum projeto ainda</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-5 max-w-xs mx-auto">
            Crie projetos para organizar seus lançamentos por objetivo, obra, viagem, etc.
          </p>
          <button className="btn-primary mx-auto" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map(project => {
            const stats = getProjectStats(project.id);
            return (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className="card text-left hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    {project.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{project.name}</p>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      {project.includeInOverview
                        ? <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">no geral</span>
                        : <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-medium">isolado</span>
                      }
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{project.description}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {stats.count} lançamento{stats.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <span
                      className="btn-icon"
                      onClick={e => { e.stopPropagation(); setEditProject(project); setShowForm(true); }}
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Entradas</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(stats.income)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Saídas</p>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(stats.expense)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Saldo</p>
                    <p className={`text-sm font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(stats.balance)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProjectFormModal
          project={editProject}
          onClose={() => { setShowForm(false); setEditProject(null); }}
          onSave={(data) => {
            if (editProject) updateProject({ ...editProject, ...data });
            else addProject(data);
          }}
        />
      )}
    </div>
  );
}
