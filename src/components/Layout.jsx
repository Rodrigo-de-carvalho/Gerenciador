import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, FolderOpen, CreditCard, Target,
  Bot, Tags, PieChart, Settings, LogOut, Sun, Moon, Eye, EyeOff,
  Plus, Menu, X, ToggleLeft, ToggleRight, Bot as BotIcon,
  ShieldAlert, Trash2, Shield, Download, TrendingUp, Smartphone,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePrivacy } from '../context/PrivacyContext';
import { supabase } from '../lib/supabase';
import PrivacyPolicy from './PrivacyPolicy';

const NAV_MAIN = [
  { id: 'dashboard',    label: 'Painel',        Icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações',    Icon: ArrowLeftRight },
  { id: 'projects',     label: 'Projetos',      Icon: FolderOpen },
  { id: 'cards',        label: 'Cartões',       Icon: CreditCard },
  { id: 'goals',        label: 'Metas',         Icon: Target },
  { id: 'investments',  label: 'Investimentos', Icon: TrendingUp },
  { id: 'assistant',    label: 'Cifra IA',      Icon: Bot },
];

const NAV_TOOLS = [
  { id: 'categories',   label: 'Categorias',  Icon: Tags },
  { id: 'reports',      label: 'Relatórios',  Icon: PieChart },
];

const PAGE_TITLES = {
  dashboard:    { title: 'Painel',        sub: 'Visão geral' },
  transactions: { title: 'Transações',    sub: 'Histórico completo' },
  projects:     { title: 'Projetos',      sub: 'Seus projetos' },
  cards:        { title: 'Cartões',       sub: 'Crédito e parcelas' },
  goals:        { title: 'Metas',         sub: 'Objetivos financeiros' },
  investments:  { title: 'Investimentos', sub: 'Carteira de ativos' },
  assistant:    { title: 'Cifra IA',      sub: 'Assistente pessoal' },
  categories:   { title: 'Categorias',   sub: 'Organizar lançamentos' },
  reports:      { title: 'Relatórios',   sub: 'Análises detalhadas' },
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
      const [txRes, catRes, projRes, cardRes, goalRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('cards').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
      ]);
      const exportData = {
        exportDate: new Date().toISOString(),
        user: { email: user.email, id: userId },
        transactions: txRes.data || [],
        categories: catRes.data || [],
        projects: projRes.data || [],
        cards: cardRes.data || [],
        goals: goalRes.data || [],
        investments: invRes.data || [],
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

  const SectionLabel = ({ children, danger }) => (
    <div className="t-eyebrow" style={{ color: danger ? 'var(--negative)' : 'var(--accent)', marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  );

  const SettingRow = ({ icon, title, subtitle, onClick, disabled, danger, right }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        background: 'var(--chip)', border: '1px solid transparent',
        transition: 'background 120ms, border-color 120ms',
        opacity: disabled ? 0.5 : 1, textAlign: 'left', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--chip-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--chip)'; }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: danger ? 'rgba(255,122,90,0.12)' : 'rgba(199,242,132,0.10)',
        display: 'grid', placeItems: 'center',
        color: danger ? 'var(--negative)' : 'var(--accent)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: danger ? 'var(--negative)' : 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </button>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={15} style={{ color: 'var(--text-3)' }} />
            <h2>Configurações</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-form" style={{ gap: 20 }}>
          {/* Account */}
          <div>
            <SectionLabel>Conta</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--chip)', borderRadius: 10 }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Conta ativa</div>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <SectionLabel>Privacidade</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SettingRow
                icon={<Shield size={16} />}
                title="Política de Privacidade"
                subtitle="Como seus dados são usados (LGPD)"
                onClick={() => setShowPrivacy(true)}
              />
              <SettingRow
                icon={<Download size={16} />}
                title="Exportar meus dados"
                subtitle={exporting ? 'Gerando arquivo...' : 'Baixar JSON com todos os seus dados'}
                onClick={handleExport}
                disabled={exporting}
              />
            </div>
          </div>

          {/* AI Assistant */}
          <div>
            <SectionLabel>Assistente de IA</SectionLabel>
            <SettingRow
              icon={<BotIcon size={16} />}
              title="Ativar Assistente de IA"
              subtitle={enabled ? 'Ativado — chat disponível' : 'Desativado por padrão'}
              onClick={handleToggle}
              right={
                <div className={`toggle-track${enabled ? ' on' : ''}`} style={{ flexShrink: 0 }}>
                  <div className="toggle-thumb" />
                </div>
              }
            />
            {enabled && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,192,74,0.08)', border: '1px solid rgba(255,192,74,0.2)', borderRadius: 8, marginTop: 8, fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>
                <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                Com o assistente ativado, um <strong>resumo financeiro</strong> é enviado a uma IA externa (Groq/Llama). Nenhum dado pessoal identificável é transmitido.
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div>
            <SectionLabel danger>Zona de Perigo</SectionLabel>
            <SettingRow
              icon={<Trash2 size={16} />}
              title="Deletar minha conta"
              subtitle="Remove permanentemente todos os seus dados"
              onClick={() => setShowDeleteConfirm(true)}
              danger
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
          <button type="button" className="btn primary" style={{ flex: 1, justifyContent: 'center', opacity: (!changed || saving) ? 0.5 : 1 }} onClick={handleSave} disabled={saving || !changed}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* AI consent sub-modal */}
      {showConsent && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2>Ativar Assistente de IA?</h2>
              <button className="icon-btn" onClick={() => setShowConsent(false)}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'rgba(255,192,74,0.08)', border: '1px solid rgba(255,192,74,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
                <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--warn)' }} />
                <span>Ao ativar, um <strong>resumo dos seus dados financeiros</strong> será enviado ao modelo <strong>Llama 3.3</strong> da Groq a cada mensagem. <strong>Não são transmitidos</strong> dados pessoais como nome, CPF ou senhas.</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowConsent(false)}>Cancelar</button>
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleAcceptConsent}>Entendi e aceito</button>
            </div>
          </div>
        </div>
      )}

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {/* Delete confirm sub-modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2 style={{ color: 'var(--negative)' }}>Deletar conta permanentemente?</h2>
              <button className="icon-btn" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55 }}>
                Essa ação é <strong style={{ color: 'var(--text)' }}>irreversível</strong>. Todos os seus dados serão removidos: transações, categorias, projetos, cartões e conta de acesso.
              </p>
              {deleteError && (
                <div style={{ fontSize: 12.5, color: 'var(--negative)', background: 'rgba(255,122,90,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} disabled={deleting}>Cancelar</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent', opacity: deleting ? 0.6 : 1 }} onClick={handleDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deletando...' : 'Sim, deletar tudo'}
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

        {/* Download APK */}
        <a
          href="#"
          onClick={e => e.preventDefault()}
          title="Baixar app Android (em breve)"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 14px', margin: '4px 0 2px', borderRadius: 10,
            color: 'var(--text-3)', fontSize: 12.5, textDecoration: 'none',
            transition: 'background 120ms, color 120ms',
            cursor: 'default',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--chip)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <span className="nav-icon" style={{ color: 'inherit' }}>
            <Smartphone size={15} />
          </span>
          <span>Baixar app Android</span>
        </a>

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
