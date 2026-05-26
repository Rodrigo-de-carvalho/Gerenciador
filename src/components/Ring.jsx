/**
 * Componente de anel SVG circular para exibir progresso em %.
 * Usado em: Dashboard (tamanho pequeno) e Goals (tamanho médio).
 */
export default function Ring({ pct, size = 36, thickness = 3, color = 'var(--accent)' }) {
  const r    = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chip-strong)" strokeWidth={thickness} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 4}
        textAnchor="middle" fontSize={10}
        fill="var(--text-3)" fontFamily="Geist Mono, monospace"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
