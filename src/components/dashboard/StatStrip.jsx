import { useI18n } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';

// REGRA 4 — Os cards contábeis (Receita / Despesa / Taxa) saem da área principal
// e viram uma barra ROLÁVEL HORIZONTAL, pequena e discreta, no rodapé. Assim a
// tela principal fica ~90% motivacional; os números "de contador" ficam
// disponíveis, mas sem dominar.
export default function StatStrip({ income, expense, savingsRate, privacy }) {
  const { t } = useI18n();

  const items = [
    { icon: '💰', label: t('dashboard.income'),      value: privacy ? 'R$ ••••' : formatCurrency(income),  color: 'var(--positive)' },
    { icon: '💸', label: t('dashboard.expense'),     value: privacy ? 'R$ ••••' : formatCurrency(expense), color: 'var(--negative)' },
    { icon: '📊', label: t('dashboard.savingsRate'), value: `${savingsRate}%`,                              color: 'var(--accent)' },
  ];

  return (
    <div className="stat-strip" role="list" aria-label={t('dashboard.summary')}>
      {items.map((it, i) => (
        <div className="stat-chip" role="listitem" key={i}>
          <span className="stat-chip-ic">{it.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div className="stat-chip-label">{it.label}</div>
            <div className="stat-chip-val" style={{ color: it.color }}>{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
