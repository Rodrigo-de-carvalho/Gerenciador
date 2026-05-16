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
      : { name: '', description: '', icon: '🏗️', color: '#C7F284', includeInOverview: true }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h2>{project ? 'Editar Projeto' : 'Novo Projeto'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="field">
              <label className="field-label">Nome *</label>
              <input type="text" className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Reforma da Casa" />
            </div>
            <div className="field">
              <label className="field-label">Descrição</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o projeto..." />
            </div>
            <div className="field">
              <label className="field-label">Ícone</label>
              <div className="icon-grid" style={{ maxHeight: 120, overflowY: 'auto' }}>
                {PROJECT_ICONS.map(icon => (
                  <button key={icon} type="button" className={`icon-pick${form.icon === icon ? ' sel' : ''}`} onClick={() => setForm(f => ({ ...f, icon }))}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Cor</label>
              <div className="color-grid">
                {PROJECT_COLORS.map(color => (
                  <button key={color} type="button" className={`color-pick${form.color === color ? ' sel' : ''}`} style={{ background: color }} onClick={() => setForm(f => ({ ...f, color }))} />
                ))}
              </div>
            </div>
            <div className="toggle-row" onClick={() => setForm(f => ({ ...f, includeInOverview: !f.includeInOverview }))}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Incluir no financeiro geral</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                  {form.includeInOverview ? 'Lançamentos somam no Dashboard' : 'Lançamentos isolados neste projeto'}
                </div>
              </div>
              <div className={`toggle-track${form.includeInOverview ? ' on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Plus size={14} /> {project ? 'Salvar' : 'Criar'}
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
        <button className="btn" onClick={() => exportProjectToExcel(projectTxs, categories, project)} disabled={projectTxs.length === 0}>
          <FileSpreadsheet size={14} /> Excel
        </button>
        <button className="btn" onClick={() => downloadProjectPDF(projectTxs, categories, project)} disabled={projectTxs.length === 0}>
          <FileText size={14} /> PDF
        </button>
        <button className="btn" onClick={() => setShowExportPanel(p => !p)}>
          <MessageSquare size={14} /> WhatsApp
        </button>
        <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditTx(null); setShowTxModal(true); }}>
          <Plus size={14} /> Lançamento
        </button>
      </div>

      {/* WhatsApp panel */}
      {showExportPanel && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(199,242,132,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: 'rgba(199,242,132,0.12)', borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--positive)', flexShrink: 0 }}>
              <MessageSquare size={15} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Compartilhar via WhatsApp</span>
          </div>
          <div className="grid-cifra g-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="field-label">Prévia do texto</label>
              <textarea
                readOnly
                value={whatsappText}
                rows={8}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace', resize: 'none', outline: 'none' }}
              />
              <button
                className="btn"
                style={{ justifyContent: 'center', color: copied ? 'var(--positive)' : undefined }}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: 'var(--chip)', borderRadius: 10, alignSelf: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={13} style={{ color: 'var(--positive)' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Enviar</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Opcional: número para abrir direto.</p>
              <input
                type="tel"
                className="field-input"
                placeholder="Número (ex: 5511999999999)"
                value={whatsappPhone}
                onChange={e => setWhatsappPhone(e.target.value)}
              />
              <button className="btn primary" style={{ justifyContent: 'center' }} onClick={handleWhatsAppDirect}>
                <Share2 size={14} /> Abrir WhatsApp
              </button>
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
          <div style={{ overflowX: 'auto' }}>
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
          </div>
        )}
      </div>

      {showTxModal && <TransactionModal transaction={editTx} defaultProjectId={project.id} onClose={() => { setShowTxModal(false); setEditTx(null); }} />}
      {showEditProject && <ProjectFormModal project={project} onClose={() => setShowEditProject(false)} onSave={(data) => updateProject({ ...project, ...data })} />}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2>Excluir projeto?</h2>
              <button className="icon-btn" onClick={() => setShowDeleteConfirm(false)}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                O projeto será excluído. Os <strong style={{ color: 'var(--text)' }}>{projectTxs.length} lançamentos</strong> vinculados serão mantidos sem projeto.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent' }}
                onClick={handleDeleteProject}
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTxConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2>Excluir lançamento?</h2>
              <button className="icon-btn" onClick={() => setDeleteTxConfirm(null)}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteTxConfirm(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent' }}
                onClick={() => { deleteTransaction(deleteTxConfirm); setDeleteTxConfirm(null); }}
              >
                <Trash2 size={14} /> Excluir
              </button>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
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
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>
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
                    <div key={label} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                      <div className={`t-num ${cls}`} style={{ fontSize: 13, fontWeight: 600, overflowWrap: 'break-word' }}>
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
