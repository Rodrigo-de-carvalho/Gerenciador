import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getCurrentMonthYear } from '../utils/formatters';
import { useI18n } from '../i18n';

// Normaliza vírgula→ponto e descarta valores inválidos/negativos, no mesmo
// espírito da normalização do campo de valor do TransactionModal.
const parseAmount = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) || n < 0 ? 0 : n;
};

// Faixas da regra 50/30/20. As cores reaproveitam variáveis já existentes na
// paleta (:root em index.css): nenhuma cor nova é introduzida.
const SPLITS = [
  { pct: 0.5, label: 'needs',   desc: 'needsDesc',   color: 'var(--accent)',   badge: '50%' },
  { pct: 0.3, label: 'wants',   desc: 'wantsDesc',   color: 'var(--info)',     badge: '30%' },
  { pct: 0.2, label: 'savings', desc: 'savingsDesc', color: 'var(--positive)', badge: '20%' },
];

const TIPS = [
  { emoji: '⚖️', key: 'tip1' },
  { emoji: '📝', key: 'tip2' },
  { emoji: '💰', key: 'tip3' },
  { emoji: '🛟', key: 'tip4' },
  { emoji: '💳', key: 'tip5' },
  { emoji: '🤔', key: 'tip6' },
];

export default function FinanceEducation() {
  const { t } = useI18n();
  const { getSummary } = useFinance();
  const now = getCurrentMonthYear();

  // Reaproveita a MESMA lógica do Dashboard (getSummary) pra somar as receitas
  // do mês atual — sem duplicar filtro de datas aqui.
  const monthIncome = getSummary(now.month, now.year).income;
  const [income, setIncome] = useState(monthIncome ? String(monthIncome) : '');

  const value = parseAmount(income);

  return (
    <div>
      {/* ── Calculadora 50/30/20 ── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="t-eyebrow">{t('financeEducation.calcTitle')}</div>
        <h3 className="t-display" style={{ fontSize: 22, marginTop: 4, marginBottom: 4 }}>50 / 30 / 20</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 18px' }}>
          {t('financeEducation.calcSubtitle')}
        </p>

        <div className="field" style={{ maxWidth: 280, marginBottom: 18 }}>
          <label className="field-label">{t('financeEducation.incomeLabel')}</label>
          <input
            type="text"
            inputMode="decimal"
            className="field-input"
            placeholder="0,00"
            value={income}
            onChange={e => setIncome(e.target.value)}
            onBlur={e => {
              const v = e.target.value.replace(',', '.');
              if (!isNaN(parseFloat(v)) && parseFloat(v) >= 0) setIncome(v);
            }}
          />
        </div>

        <div className="grid-cifra g-3">
          {SPLITS.map(s => (
            <div
              key={s.label}
              className="card"
              style={{
                padding: '16px 18px',
                borderColor: s.color,
                background: `color-mix(in oklab, ${s.color} 7%, var(--surface))`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color, fontFamily: 'Geist Mono, monospace' }}>{s.badge}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t('financeEducation.' + s.label)}</span>
              </div>
              <div className="t-num" style={{ fontSize: 22, fontWeight: 600, color: s.color }}>
                {formatCurrency(value * s.pct)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.4 }}>
                {t('financeEducation.' + s.desc)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dicas financeiras ── */}
      <div style={{ marginBottom: 4 }}>
        <div className="t-eyebrow">{t('financeEducation.tipsTitle')}</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '6px 0 16px' }}>
          {t('financeEducation.tipsSubtitle')}
        </p>
      </div>
      <div className="grid-cifra g-3">
        {TIPS.map(tip => (
          <div key={tip.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 26 }}>{tip.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t('financeEducation.' + tip.key + 'Title')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{t('financeEducation.' + tip.key + 'Text')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
