import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Tags, Menu, X,
  TrendingUp, Wallet, Sun, Moon, FolderOpen, LogOut, Smartphone
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { id: 'reports',      label: 'Relatórios',  icon: PieChart },
  { id: 'projects',     label: 'Projetos',    icon: FolderOpen },
  { id: 'categories',   label: 'Categorias',  icon: Tags },
];

function AndroidBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('android_banner_dismissed') === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('android_banner_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
      <Smartphone className="w-4 h-4 flex-shrink-0 opacity-80" />
      <p className="text-xs flex-1 leading-snug">
        <span className="font-semibold">App Android disponível!</span>
        {' '}Acesse suas finanças pelo celular com mais praticidade.
      </p>
      <a
        href="#"
        onClick={e => e.preventDefault()}
        className="flex-shrink-0 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        title="Link será disponibilizado em breve"
      >
        Baixar app
      </a>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Layout({ currentPage, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { darkMode, toggleDark } = useTheme();
  const { user, signOut } = useAuth();

  const userInitial = user?.email?.[0]?.toUpperCase() || '?';
  const userEmail = user?.email || '';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 shadow-lg
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">Gerenciador</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Financeiro</p>
          </div>
          <button
            className="ml-auto lg:hidden btn-icon"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); setMobileOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${currentPage === id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                }
              `}
            >
              <Icon
                className={`${currentPage === id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
                style={{ width: '18px', height: '18px' }}
              />
              {label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
            <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-xs font-semibold opacity-90">Finanças saudáveis</p>
            <p className="text-[11px] opacity-70 mt-0.5">Acompanhe seu progresso</p>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AndroidBanner />

        <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden btn-icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {navItems.find(n => n.id === currentPage)?.label}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn-icon"
              onClick={toggleDark}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition-colors"
                title={userEmail}
              >
                {userInitial}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-10 z-20 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg w-56 py-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{userEmail}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Conta ativa</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); signOut(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
