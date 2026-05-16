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

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signInWithGoogle = () => {
    // No WebView Android (CifraApp interface injetada pelo MainActivity), usa
    // o custom scheme cifra://callback para que o Chrome Custom Tab sempre
    // retorne para o app via onNewIntent sem depender do App Link (assetlinks.json).
    // No browser normal usa a origem HTTPS padrão.
    const isCifraApp = typeof window.CifraApp !== 'undefined';
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: isCifraApp ? 'cifra://callback' : window.location.origin },
    });
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
