import { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Projects from './pages/Projects';
import Cards from './pages/Cards';
import Assistant from './pages/Assistant';
import PrivacyPolicy from './components/PrivacyPolicy';

// Shown to any user who hasn't accepted the terms yet (e.g. Google SSO first login,
// or users who registered before the terms were added).
function TermsConsentModal() {
  const { acceptTerms, signOut } = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    await acceptTerms();
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">Termos de Uso e Privacidade</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Leitura obrigatória antes de continuar</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mb-6">
            <p>Para usar o Gerenciador Financeiro, você precisa concordar com nossa política de privacidade.</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>Seu e-mail e dados financeiros são armazenados com segurança no Supabase.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>Seus dados <strong>não são vendidos</strong> nem compartilhados com terceiros.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>O assistente de IA é opcional e desativado por padrão.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>Você pode deletar sua conta e todos os dados a qualquer momento.</span>
              </li>
            </ul>
            <button
              onClick={() => setShowPrivacy(true)}
              className="text-blue-600 dark:text-blue-400 text-xs underline hover:no-underline"
            >
              Ler a Política de Privacidade completa →
            </button>
          </div>

          <div className="flex gap-3">
            <button
              className="btn-secondary flex-1 justify-center"
              onClick={signOut}
            >
              Sair
            </button>
            <button
              className="btn-primary flex-1 justify-center"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aceito e continuar'}
            </button>
          </div>
        </div>
      </div>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Block access until terms are accepted — covers Google SSO first login
  if (!user.user_metadata?.terms_accepted_at) {
    return <TermsConsentModal />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard onNavigate={setPage} />;
      case 'transactions': return <Transactions />;
      case 'reports':      return <Reports />;
      case 'categories':   return <Categories />;
      case 'projects':     return <Projects />;
      case 'cards':        return <Cards />;
      case 'assistant':    return <Assistant />;
      default:             return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <FinanceProvider>
      <Layout currentPage={page} onNavigate={setPage}>
        {renderPage()}
      </Layout>
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
