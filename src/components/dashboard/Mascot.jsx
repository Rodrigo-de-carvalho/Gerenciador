// REGRA 5 — Mascote (raposinha) que muda de expressão conforme a Ofensiva:
//   • 0 dias  → dormindo (olhos fechados + "z z z")
//   • 1–2 dias → acordado/neutro (olhos abertos, sorriso discreto)
//   • 3+ dias  → feliz (olhos ^ ^, sorriso grande, bochechas rosadas, brilho)
// Fica no canto superior direito do cabeçalho (ver DashHeader).
export default function Mascot({ streak = 0, size = 46 }) {
  const mood = streak >= 3 ? 'happy' : streak >= 1 ? 'awake' : 'asleep';

  return (
    <svg
      className={`mascot mascot-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={
        mood === 'happy' ? 'Raposinha feliz' :
        mood === 'awake' ? 'Raposinha acordada' : 'Raposinha dormindo'
      }
    >
      {/* Orelhas */}
      <path d="M14 21 L9 5 L27 15 Z" fill="#F97316" />
      <path d="M50 21 L55 5 L37 15 Z" fill="#F97316" />
      <path d="M15 18 L12 8 L23 15 Z" fill="#FDBA74" />
      <path d="M49 18 L52 8 L41 15 Z" fill="#FDBA74" />

      {/* Cabeça */}
      <path d="M32 12 C46 12 54 22 54 34 C54 47 44 55 32 55 C20 55 10 47 10 34 C10 22 18 12 32 12 Z" fill="#F97316" />

      {/* Focinho branco */}
      <path d="M32 29 C41 29 47 36 47 43 C47 51 40 55 32 55 C24 55 17 51 17 43 C17 36 23 29 32 29 Z" fill="#FFF7ED" />

      {/* Nariz */}
      <circle cx="32" cy="40" r="3" fill="#334155" />

      {mood === 'asleep' && (
        <>
          {/* Olhos fechados (arcos) */}
          <path d="M20 30 q4 3 8 0" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M36 30 q4 3 8 0" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* z z z — soninho */}
          <text x="50" y="16" fontSize="9" fontWeight="700" fill="#8B5CF6">z</text>
          <text x="55" y="10" fontSize="7" fontWeight="700" fill="#8B5CF6">z</text>
        </>
      )}

      {mood === 'awake' && (
        <>
          {/* Olhos abertos */}
          <circle cx="24" cy="30" r="2.6" fill="#334155" />
          <circle cx="40" cy="30" r="2.6" fill="#334155" />
          {/* Sorriso discreto */}
          <path d="M28 45 q4 3 8 0" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}

      {mood === 'happy' && (
        <>
          {/* Olhos felizes ^ ^ */}
          <path d="M20 31 q4 -5 8 0" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M36 31 q4 -5 8 0" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          {/* Bochechas rosadas */}
          <circle cx="22" cy="40" r="3" fill="#FB7185" opacity="0.55" />
          <circle cx="42" cy="40" r="3" fill="#FB7185" opacity="0.55" />
          {/* Sorriso grande */}
          <path d="M26 45 q6 6 12 0" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          {/* Brilho de comemoração */}
          <path d="M52 24 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z" fill="#34D399" />
        </>
      )}
    </svg>
  );
}
