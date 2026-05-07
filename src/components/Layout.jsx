import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Tags, Menu, X,
  TrendingUp, Wallet
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { id: 'reports', label: 'Relatórios', icon: PieChart },
  { id: 'categories', label: 'Categorias', icon: Tags },
];

export default function Layout({ currentPage, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 shadow-lg
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">Gerenciador</p>
            <p className="text-xs text-slate-400">Financeiro</p>
          </div>
          <button
            className="ml-auto lg:hidden btn-icon"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); setMobileOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${currentPage === id
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }
              `}
            >
              <Icon className={`w-4.5 h-4.5 ${currentPage === id ? 'text-blue-600' : 'text-slate-400'}`} style={{ width: '18px', height: '18px' }} />
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
            <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-xs font-semibold opacity-90">Finanças saudáveis</p>
            <p className="text-[11px] opacity-70 mt-0.5">Acompanhe seu progresso</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden btn-icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-slate-800">
            {navItems.find(n => n.id === currentPage)?.label}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
