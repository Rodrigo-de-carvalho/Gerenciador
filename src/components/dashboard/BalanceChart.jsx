import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts';
import { useI18n } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--line)',
      borderRadius: 12, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>Dia {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.value >= 0 ? 'var(--positive)' : 'var(--negative)', fontFamily: 'Geist Mono, monospace' }}>
          {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

// REGRA 3 — Gráfico de evolução do saldo.
//   • motivational=true (sem trajetória positiva / saldo ≤ 0): NÃO mostra eixos
//     numéricos vazios. Mostra uma linha PONTILHADA ASCENDENTE decorativa com a
//     mensagem "Seu saldo vai subir aqui" — dá esperança em vez de humilhar.
//   • motivational=false: mostra o gráfico de linha real com eixos e tooltip.
export default function BalanceChart({ data, motivational }) {
  const { t } = useI18n();

  return (
    <div className="card balance-chart-card">
      <div className="t-eyebrow" style={{ marginBottom: 4 }}>{t('dashboard.balanceEvolution')}</div>
      <h3 className="t-display balance-chart-title">
        <em style={{ fontStyle: 'italic' }}>{t('dashboard.balanceEvolutionSub')}</em>
      </h3>

      {motivational ? (
        // Estado sem dados: linha pontilhada subindo, sem números fixos nos eixos.
        <div className="chart-empty">
          <svg viewBox="0 0 320 150" width="100%" height="170" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="ce-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Área suave sob a linha */}
            <path
              d="M0 118 C80 108 150 84 220 54 C258 38 296 26 316 18 L320 150 L0 150 Z"
              fill="url(#ce-area)"
            />
            {/* Linha pontilhada ascendente */}
            <path
              d="M4 118 C80 108 150 84 220 54 C258 38 296 26 316 18"
              fill="none" stroke="var(--accent)" strokeWidth="3"
              strokeDasharray="7 9" strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* Pontinha subindo */}
            <circle cx="316" cy="18" r="5.5" fill="var(--accent)" />
          </svg>
          <div className="chart-empty-msg">📈 {t('dashboard.chartEmptyMsg')}</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={54}
              tickFormatter={v => Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${Math.round(v)}`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--line-2)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="saldo" name={t('common.balance')} stroke="var(--accent)" strokeWidth={2.5}
              dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
