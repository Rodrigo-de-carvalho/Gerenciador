import { Loader2 } from 'lucide-react';

// Placeholder simples de carregamento, usado na 1ª carga sem cache (quando o
// FinanceContext ainda está com loading=true). Reaproveita o Loader2 já usado
// em Assistant/Projects e o keyframe global `spin` (index.css). Evita o "flash"
// do estado vazio/onboarding enquanto os dados reais ainda não chegaram.
export default function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 20px', color: 'var(--text-4)',
    }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}
