import { useState, useEffect } from 'react';
import { X, RotateCcw, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useI18n } from '../i18n';
import { getImportHistory, markUndone, removeFromHistory } from '../hooks/useImportHistory';

function fmtDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ImportHistory({ onClose }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { bulkDeleteTransactions } = useFinance();
  const [entries, setEntries] = useState([]);
  const [undoingId, setUndoingId] = useState(null);
  const [errorId, setErrorId] = useState(null);

  useEffect(() => {
    if (user) setEntries(getImportHistory(user.id));
  }, [user]);

  const handleUndo = async (entry) => {
    if (!entry.txIds?.length) return;
    setUndoingId(entry.id);
    setErrorId(null);
    try {
      await bulkDeleteTransactions(entry.txIds);
      markUndone(user.id, entry.id);
      setEntries(getImportHistory(user.id));
    } catch {
      setErrorId(entry.id);
    } finally {
      setUndoingId(null);
    }
  };

  const handleRemove = (entry) => {
    removeFromHistory(user.id, entry.id);
    setEntries(getImportHistory(user.id));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h2>{t('importHistory.title')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={15} /></button>
        </div>

        <div className="modal-form" style={{ gap: 10, maxHeight: 480, overflowY: 'auto' }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 13 }}>{t('importHistory.empty')}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                {t('importHistory.emptyHint')}
              </div>
            </div>
          ) : (
            entries.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: entry.undone ? 'var(--chip)' : 'var(--surface)',
                  border: `1px solid ${entry.undone ? 'var(--line)' : 'var(--line-2)'}`,
                  borderRadius: 10,
                  opacity: entry.undone ? 0.55 : 1,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: entry.undone ? 'var(--chip)' : 'rgba(45,212,167,0.1)',
                  border: `1px solid ${entry.undone ? 'var(--line)' : 'rgba(45,212,167,0.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {entry.undone ? '↩️' : '📥'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                    {entry.bankLabel}
                    {entry.undone && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: 'var(--text-3)', background: 'var(--chip)', padding: '1px 6px', borderRadius: 4 }}>
                        {t('importHistory.undone')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    {entry.count} {t('importHistory.transactions')} · {fmtDate(entry.timestamp)}
                  </div>
                  {errorId === entry.id && (
                    <div style={{ fontSize: 11.5, color: 'var(--negative)', marginTop: 4 }}>
                      {t('importHistory.errUndo')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {entry.undone ? (
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28, color: 'var(--text-3)' }}
                    onClick={() => handleRemove(entry)}
                    title={t('importHistory.removeFromHistory')}
                    aria-label={t('importHistory.removeFromHistory')}
                  >
                    <Trash2 size={12} />
                  </button>
                ) : entry.txIds?.length > 0 ? (
                  <button
                    className="btn"
                    style={{
                      padding: '5px 10px', fontSize: 12, flexShrink: 0,
                      opacity: undoingId === entry.id ? 0.6 : 1,
                    }}
                    onClick={() => handleUndo(entry)}
                    disabled={!!undoingId}
                    title={t('importHistory.undoHintFn')(entry.count)}
                  >
                    {undoingId === entry.id
                      ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      : <RotateCcw size={13} />
                    }
                    {t('importHistory.undo')}
                  </button>
                ) : (
                  <CheckCircle2 size={15} style={{ color: 'var(--positive)', flexShrink: 0 }} />
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
