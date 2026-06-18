import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, FolderOpen, CreditCard, Target,
  Bot, Tags, PieChart, Settings, LogOut, Sun, Moon, Eye, EyeOff,
  Plus, Menu, X, TrendingUp, Smartphone,
} from 'lucide-react';
import TransactionModal from './TransactionModal';
import SettingsModal from './SettingsModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePrivacy } from '../context/PrivacyContext';
import { useFinance } from '../context/FinanceContext';
import { useI18n } from '../i18n';

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


export default function Layout({ currentPage, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFabModal, setShowFabModal] = useState(false);
  const { darkMode, toggleDark } = useTheme();
  const { privacy, setPrivacy } = usePrivacy();
  const { user, signOut } = useAuth();
  const { clearCache } = useFinance();
  const { t } = useI18n();

  const PAGE_TITLES = {
    dashboard:    { title: t('nav.dashboard'),    sub: t('pageSub.dashboard') },
    transactions: { title: t('nav.transactions'), sub: t('pageSub.transactions') },
    projects:     { title: t('nav.projects'),     sub: t('pageSub.projects') },
    cards:        { title: t('nav.cards'),         sub: t('pageSub.cards') },
    goals:        { title: t('nav.goals'),         sub: t('pageSub.goals') },
    investments:  { title: t('nav.investments'),  sub: t('pageSub.investments') },
    assistant:    { title: t('nav.assistant'),    sub: t('pageSub.assistant') },
    categories:   { title: t('nav.categories'),   sub: t('pageSub.categories') },
    reports:      { title: t('nav.reports'),      sub: t('pageSub.reports') },
  };

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
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M16.8 7.4a6.6 6.6 0 1 0 .2 9.1" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="17.4" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
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
        {NAV_MAIN.map(({ id, Icon }) => (
          <button
            key={id}
            className={`nav-item${currentPage === id ? ' active' : ''}`}
            onClick={() => navigate(id)}
          >
            <span className="nav-icon">
              <Icon size={16} />
            </span>
            {t('nav.' + id)}
            {id === 'assistant' && <span className="nav-dot" />}
          </button>
        ))}

        {/* Tools section */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>{t('nav.tools')}</div>
        {NAV_TOOLS.map(({ id, Icon }) => (
          <button
            key={id}
            className={`nav-item${currentPage === id ? ' active' : ''}`}
            onClick={() => navigate(id)}
          >
            <span className="nav-icon">
              <Icon size={16} />
            </span>
            {t('nav.' + id)}
          </button>
        ))}

        {/* Download APK */}
        <a
          href="/downloads/gerenciador-financeiro.apk"
          download="gerenciador-financeiro.apk"
          title="Baixar app Android"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 14px', margin: '4px 0 2px', borderRadius: 10,
            color: 'var(--text-3)', fontSize: 12.5, textDecoration: 'none',
            transition: 'background 120ms, color 120ms',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--chip)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <span className="nav-icon" style={{ color: 'inherit' }}>
            <Smartphone size={15} />
          </span>
          <span>{t('nav.downloadAndroid')}</span>
        </a>

        {/* User card */}
        <button
          type="button"
          className="user-card"
          onClick={() => setShowSettings(true)}
          title="Configurações"
          aria-label={t('settings.configSettings')}
          style={{ width: '100%', border: 'none', background: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
        >
          <div className="avatar">{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('settings.configSettings')}</div>
          </div>
          <Settings size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </button>
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
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('settings.activeAccount')}</div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--chip)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Settings size={14} /> {t('settings.configSettings')}
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); clearCache(); signOut(); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', color: 'var(--negative)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--chip)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={14} /> {t('settings.signOut')}
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
      {showFabModal && <TransactionModal onClose={() => setShowFabModal(false)} />}

      {/* FAB — botão flutuante de adicionar transação (só no mobile) */}
      <button
        className="fab"
        onClick={() => setShowFabModal(true)}
        aria-label="Adicionar transação"
        title="Adicionar transação"
      >
        <Plus size={26} />
      </button>

      {/* Mobile menu button injected via CSS */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: grid !important; }
        }
      `}</style>
    </div>
  );
}
