import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Tags, Menu, X,
  TrendingUp, Wallet, Sun, Moon, FolderOpen, LogOut, Smartphone,
  CreditCard, Bot, Settings, ShieldAlert, ToggleLeft, ToggleRight,
  Trash2, Shield,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PrivacyPolicy from './PrivacyPolicy';

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'transactions', label: 'Lançamentos',   icon: ArrowLeftRight },
  { id: 'reports',      label: 'Relatórios',    icon: PieChart },
  { id: 'projects',     label: 'Projetos',      icon: FolderOpen },
  { id: 'cards',        label: 'Cartões',       icon: CreditCard },
  { id: 'categories',   label: 'Categorias',    icon: Tags },
  { id: 'assistant',    label: 'Assistente IA', icon: Bot },
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

  const handleToggle = () => {
    if (!enabled) {
      setShowConsent(true);
    } else {
      setEnabled(false);
    }
  };

  const handleAcceptConsent = () => {
    setEnabled(true);
    setShowConsent(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ ai_assistant_enabled: enabled });
    setSaving(false);
    onClose();
  };

  const changed = enabled !== aiEnabled;

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    const { error } = await deleteAccount();
    if (error) { setDeleteError(error); setDeleting(false); }
    // on success, signOut() inside deleteAccount redirects automatically
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Configurações</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Account info */}
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

          {/* Privacy */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Privacidade</p>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="w-full flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Política de Privacidade</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Veja como seus dados são usados (LGPD)</p>
              </div>
            </button>
          </div>

          {/* AI Assistant toggle */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Assistente de IA</p>
            <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <Bot className={`w-5 h-5 ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ativar Assistente de IA</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {enabled ? 'Ativado — chat disponível' : 'Desativado por padrão'}
                  </p>
                </div>
                {enabled
                  ? <ToggleRight className="w-7 h-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  : <ToggleLeft className="w-7 h-7 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                }
              </button>

              {enabled && (
                <div className="px-4 pb-4 pt-0">
                  <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      Com o assistente ativado, um <strong>resumo financeiro</strong> (entradas, saídas, categorias e projetos do mês) é enviado a uma IA externa (Groq/Llama) a cada mensagem enviada. Nenhum dado pessoal identificável é transmitido.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Danger zone */}
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Zona de Perigo</p>
            <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Deletar minha conta</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Remove permanentemente todos os seus dados</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary flex-1 justify-center"
            onClick={handleSave}
            disabled={saving || !changed}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Consent dialog */}
      {showConsent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Ativar Assistente de IA?</h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Ao ativar o assistente, um <strong>resumo dos seus dados financeiros</strong> (totais de entradas, saídas, categorias e projetos do mês atual) será enviado ao modelo de linguagem <strong>Llama 3.3</strong> da Groq a cada mensagem.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              <strong>Não são transmitidos</strong> dados pessoais como nome, CPF, senhas ou transações individuais detalhadas. Ao continuar, você concorda com esse processamento.
            </p>

            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1 justify-center"
                onClick={() => setShowConsent(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary flex-1 justify-center"
                onClick={handleAcceptConsent}
              >
                Entendi e aceito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy policy */}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {/* Delete account confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Deletar conta permanentemente?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Essa ação é <strong>irreversível</strong>. Todos os seus dados serão removidos permanentemente:
            </p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 list-disc list-inside mb-4 space-y-0.5">
              <li>Todas as transações</li>
              <li>Categorias personalizadas</li>
              <li>Projetos e cartões</li>
              <li>Sua conta de acesso</li>
            </ul>
            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1 justify-center"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn-danger flex-1 justify-center"
                onClick={handleDelete}
                disabled={deleting}
              >
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
                      onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Configurações
                    </button>
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
