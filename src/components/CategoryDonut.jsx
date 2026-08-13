import { formatCurrency } from '../utils/formatters';
import { useI18n } from '../i18n';

export default function CategoryDonut({ data, total, privacy, totalLabel, size = 150 }) {
  const { t } = useI18n();

  // Acumula sem mutar variável durante o render (regra react-hooks/immutability).
  const stops = data.reduce((res, d) => {
    const start = total > 0 ? (res.acc / total) * 360 : 0;
    const acc = res.acc + d.value;
    const end = total > 0 ? (acc / total) * 360 : 0;
    return { acc, parts: [...res.parts, `${d.color} ${start}deg ${end}deg`] };
  }, { acc: 0, parts: [] }).parts.join(', ');

  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
      >
        <div className="donut-center">
          <div>
            <span>{totalLabel || t('common.total')}</span>
            <b>{privacy ? '••••' : formatCurrency(total)}</b>
          </div>
        </div>
      </div>
      <div className="legend">
        {data.slice(0, 6).map(d => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} className="legend-item">
              <span className="lg-dot" style={{ background: d.color }} />
              <span className="lg-name">{d.icon ? `${d.icon} ` : ''}{d.name}</span>
              <span className="lg-val">{privacy ? '••••' : formatCurrency(d.value)}</span>
              <span className="lg-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
