export default function SavingsRing({ pct, size = 120, stroke = 12, message }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = pct >= 20 ? 'var(--positive)' : pct >= 0 ? 'var(--accent)' : 'var(--negative)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div className="ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
          <circle
            className="ring-fg" cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          />
        </svg>
        <span className="ring-label" style={{ fontSize: size > 100 ? 18 : 13 }}>{pct}%</span>
      </div>
      {message && (
        <p style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.5, color: 'var(--text-3)', margin: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
