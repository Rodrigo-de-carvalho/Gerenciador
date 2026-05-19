import { useState } from 'react';
import { Plus, Target, X, Edit2, Trash2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useGoals } from '../context/GoalContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';
import { useI18n } from '../i18n';

const ICONS = ['🎯','🏠','✈️','📚','🚗','💻','🌱','🏋️','💰','🛹','🏖️','🎓','💍','🏗️','🎵','⚽','🎮','🏢','🔬','🛡️'];
const COLORS = ['#C7F284','#3b82f6','#22c55e','#f97316','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f59e0b','#10b981','#6366f1','#84cc16'];

function GoalModal({ goal, onClose, onSave }) {
  const { t } = useI18n();
  const isEdit = !!goal;
  const [form, setForm] = useState(goal ? {
    name: goal.name,
    description: goal.description || '',
    icon: goal.icon,
    color: goal.color,
    includeInOverview: goal.includeInOverview ?? false,
    targetAmount: goal.targetAmount ? String(goal.targetAmount) : '',
    deadline: goal.deadline || '',
  } : {
    name: '', description: '', icon: '🎯', color: '#C7F284',
    includeInOverview: false, targetAmount: '', deadline: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name,
      description: form.description,
      icon: form.icon,
      color: form.color,
      includeInOverview: form.includeInOverview,
      targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : null,
      deadline: form.deadline || null,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isEdit ? t('goals.editGoal') : t('goals.newGoal')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="field">
              <label className="field-label">{t('goals.goalName')}</label>
              <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('goals.goalNamePlaceholder')} required />
            </div>

            <div className="field">
              <label className="field-label">{t('goals.description')}</label>
              <textarea className="field-input" style={{ resize: 'none' }} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('goals.descPlaceholder')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">{t('goals.targetAmount')}</label>
                <input type="number" step="0.01" min="0" className="field-input" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} placeholder="0,00" />
              </div>
              <div className="field">
                <label className="field-label">{t('goals.deadline')}</label>
                <input type="date" className="field-input" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="field-label">{t('goals.goalIcon')}</label>
              <div className="icon-grid">
                {ICONS.map(ic => (
                  <button key={ic} type="button" className={`icon-pick${form.icon === ic ? ' sel' : ''}`} onClick={() => set('icon', ic)}>{ic}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field-label">{t('goals.goalColor')}</label>
              <div className="color-grid">
                {COLORS.map(c => (
                  <button key={c} type="button" className={`color-pick${form.color === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => set('color', c)} />
                ))}
              </div>
            </div>

            <div className="toggle-row" onClick={() => set('includeInOverview', !form.includeInOverview)}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t('goals.includeInOverview')}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{t('goals.includeInOverviewDesc')}</div>
              </div>
              <div className={`toggle-track${form.includeInOverview ? ' on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Plus size={14} /> {isEdit ? t('common.save') : t('goals.createGoal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Ring({ pct, size = 54, thickness = 5, color = 'var(--accent)' }) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chip-strong)" strokeWidth={thickness} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={10} fill="var(--text-3)" fontFamily="Geist Mono, monospace">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function GoalCard({ goal, onEdit, onDelete }) {
  const { t } = useI18n();
  const { transactions } = useFinance();
  const { getGoalMeta } = useGoals();
  const { privacy } = usePrivacy();
  const [expanded, setExpanded] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);

  const meta = getGoalMeta(goal.id);
  const ptxs = transactions.filter(t => t.projectId === goal.id);
  const income = ptxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = ptxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const target = meta?.targetAmount;
  const deadline = meta?.deadline;
  const pct = target ? Math.min((income / target) * 100, 100) : (ptxs.length > 0 ? 50 : 0);

  const remaining = target ? Math.max(target - income, 0) : null;
  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Ring pct={target ? pct : (income > 0 ? 60 : 0)} size={54} thickness={5} color={goal.color} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16 }}>{goal.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{goal.name}</span>
            <span style={{
              fontSize: 10.5, padding: '1px 7px', borderRadius: 999,
              background: goal.includeInOverview ? 'rgba(143,183,255,0.12)' : 'var(--chip)',
              color: goal.includeInOverview ? 'var(--info)' : 'var(--text-3)',
            }}>
              {goal.includeInOverview ? t('goals.inGeneral') : t('goals.isolated')}
            </span>
          </div>

          {goal.description && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{goal.description}</div>
          )}

          <div className="bar-track" style={{ marginBottom: 6 }}>
            <div className="bar-fill" style={{ width: `${target ? pct : (income > 0 ? 60 : 0)}%`, background: goal.color }} />
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            <span>{t('goals.contributed') + ': '}<span className="pos t-num" style={{ fontWeight: 600 }}>{privacy ? '••••' : formatCurrency(income)}</span></span>
            {expense > 0 && <span>{t('goals.spent') + ': '}<span className="neg t-num" style={{ fontWeight: 600 }}>{privacy ? '••••' : formatCurrency(expense)}</span></span>}
            {target && <span>{t('goals.target') + ': '}<span className="t-num" style={{ fontWeight: 600 }}>{privacy ? '••••' : formatCurrency(target)}</span></span>}
            {remaining !== null && remaining > 0 && <span>{t('goals.remaining') + ': '}<span className="t-num" style={{ fontWeight: 600 }}>{privacy ? '••••' : formatCurrency(remaining)}</span></span>}
            {daysLeft !== null && <span style={{ color: daysLeft < 30 ? 'var(--negative)' : 'var(--text-3)' }}>{daysLeft > 0 ? `${daysLeft}${t('goals.daysLeft')}` : t('goals.deadlinePassed')}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="icon-btn" onClick={() => setExpanded(e => !e)} title="Ver lançamentos">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="icon-btn" onClick={onEdit} title="Editar">
            <Edit2 size={14} />
          </button>
          <button className="icon-btn" onClick={onDelete} title="Excluir" style={{ color: 'var(--negative)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {t('goals.countFn')(ptxs.length)}
            </span>
            <button className="btn primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowTxModal(true)}>
              <Plus size={12} /> {t('common.add')}
            </button>
          </div>

          {ptxs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 12.5 }}>
              {t('goals.noTransactions')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[...ptxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                  </div>
                  <span className={`t-num ${tx.type === 'income' ? 'pos' : 'neg'}`} style={{ fontSize: 13, fontWeight: 600 }}>
                    {tx.type === 'income' ? '+' : '-'}{privacy ? '••••' : formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
              {ptxs.length > 8 && (
                <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-3)', padding: '6px 0' }}>
                  {t('goals.moreTransactionsFn')(ptxs.length - 8)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showTxModal && (
        <TransactionModal
          onClose={() => setShowTxModal(false)}
          defaultProjectId={goal.id}
        />
      )}
    </div>
  );
}

export default function Goals() {
  const { t } = useI18n();
  const { projects, addProject, updateProject, deleteProject } = useFinance();
  const { goals, goalProjectIds, addGoal, updateGoal, removeGoal } = useGoals();
  const { transactions } = useFinance();
  const { privacy } = usePrivacy();
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  const goalProjects = projects.filter(p => goalProjectIds.has(p.id));

  const totalIncome = goalProjects.reduce((s, p) => {
    const ptxs = transactions.filter(t => t.projectId === p.id && t.type === 'income');
    return s + ptxs.reduce((a, t) => a + t.amount, 0);
  }, 0);

  const totalExpense = goalProjects.reduce((s, p) => {
    const ptxs = transactions.filter(t => t.projectId === p.id && t.type === 'expense');
    return s + ptxs.reduce((a, t) => a + t.amount, 0);
  }, 0);

  const handleCreate = async (data) => {
    const { targetAmount, deadline, ...projectData } = data;
    const created = await addProject(projectData);
    if (created) addGoal(created.id, { targetAmount, deadline });
  };

  const handleEdit = async (data) => {
    if (!editGoal) return;
    const { targetAmount, deadline, ...projectData } = data;
    await updateProject({ ...projectData, id: editGoal.id });
    updateGoal(editGoal.id, { targetAmount, deadline });
    setEditGoal(null);
  };

  const handleDelete = async (goalId) => {
    if (!confirm(t('goals.deleteGoalConfirm'))) return;
    await deleteProject(goalId);
    removeGoal(goalId);
  };

  const openEdit = (p) => {
    const meta = goals.find(g => g.projectId === p.id);
    setEditGoal({ ...p, targetAmount: meta?.targetAmount || null, deadline: meta?.deadline || null });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>{t('goals.financialObjectives')}</div>
          <h2 className="t-display" style={{ fontSize: 24 }}>
            {goalProjects.length} <em>{goalProjects.length !== 1 ? t('goals.activePlural') : t('goals.activeSingle')}</em> {goalProjects.length !== 1 ? t('goals.activePluralF') : t('goals.activeSingleF')}
          </h2>
        </div>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> {t('goals.newGoal')}
        </button>
      </div>

      {goalProjects.length > 0 && (
        <div className="insight" style={{ marginBottom: 20 }}>
          <div className="t-eyebrow" style={{ color: 'var(--accent)', marginBottom: 10 }}>{t('goals.overview')}</div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div className="t-label" style={{ marginBottom: 4 }}>{t('goals.totalContributed')}</div>
              <div className="t-num pos" style={{ fontSize: 20, fontWeight: 600 }}>
                {privacy ? 'R$ ••••' : formatCurrency(totalIncome)}
              </div>
            </div>
            <div>
              <div className="t-label" style={{ marginBottom: 4 }}>{t('goals.totalSpent')}</div>
              <div className="t-num neg" style={{ fontSize: 20, fontWeight: 600 }}>
                {privacy ? 'R$ ••••' : formatCurrency(totalExpense)}
              </div>
            </div>
            <div>
              <div className="t-label" style={{ marginBottom: 4 }}>{t('goals.activeGoals')}</div>
              <div className="t-num" style={{ fontSize: 20, fontWeight: 600 }}>{goalProjects.length}</div>
            </div>
          </div>
        </div>
      )}

      {goalProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Target size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('goals.noGoalsDefined')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            {t('goals.noGoalsDesc')}
          </p>
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> {t('goals.createFirstGoal')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goalProjects.map(p => (
            <GoalCard
              key={p.id}
              goal={p}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <GoalModal onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}
      {editGoal && (
        <GoalModal goal={editGoal} onClose={() => setEditGoal(null)} onSave={handleEdit} />
      )}
    </div>
  );
}
