import { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { GoalProvider } from './context/GoalContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivacyProvider } from './context/PrivacyContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Projects from './pages/Projects';
import Cards from './pages/Cards';
import Goals from './pages/Goals';
import Assistant from './pages/Assistant';
import Investments from './pages/Investments';
import PrivacyPolicy from './components/PrivacyPolicy';

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
      <div className="modal-overlay">
        <div className="modal-box" style={{ maxWidth: 460 }}>
          <div className="modal-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={15} style={{ color: 'var(--text-3)' }} />
              <h2>Termos de Uso e Privacidade</h2>
            </div>
          </div>

          <div className="modal-form" style={{ gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              Para usar o Cifra, você precisa concordar com nossa política de privacidade.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Seu e-mail e dados financeiros são armazenados com segurança no Supabase.',
                'Seus dados não são vendidos nem compartilhados com terceiros.',
                'O assistente de IA é opcional e desativado por padrão.',
                'Você pode deletar sua conta e todos os dados a qualquer momento.',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: 'var(--positive)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPrivacy(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12.5, fontFamily: 'inherit', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
            >
              Ler a Política de Privacidade completa →
            </button>
          </div>

          <div className="modal-actions">
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={signOut}>Sair</button>
            <button
              className="btn primary"
              style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Aceito e continuar'}
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 20 }}>
        <div style={{
          width: 52, height: 52,
          background: 'var(--accent)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 42,
          color: 'var(--accent-ink)',
          lineHeight: 1,
          paddingTop: 4,
        }}>c</div>
        <Loader2 size={16} style={{ color: 'var(--text-4)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) return <AuthPage />;

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
      case 'goals':        return <Goals />;
      case 'assistant':    return <Assistant />;
      case 'investments':  return <Investments />;
      default:             return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <FinanceProvider>
      <GoalProvider>
        <PrivacyProvider>
          <Layout currentPage={page} onNavigate={setPage}>
            {renderPage()}
          </Layout>
        </PrivacyProvider>
      </GoalProvider>
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
