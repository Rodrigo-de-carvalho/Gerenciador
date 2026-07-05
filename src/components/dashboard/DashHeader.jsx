import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import Mascot from './Mascot';

// REGRA 1 (cabeçalho enxuto) + REGRA 5 (mascote).
// O cabeçalho da tela agora mostra APENAS: sino de notificação, o mês
// ("Julho 2026") e o mascote à direita. Nada de botão "Adicionar" aqui —
// o único CTA de adicionar vive no card Desafio do Mês (ver Dashboard).
// As setinhas ‹ › servem só para navegar entre meses (não são ações de dados).
export default function DashHeader({ monthLabel, streak, onPrev, onNext, onBell }) {
  const { t } = useI18n();
  return (
    <div className="dash-header">
      <button className="dash-bell" onClick={onBell} aria-label={t('dashboard.notifications')}>
        <Bell size={18} />
        <span className="dash-bell-dot" />
      </button>

      <div className="dash-month">
        <button className="dash-month-nav" onClick={onPrev} aria-label="Mês anterior">
          <ChevronLeft size={15} />
        </button>
        <span className="dash-month-label">{monthLabel}</span>
        <button className="dash-month-nav" onClick={onNext} aria-label="Próximo mês">
          <ChevronRight size={15} />
        </button>
      </div>

      <Mascot streak={streak} size={46} />
    </div>
  );
}
