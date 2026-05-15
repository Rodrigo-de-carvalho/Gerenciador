import { useState, useMemo } from 'react';
import {
  Plus, ArrowLeft, Pencil, Trash2, FolderOpen,
  FileSpreadsheet, FileText, MessageSquare, Copy, Check, Share2, X,
  LayoutDashboard,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportProjectToExcel, downloadProjectPDF, generateProjectWhatsAppText } from '../utils/exportUtils';
import TransactionModal from '../components/TransactionModal';

const PROJECT_ICONS = ['🏗️','🏠','💻','📱','🚗','🎯','💼','🌱','🎨','🏋️','📚','🎵','✈️','🍕','🎮','🛍️','💡','🔧','🎓','⚽','🎪','🏖️','🏢','🔬','🛡️'];
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
          <h2 className="font-bold text-slate-800 dark:text-slate-100">{project ? 'Editar Projeto' : 'Novo Projeto'}</h2>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Reforma da Casa" />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o projeto..." />
          </div>
          <div>
            <label className="label">Ícone</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg max-h-28 overflow-y-auto scrollbar-thin">
              {PROJECT_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-9 h-9 rounded-lg text-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${form.icon === icon ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500' : ''}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${form.includeInOverview ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30'}`}
            onClick={() => setForm(f => ({ ...f, includeInOverview: !f.includeInOverview }))}>
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${form.includeInOverview ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${form.includeInOverview ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>Incluir no financeiro geral</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{form.includeInOverview ? 'Lançamentos somam no Dashboard' : 'Lançamentos isolados neste projeto'}</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${form.includeInOverview ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.includeInOverview ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Plus className="w-4 h-4" /> {project ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onBack }) {
  const { transactions, categories, updateProject, deleteProject, deleteTransaction } = useFinance();
  const { privacy } = usePrivacy();
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTxConfirm, setDeleteTxConfirm] = useState(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  const projectTxs = useMemo(
    () => transactions.filter(t => t.projectId === project.id).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions, project.id]
  );

  const income = projectTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = projectTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const handleDeleteProject = () => { deleteProject(project.id); onBack(); };

  const whatsappText = useMemo(() => generateProjectWhatsAppText(projectTxs, categories, project), [projectTxs, categories, project]);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(whatsappText);
    const phone = whatsappPhone.replace(/\D/g, '');
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={15} /></button>
        <div style={{ fontSize: 24, flexShrink: 0 }}>{project.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{project.name}</h2>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              background: project.includeInOverview ? 'rgba(59,130,246,0.12)' : 'var(--chip)',
              color: project.includeInOverview ? 'var(--info)' : 'var(--text-3)',
            }}>
              {project.includeInOverview ? 'no geral' : 'isolado'}
            </span>
          </div>
          {project.description && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="icon-btn" onClick={() => setShowEditProject(true)} title="Editar projeto"><Pencil size={13} /></button>
          <button className="icon-btn" style={{ color: 'var(--negative)' }} onClick={() => setShowDeleteConfirm(true)} title="Excluir projeto"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-cifra g-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Entradas', value: income, cls: 'pos' },
          { label: 'Saídas', value: expense, cls: 'neg' },
          { label: 'Saldo', value: balance, cls: balance >= 0 ? 'pos' : 'neg' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card" style={{ padding: '14px 18px' }}>
            <div className="t-label" style={{ marginBottom: 6 }}>{label}</div>
            <div className={`t-num ${cls}`} style={{ fontSize: 18, fontWeight: 600 }}>
              {privacy ? 'R$ ••••' : formatCurrency(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn-success text-sm py-2 px-3" onClick={() => exportProjectToExcel(projectTxs, categories, project)} disabled={projectTxs.length === 0}>
          <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
        </button>
        <button className="btn-danger text-sm py-2 px-3" onClick={() => downloadProjectPDF(projectTxs, categories, project)} disabled={projectTxs.length === 0}>
          <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
        </button>
        <button className="btn-primary text-sm py-2 px-3" onClick={() => setShowExportPanel(p => !p)}>
          <MessageSquare className="w-4 h-4" /><span className="hidden sm:inline">WhatsApp</span>
        </button>
        <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditTx(null); setShowTxModal(true); }}>
          <Plus size={14} /><span>Lançamento</span>
        </button>
      </div>

      {/* WhatsApp panel */}
      {showExportPanel && (
        <div className="card border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 space-y-4" style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0"><MessageSquare className="w-4 h-4 text-white" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Compartilhar via WhatsApp</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="label">Prévia</label>
              <textarea readOnly value={whatsappText} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 resize-none font-mono" rows={8} />
              <button className={`btn-secondary mt-2 text-sm w-full justify-center ${copied ? 'text-emerald-600 border-emerald-300' : ''}`} onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600 self-start">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2"><Share2 className="w-4 h-4 text-green-600" />Enviar</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Opcional: número para abrir direto.</p>
              <input type="tel" className="input-field mb-2" placeholder="Número (ex: 5511999999999)" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} />
              <button className="btn-success w-full justify-center text-sm" onClick={handleWhatsAppDirect}><Share2 className="w-4 h-4" /> Abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Lançamentos ({projectTxs.length})</span>
        </div>
        {projectTxs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💭</div>
            <div style={{ fontSize: 13 }}>Nenhum lançamento neste projeto</div>
          </div>
        ) : (
          <table className="tx-table">
            <tbody>
              {projectTxs.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                return (
                  <tr key={t.id}>
                    <td style={{ width: 40, paddingRight: 0 }}>
                      <div className="tx-row-icon"><span style={{ fontSize: 13 }}>{cat?.icon || '📋'}</span></div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{t.description}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{cat?.name} · {formatDate(t.date)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={`t-num ${t.type === 'income' ? 'pos' : 'neg'}`} style={{ fontSize: 13.5, fontWeight: 600 }}>
                        {privacy ? 'R$ ••••' : `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}`}
                      </div>
                    </td>
                    <td style={{ width: 76, paddingLeft: 0 }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', opacity: 0 }} className="tx-actions">
                        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => { setEditTx(t); setShowTxModal(true); }}><Pencil size={12} /></button>
                        <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--negative)' }} onClick={() => setDeleteTxConfirm(t.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showTxModal && <TransactionModal transaction={editTx} defaultProjectId={project.id} onClose={() => { setShowTxModal(false); setEditTx(null); }} />}
      {showEditProject && <ProjectFormModal project={project} onClose={() => setShowEditProject(false)} onSave={(data) => updateProject({ ...project, ...data })} />}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir projeto?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">O projeto será excluído. Os {projectTxs.length} lançamentos vinculados serão mantidos sem projeto.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={handleDeleteProject}><Trash2 className="w-4 h-4" /> Excluir</button>
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
              <button className="btn-danger flex-1 justify-center" onClick={() => { deleteTransaction(deleteTxConfirm); setDeleteTxConfirm(null); }}><Trash2 className="w-4 h-4" /> Excluir</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.tx-table tbody tr:hover .tx-actions { opacity: 1 !important; }`}</style>
    </div>
  );
}

