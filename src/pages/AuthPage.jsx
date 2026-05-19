import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { validateEmail, validatePassword, checkRateLimit, recordFailedAttempt, resetRateLimit } from '../utils/validation';
import PrivacyPolicy from '../components/PrivacyPolicy';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { t } = useI18n();
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

    const rateLimitError = checkRateLimit();
    if (rateLimitError) { setError(rateLimitError); return; }
    if (!validateEmail(email)) { setError(t('auth.invalidEmail')); return; }
    const passError = validatePassword(password);
    if (passError) { setError(passError); return; }
    if (mode === 'register' && !termsAccepted) {
      setError(t('auth.needTerms'));
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
        setSuccess(t('auth.accountCreated'));
      }
    } catch (err) {
      recordFailedAttempt();
      const msgs = {
        'Invalid login credentials': t('auth.errInvalidCredentials'),
        'Email not confirmed': t('auth.errEmailNotConfirmed'),
        'User already registered': t('auth.errUserAlreadyRegistered'),
        'Password should be at least 6 characters': t('auth.errPasswordTooShort'),
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
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Geist', -apple-system, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--accent)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 38,
            color: 'var(--accent-ink)',
            lineHeight: 1,
            paddingTop: 4,
          }}>
            c
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, letterSpacing: '-0.01em', color: 'var(--text)' }}>
            Cifra
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {t('auth.tagline')}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow)',
        }}>
          {/* Tab switcher */}
          <div className="seg" style={{ width: '100%', marginBottom: 24 }}>
            <button
              type="button"
              style={{ flex: 1, justifyContent: 'center' }}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              style={{ flex: 1, justifyContent: 'center' }}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              {t('auth.createAccount')}
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div className="field">
              <label className="field-label">{t('auth.email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  className="field-input"
                  style={{ paddingLeft: 34 }}
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="field-input"
                  style={{ paddingLeft: 34, paddingRight: 40 }}
                  placeholder={mode === 'register' ? t('auth.passwordPlaceholder') : t('auth.passwordPlaceholderLogin')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 4 }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Terms checkbox (register only) */}
            {mode === 'register' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  required
                  style={{ marginTop: 2, width: 14, height: 14, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                  {t('auth.acceptTerms')}{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}
                  >
                    {t('auth.privacyPolicy')}
                  </button>
                  {'. ' + t('auth.termsNote')}
                </span>
              </label>
            )}

            {/* Error / success */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--negative)', background: 'rgba(255,122,90,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
            {success && (
              <div style={{ fontSize: 12.5, color: 'var(--positive)', background: 'rgba(199,242,132,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14, marginTop: 2, opacity: loading ? 0.6 : 1 }}
            >
              {loading
                ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>{t('auth.or')}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', gap: 10, opacity: googleLoading ? 0.6 : 1 }}
          >
            {googleLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
            {t('auth.continueWithGoogle')}
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-4)' }}>
          {t('auth.footerNote')}{' '}
          <button
            onClick={() => setShowPrivacy(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}
          >
            {t('auth.privacyPolicy')}
          </button>
        </div>
      </div>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
