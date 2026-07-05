import { LayoutDashboard, ArrowLeftRight, Target, User, Plus } from 'lucide-react';
import { useI18n } from '../i18n';

// Barra de abas fixa do rodapé (só no mobile): Painel | Transações | + | Metas | Perfil.
// O botão central roxo abre o Novo Lançamento (substitui o antigo FAB flutuante)
// e o Perfil abre as configurações da conta.
const LEFT_ITEMS = [
  { id: 'dashboard',    Icon: LayoutDashboard },
  { id: 'transactions', Icon: ArrowLeftRight },
];
const RIGHT_ITEMS = [
  { id: 'goals', Icon: Target },
];

export default function BottomNav({ currentPage, onNavigate, onAdd, onProfile }) {
  const { t } = useI18n();

  const renderItem = ({ id, Icon }) => {
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
  };

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {LEFT_ITEMS.map(renderItem)}

      <button
        type="button"
        className="bottom-nav-add"
        onClick={onAdd}
        aria-label={t('transactionModal.new')}
        title={t('transactionModal.new')}
      >
        <span className="bottom-nav-add-circle">
          <Plus size={26} />
        </span>
      </button>

      {RIGHT_ITEMS.map(renderItem)}

      <button
        type="button"
        className="bottom-nav-item"
        onClick={onProfile}
      >
        <User size={20} />
        <span className="bottom-nav-label">{t('nav.profile')}</span>
      </button>
    </nav>
  );
}
