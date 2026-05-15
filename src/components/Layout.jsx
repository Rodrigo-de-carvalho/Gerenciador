import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, FolderOpen, CreditCard, Target,
  Bot, Tags, PieChart, Settings, LogOut, Sun, Moon, Eye, EyeOff,
  Plus, Menu, X, ToggleLeft, ToggleRight, Bot as BotIcon,
  ShieldAlert, Trash2, Shield, Download,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePrivacy } from '../context/PrivacyContext';
import { supabase } from '../lib/supabase';
import PrivacyPolicy from './PrivacyPolicy';

const NAV_MAIN = [
  { id: 'dashboard',    label: 'Painel',       Icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações',   Icon: ArrowLeftRight },
  { id: 'projects',     label: 'Projetos',     Icon: FolderOpen },
  { id: 'cards',        label: 'Cartões',      Icon: CreditCard },
  { id: 'goals',        label: 'Metas',        Icon: Target },
  { id: 'assistant',    label: 'Cifra IA',     Icon: Bot },
];

const NAV_TOOLS = [
  { id: 'categories',   label: 'Categorias',  Icon: Tags },
  { id: 'reports',      label: 'Relatórios',  Icon: PieChart },
];

const PAGE_TITLES = {
  dashboard:    { title: 'Painel',       sub: 'Visão geral' },
  transactions: { title: 'Transações',   sub: 'Histórico completo' },
  projects:     { title: 'Projetos',     sub: 'Seus projetos' },
  cards:        { title: 'Cartões',      sub: 'Crédito e parcelas' },
  goals:        { title: 'Metas',        sub: 'Objetivos financeiros' },
  assistant:    { title: 'Cifra IA',     sub: 'Assistente pessoal' },
  categories:   { title: 'Categorias',  sub: 'Organizar lançamentos' },
  reports:      { title: 'Relatórios',  sub: 'Análises detalhadas' },
};

function SettingsModal({ onClose }) {
  const { user, updateProfile, deleteAccount } = useAuth();
  const aiEnabled = user?.user_metadata?.ai_assistant_enabled === true;
  const [enabled, setEnabled] = useState(aiEnabled);
  const [saving, setSaving] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleToggle = () => { if (!enabled) setShowConsent(true); else setEnabled(false); };
  const handleAcceptConsent = () => { setEnabled(true); setShowConsent(false); };
  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ ai_assistant_enabled: enabled });
    setSaving(false);
    onClose();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const userId = user.id;
      const [txRes, catRes, projRes, cardRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('cards').select('*').eq('user_id', userId),
      ]);
      const exportData = {
        exportDate: new Date().toISOString(),
        user: { email: user.email, id: userId },
        transactions: txRes.data || [],
        categories: catRes.data || [],
        projects: projRes.data || [],
        cards: cardRes.data || [],
        settings: {
          ai_assistant_enabled: user.user_metadata?.ai_assistant_enabled ?? false,
          terms_accepted_at: user.user_metadata?.terms_accepted_at ?? null,
        },
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-financeiros-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    const { error } = await deleteAccount();
    if (error) { setDeleteError(error); setDeleting(false); }
  };

  const changed = enabled !== aiEnabled;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Configurações</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Conta</p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{user?.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Conta ativa</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Privacidade</p>
            <div className="space-y-2">
              <button type="button" onClick={() => setShowPrivacy(true)} className="w-full flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0"><Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Política de Privacidade</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Como seus dados são usados (LGPD)</p>
                </div>
              </button>
              <button type="button" onClick={handleExport} disabled={exporting} className="w-full flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left disabled:opacity-60">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0"><Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Exportar meus dados</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{exporting ? 'Gerando arquivo...' : 'Baixar JSON com todos os seus dados'}</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Assistente de IA</p>
            <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
              <button type="button" onClick={handleToggle} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <BotIcon className={`w-5 h-5 ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ativar Assistente de IA</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{enabled ? 'Ativado — chat disponível' : 'Desativado por padrão'}</p>
                </div>
                {enabled ? <ToggleRight className="w-7 h-7 text-blue-600 dark:text-blue-400 flex-shrink-0" /> : <ToggleLeft className="w-7 h-7 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
              </button>
              {enabled && (
                <div className="px-4 pb-4 pt-0">
                  <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">Com o assistente ativado, um <strong>resumo financeiro</strong> é enviado a uma IA externa (Groq/Llama) a cada mensagem. Nenhum dado pessoal identificável é transmitido.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Zona de Perigo</p>
            <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Deletar minha conta</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Remove permanentemente todos os seus dados</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving || !changed}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {showConsent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0"><ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Ativar Assistente de IA?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">Ao ativar, um <strong>resumo dos seus dados financeiros</strong> será enviado ao modelo <strong>Llama 3.3</strong> da Groq a cada mensagem.</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5"><strong>Não são transmitidos</strong> dados pessoais como nome, CPF ou senhas. Ao continuar, você concorda com esse processamento.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowConsent(false)}>Cancelar</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleAcceptConsent}>Entendi e aceito</button>
            </div>
          </div>
        </div>
      )}

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Deletar conta permanentemente?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">Essa ação é <strong>irreversível</strong>. Todos os seus dados serão removidos:</p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 list-disc list-inside mb-4 space-y-0.5">
              <li>Todas as transações</li>
              <li>Categorias personalizadas</li>
              <li>Projetos e cartões</li>
              <li>Sua conta de acesso</li>
            </ul>
            {deleteError && <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{deleteError}</p>}
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} disabled={deleting}>Cancelar</button>
              <button className="btn-danger flex-1 justify-center" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deletando...' : 'Sim, deletar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ currentPage, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { darkMode, toggleDark } = useTheme();
  const { privacy, setPrivacy } = usePrivacy();
  const { user, signOut } = useAuth();

  const userInitial = user?.email?.[0]?.toUpperCase() || '?';
  const userEmail = user?.email || '';
  const pageInfo = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;

  const navigate = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">c</div>
          <span className="brand-name">Cifra<em>.</em></span>
          <button
            className="icon-btn"
            style={{ marginLeft: 'auto', display: 'none' }}
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Main nav */}
        {NAV_MAIN.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item${currentPage === id ? ' active' : ''}`}
            onClick={() => navigate(id)}
          >
            <span className="nav-icon">
              <Icon size={16} />
            </span>
            {label}
            {id === 'assistant' && <span className="nav-dot" />}
          </button>
        ))}

        {/* Tools section */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>Ferramentas</div>
        {NAV_TOOLS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item${currentPage === id ? ' active' : ''}`}
            onClick={() => navigate(id)}
          >
            <span className="nav-icon">
              <Icon size={16} />
            </span>
            {label}
          </button>
        ))}

        {/* User card */}
        <div className="user-card" onClick={() => setShowSettings(true)} title="Configurações">
          <div className="avatar">{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Configurações</div>
          </div>
          <Settings size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar">
          {/* Mobile hamburger */}
          <button
            className="icon-btn"
            style={{ display: 'none' }}
            id="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu style={{ width: 15, height: 15 }} />
          </button>

          <div className="crumbs">
            <span>Cifra</span>
            <span style={{ color: 'var(--line-2)' }}>/</span>
            <em>{pageInfo.title}</em>
            {pageInfo.sub && (
              <>
                <span style={{ color: 'var(--line-2)' }}>/</span>
                <span>{pageInfo.sub}</span>
              </>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Privacy toggle */}
            <button
              className="icon-btn"
              onClick={() => setPrivacy(v => !v)}
              title={privacy ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {privacy
                ? <EyeOff style={{ width: 15, height: 15 }} />
                : <Eye style={{ width: 15, height: 15 }} />
              }
            </button>

            {/* Theme toggle */}
            <button className="icon-btn" onClick={toggleDark} title={darkMode ? 'Modo claro' : 'Modo escuro'}>
              {darkMode
                ? <Sun style={{ width: 15, height: 15, color: '#FFC04A' }} />
                : <Moon style={{ width: 15, height: 15 }} />
              }
            </button>

            {/* User avatar + menu */}
            <div style={{ position: 'relative' }}>
              <button
                className="avatar"
                style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => setShowUserMenu(v => !v)}
                title={userEmail}
              >
                {userInitial}
              </button>
              {showUserMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowUserMenu(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: 40, zIndex: 20,
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 10, boxShadow: 'var(--shadow)', width: 200, overflow: 'hidden',
                  }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Conta ativa</div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--chip)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Settings size={14} /> Configurações
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); signOut(); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', color: 'var(--negative)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--chip)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={14} /> Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="scroll">
          {children}
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Mobile menu button injected via CSS */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: grid !important; }
        }
      `}</style>
    </div>
  );
}
