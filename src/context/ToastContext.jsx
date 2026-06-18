import { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * Toast simples e global: feedback rápido de sucesso/erro no canto inferior.
 * Uso: const { showToast } = useToast(); showToast('Salvo!');  showToast('Erro', 'error');
 */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2600);
  }, []);

  const icon = (type) => (type === 'error' ? '⚠️' : type === 'delete' ? '🗑️' : '✓');

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <span className="toast-ic">{icon(t.type)}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Retorna um no-op se usado fora do provider, para nunca quebrar a tela.
export const useToast = () => useContext(ToastContext) || { showToast: () => {} };
