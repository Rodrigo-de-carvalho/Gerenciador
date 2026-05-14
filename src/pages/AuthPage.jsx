import { useState } from 'react';
import { Wallet, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, checkRateLimit, recordFailedAttempt, resetRateLimit } from '../utils/validation';
import PrivacyPolicy from '../components/PrivacyPolicy';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side rate limit check
    const rateLimitError = checkRateLimit();
    if (rateLimitError) { setError(rateLimitError); return; }

    // Input validation
    if (!validateEmail(email)) { setError('Informe um e-mail válido.'); return; }
    const passError = validatePassword(password);
    if (passError) { setError(passError); return; }
    if (mode === 'register' && !termsAccepted) {
      setError('Você precisa aceitar os termos de uso para criar uma conta.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) throw err;
        resetRateLimit();
      } else {
        const { error: err } = await signUp(email, password);
        if (err) throw err;
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
      }
    } catch (err) {
      recordFailedAttempt();
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
      };
      setError(msgs[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess('');
    setTermsAccepted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Gerenciador Financeiro</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Controle suas finanças com inteligência</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className="input-field pl-9"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-9 pr-10"
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox — required only on registration */}
            {mode === 'register' && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer flex-shrink-0"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  required
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Li e aceito a{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline inline-flex items-center gap-0.5"
                  >
                    Política de Privacidade
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  . Entendo que meus dados financeiros serão armazenados no Supabase e não serão compartilhados com terceiros.
                </span>
              </label>
            )}

            {error && (
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login' ? 'Entrar' : 'Criar conta'
              }
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <GoogleIcon />
            }
            Continuar com Google
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Seus dados ficam seguros e são acessíveis de qualquer dispositivo.{' '}
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-blue-500 underline hover:no-underline"
          >
            Política de Privacidade
          </button>
        </p>
      </div>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