export default function Projects() {
  const { projects, transactions, addProject, updateProject } = useFinance();
  const { privacy } = usePrivacy();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={() => setSelectedProjectId(null)} />;
  }

  const getProjectStats = (projectId) => {
    const txs = transactions.filter(t => t.projectId === projectId);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, count: txs.length };
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Seus projetos</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, fontFamily: 'Instrument Serif, serif', fontStyle: 'italic' }}>
            {projects.length} projeto{projects.length !== 1 ? 's' : ''} ativo{projects.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <button className="btn primary" onClick={() => { setEditProject(null); setShowForm(true); }}>
          <Plus size={14} /> Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>
            <FolderOpen size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum projeto ainda</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' }}>
            Crie projetos para organizar lançamentos por objetivo, obra, viagem, etc.
          </p>
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="grid-cifra g-2">
          {projects.map(project => {
            const stats = getProjectStats(project.id);
            return (
              <div
                key={project.id}
                className="proj-card"
                onClick={() => setSelectedProjectId(project.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, fontSize: 22,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    background: project.color + '20',
                  }}>
                    {project.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </span>
                      <span style={{
                        fontSize: 10.5, padding: '1px 7px', borderRadius: 999,
                        background: project.includeInOverview ? 'rgba(59,130,246,0.12)' : 'var(--chip)',
                        color: project.includeInOverview ? 'var(--info)' : 'var(--text-3)',
                      }}>
                        {project.includeInOverview ? 'no geral' : 'isolado'}
                      </span>
                    </div>
                    {project.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
                      {stats.count} lançamento{stats.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    style={{ flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); setEditProject(project); setShowForm(true); }}
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  {[
                    { label: 'Entradas', value: stats.income, cls: 'pos' },
                    { label: 'Saídas', value: stats.expense, cls: 'neg' },
                    { label: 'Saldo', value: stats.balance, cls: stats.balance >= 0 ? 'pos' : 'neg' },
                  ].map(({ label, value, cls }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                      <div className={`t-num ${cls}`} style={{ fontSize: 13, fontWeight: 600 }}>
                        {privacy ? '••••' : formatCurrency(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
