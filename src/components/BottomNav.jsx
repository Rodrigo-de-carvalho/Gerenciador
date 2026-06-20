import { LayoutDashboard, ArrowLeftRight, CreditCard, Target } from 'lucide-react';
import { useI18n } from '../i18n';

// Barra de abas fixa do rodapé (só no mobile). Dá acesso de 1 toque às 4 páginas
// mais usadas; o restante continua na sidebar/hambúrguer. Os ícones espelham os
// usados em NAV_MAIN do Layout.jsx pra manter a consistência visual.
const ITEMS = [
  { id: 'dashboard',    Icon: LayoutDashboard },
  { id: 'transactions', Icon: ArrowLeftRight },
  { id: 'cards',        Icon: CreditCard },
  { id: 'goals',        Icon: Target },
];

export default function BottomNav({ currentPage, onNavigate }) {
  const { t } = useI18n();

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {ITEMS.map(({ id, Icon }) => {
        const active = currentPage === id;
        return (
          <button
            key={id}
            type="button"
            className={`bottom-nav-item${active ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} />
            <span className="bottom-nav-label">{t('nav.' + id)}</span>
          </button>
        );
      })}
    </nav>
  );
}
