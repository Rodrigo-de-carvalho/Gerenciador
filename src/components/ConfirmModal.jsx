import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { friendlyErrorMessage } from '../utils/errorMessages';
import { useI18n } from '../i18n';

/**
 * Modal de confirmação reutilizável para ações destrutivas.
 *
 * Props:
 *   title        — título do modal
 *   message      — texto explicativo (string ou JSX)
 *   confirmLabel — texto do botão de confirmação (padrão: "Excluir")
 *   onConfirm    — função (pode ser async) executada ao confirmar
 *   onClose      — função chamada ao cancelar ou após sucesso
 *   danger       — se true (padrão), botão de confirmação fica vermelho
 *
 * O componente gerencia loading/error internamente.
 * Se onConfirm() resolver sem erro, fecha automaticamente via onClose().
 * Se onConfirm() lançar um erro, exibe a mensagem de erro sem fechar.
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onClose,
  danger = true,
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const cancelRef = useRef(null);

  // Acessibilidade: fecha com Esc e foca o botão Cancelar ao abrir.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    document.addEventListener('keydown', onKey);
    cancelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [loading, onClose]);

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(friendlyErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <h2 style={danger ? { color: 'var(--negative)' } : undefined}>{title}</h2>
          <button className="icon-btn" onClick={onClose} disabled={loading} aria-label="Fechar">
            <X size={15} />
          </button>
        </div>

        <div className="modal-form" style={{ gap: 12 }}>
          {typeof message === 'string'
            ? <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{message}</p>
            : message
          }
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'color-mix(in oklab, var(--negative) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--negative) 30%, transparent)',
              fontSize: 12.5, color: 'var(--negative)',
            }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            ref={cancelRef}
            className="btn"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: danger ? 'var(--negative)' : undefined,
              color: danger ? '#fff' : undefined,
              borderColor: danger ? 'transparent' : undefined,
              opacity: loading ? 0.7 : 1,
            }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Trash2 size={14} />
            }
            {loading ? 'Aguarde…' : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
