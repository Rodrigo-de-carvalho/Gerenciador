// Strips HTML tags and trims whitespace — prevents accidental markup in user input.
// React already escapes output, but this keeps data clean in the DB.
export function sanitizeText(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

export function validatePassword(password) {
  if (!password || password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  return null;
}

export function validateAmount(value) {
  const num = parseFloat(String(value).replace(',', '.'));
  if (isNaN(num) || num <= 0) return 'Informe um valor maior que zero.';
  return null;
}

export function validateRequired(value, label = 'Campo') {
  if (!value || String(value).trim() === '') return `${label} é obrigatório.`;
  return null;
}

// Rate limiting stored in localStorage — client-side UX layer.
// Real protection comes from Supabase's server-side rate limiting.
const RATE_KEY = 'auth_rate_limit';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function readRate() {
  try { return JSON.parse(localStorage.getItem(RATE_KEY) || '{"attempts":0,"lockedUntil":0}'); }
  catch { return { attempts: 0, lockedUntil: 0 }; }
}

export function checkRateLimit() {
  const r = readRate();
  if (r.lockedUntil > Date.now()) {
    const mins = Math.ceil((r.lockedUntil - Date.now()) / 60000);
    return `Muitas tentativas. Aguarde ${mins} minuto${mins !== 1 ? 's' : ''}.`;
  }
  return null;
}

export function recordFailedAttempt() {
  const r = readRate();
  const attempts = r.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : r.lockedUntil;
  localStorage.setItem(RATE_KEY, JSON.stringify({ attempts, lockedUntil }));
}

export function resetRateLimit() {
  localStorage.removeItem(RATE_KEY);
}
