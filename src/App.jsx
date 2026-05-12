import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard onNavigate={setPage} />;
      case 'transactions': return <Transactions />;
      case 'reports':      return <Reports />;
      case 'categories':   return <Categories />;
      case 'projects':     return <Projects />;
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
