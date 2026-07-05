import { useI18n } from '../../i18n';

// REGRA 2 — Termômetro como componente VISUAL: barra VERTICAL com gradiente
// (azul embaixo → vermelho em cima) que enche conforme o nº de lançamentos do
// mês. Começa em 0%. Abaixo, texto dinâmico: "Faça X lançamentos para
// esquentar!". Mede engajamento (hábito de lançar), não dinheiro — por isso
// nunca desanima, mesmo com saldo zerado.
export default function Thermometer({ count = 0, goal = 3 }) {
  const { t } = useI18n();
  const pct = Math.min(100, Math.round((count / goal) * 100));
  const remaining = Math.max(0, goal - count);

  return (
    <div className="card thermo-card">
      <div className="t-eyebrow" style={{ marginBottom: 14 }}>
        🌡️ {t('dashboard.thermoLabel')} · {pct}%
      </div>

      <div className="thermo-v-wrap">
        {/* Barra vertical: trilho + preenchimento (cresce de baixo pra cima) + bulbo */}
        <div className="thermo-v">
          <div className="thermo-v-track">
            <div className="thermo-v-fill" style={{ height: `${pct}%` }} />
          </div>
          <div className="thermo-v-bulb" />
        </div>

        <div className="thermo-v-side">
          <div className="thermo-pct">{pct}%</div>
          <div className="thermo-msg">
            {remaining === 0
              ? t('dashboard.thermoHot')
              : t('dashboard.thermoRemainingFn')(remaining)}
          </div>
        </div>
      </div>
    </div>
  );
}
