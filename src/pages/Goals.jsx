import { useState } from 'react';
import { Plus, Target, ArrowRight, X, LayoutDashboard } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/formatters';

const PROJECT_ICONS = ['🎯','🏠','✈️','📚','🚗','💻','🌱','🏋️','💰','🛹','🏖️','🎓','💍','🏗️','🎵','⚽','🎮','🏢','🔬','🛡️'];
const PROJECT_COLORS = ['#3b82f6','#22c55e','#f97316','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f59e0b','#10b981','#6366f1','#84cc16','#14b8a6'];

function GoalFormModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', icon: '🎯', color: '#3b82f6', includeInOverview: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Nova Meta</h2>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome da meta *</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Reserva de emergência" />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva seu objetivo..." />
          </div>
          <div>
            <label className="label">Ícone</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg max-h-24 overflow-y-auto scrollbar-thin">
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
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Se ativo, gastos da meta somam nas suas despesas mensais</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${form.includeInOverview ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.includeInOverview ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1 justify-center"><Plus className="w-4 h-4" /> Criar meta</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Ring({ pct, size = 48, thickness = 4, color = 'var(--accent)' }) {
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

export default function Goals() {
  const { projects, transactions, addProject } = useFinance();
  const { privacy } = usePrivacy();
  const [showForm, setShowForm] = useState(false);

  const goalData = projects.map(p => {
    const ptxs = transactions.filter(t => t.projectId === p.id);
    const spent = ptxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const received = ptxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const net = received - spent;
    const txCount = ptxs.length;
    return { ...p, spent, received, net, txCount };
  });

  const totalSaved = goalData.reduce((s, g) => s + g.received, 0);
  const totalSpent = goalData.reduce((s, g) => s + g.spent, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Objetivos financeiros</div>
          <h2 className="t-display" style={{ fontSize: 24 }}>
            {goalData.length} <em>meta{goalData.length !== 1 ? 's' : ''}</em> ativa{goalData.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <button className="btn primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Nova Meta
        </button>
      </div>

      {/* Summary */}
      {goalData.length > 0 && (
        <div className="insight" style={{ marginBottom: 20 }}>
          <div className="t-eyebrow" style={{ color: 'var(--accent)', marginBottom: 10 }}>Visão geral das metas</div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div className="t-label" style={{ marginBottom: 4 }}>Total aportado</div>
              <div className="t-num pos" style={{ fontSize: 20, fontWeight: 600 }}>
                {privacy ? 'R$ ••••' : formatCurrency(totalSaved)}
              </div>
            </div>
            <div>
              <div className="t-label" style={{ marginBottom: 4 }}>Total gasto</div>
              <div className="t-num neg" style={{ fontSize: 20, fontWeight: 600 }}>
                {privacy ? 'R$ ••••' : formatCurrency(totalSpent)}
              </div>
            </div>
            <div>
              <div className="t-label" style={{ marginBottom: 4 }}>Metas ativas</div>
              <div className="t-num" style={{ fontSize: 20, fontWeight: 600 }}>{goalData.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goalData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, background: 'var(--chip)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Target size={24} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhuma meta definida</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            Crie metas para acompanhar seu progresso em objetivos financeiros: reserva de emergência, viagem, compra etc.
          </p>
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Criar primeira meta
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {goalData.map(goal => {
            const totalFlow = goal.spent + goal.received;
            const pct = totalFlow > 0 ? Math.round(goal.received / totalFlow * 100) : 0;
            return (
              <div key={goal.id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Ring pct={pct} size={52} thickness={4} color={goal.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{goal.icon}</span>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{goal.name}</h3>
                      <span style={{
                        fontSize: 10.5, padding: '1px 7px', borderRadius: 999,
                        background: goal.includeInOverview ? 'rgba(59,130,246,0.12)' : 'var(--chip)',
                        color: goal.includeInOverview ? 'var(--info)' : 'var(--text-3)',
                      }}>
                        {goal.includeInOverview ? 'no geral' : 'isolado'}
                      </span>
                    </div>
                    {goal.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{goal.description}</div>
                    )}
                    <div className="bar-track" style={{ marginBottom: 6 }}>
                      <div className="bar-fill" style={{ width: `${pct}%`, background: goal.color }} />
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 11.5, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                      <span>Aportado: <span className="pos" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>
                        {privacy ? '••••' : formatCurrency(goal.received)}
                      </span></span>
                      <span>Gasto: <span className="neg" style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>
                        {privacy ? '••••' : formatCurrency(goal.spent)}
                      </span></span>
                      <span>{goal.txCount} lançamento{goal.txCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Ver <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--chip)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
        💡 <strong style={{ color: 'var(--text-2)' }}>Dica:</strong> As metas são baseadas nos seus Projetos. Crie lançamentos vinculados a um projeto para acompanhar o progresso. Gerencie os detalhes na seção <strong style={{ color: 'var(--text-2)' }}>Projetos</strong>.
      </div>

      {showForm && (
        <GoalFormModal onClose={() => setShowForm(false)} onSave={(data) => addProject(data)} />
      )}
    </div>
  );
}
