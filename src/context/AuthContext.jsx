import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION with the current auth state as soon
    // as you subscribe, then SIGNED_IN after OAuth code exchange completes —
    // this handles all cases without the getSession() race condition where a null
    // result could overwrite a user already set by SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Fallback para WebView Android: quando o Chrome Custom Tab fecha sem deep link
    // (ex.: usuário voltou sem completar o OAuth), tenta recuperar sessão do localStorage
    const handleOAuthResume = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
    };
    window.addEventListener('cifra-oauth-resume', handleOAuthResume);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('cifra-oauth-resume', handleOAuthResume);
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signInWithGoogle = () => {
    // When running inside the Android WebView, redirect to the custom scheme so
    // the OS intercepts it immediately and brings the user back to the app.
    // This avoids relying on App Links / assetlinks.json verification, which
    // breaks if the signing key changes.
    // On web (browser), keep using the origin URL as usual.
    const isAndroidApp = typeof window !== 'undefined' && typeof window.CifraApp !== 'undefined';
    const redirectTo   = isAndroidApp ? 'cifra://callback' : `${window.location.origin}/`;
    return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  };

  const signOut = () => supabase.auth.signOut();

  const updateProfile = async (data) => {
    const { data: updated, error } = await supabase.auth.updateUser({ data });
    if (!error && updated.user) setUser(updated.user);
    return { error };
  };

  const acceptTerms = () =>
    updateProfile({ terms_accepted_at: new Date().toISOString() });

  const deleteAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { error: 'Sessão inválida.' };
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Erro ao deletar conta.' };
      // Limpa dados locais do usuário antes de deslogar
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('cifra_') || key.startsWith('sb-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch { /* ignora erros de storage */ }
      await supabase.auth.signOut();
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, updateProfile, acceptTerms, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
