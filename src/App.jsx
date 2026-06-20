import { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { GoalProvider } from './context/GoalContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { ToastProvider } from './context/ToastContext';
import { I18nProvider, useI18n } from './i18n';
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
import FinanceEducation from './pages/FinanceEducation';
import PrivacyPolicy from './components/PrivacyPolicy';

function TermsConsentModal() {
  const { acceptTerms, signOut } = useAuth();
  const { t } = useI18n();
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
              <h2>{t('terms.title')}</h2>
            </div>
          </div>

          <div className="modal-form" style={{ gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              {t('terms.intro')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                t('terms.bullet1'),
                t('terms.bullet2'),
                t('terms.bullet3'),
                t('terms.bullet4'),
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
              {t('terms.readPolicy')}
            </button>
          </div>

          <div className="modal-actions">
            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={signOut}>{t('terms.leave')}</button>
            <button
              className="btn primary"
              style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : t('terms.accept')}
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
          width: 56, height: 56,
          background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 12px 28px -10px color-mix(in oklab, var(--accent) 70%, transparent)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32" aria-hidden="true">
            <path d="M16.8 7.4a6.6 6.6 0 1 0 .2 9.1" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="17.4" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
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
      case 'financeEducation': return <FinanceEducation />;
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
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
