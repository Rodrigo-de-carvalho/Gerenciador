import { useState } from 'react';
import {
  Settings, X, Shield, Download, Bot as BotIcon,
  ShieldAlert, Trash2, Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useI18n } from '../i18n';
import PrivacyPolicy from './PrivacyPolicy';

// ── Sub-componentes internos ───────────────────────────────────────────────────

function SectionLabel({ children, danger }) {
  return (
    <div className="t-eyebrow" style={{ color: danger ? 'var(--negative)' : 'var(--accent)', marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  );
}

function SettingRow({ icon, title, subtitle, onClick, disabled, danger, right }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        background: 'var(--chip)', border: '1px solid transparent',
        transition: 'background 120ms, border-color 120ms',
        opacity: disabled ? 0.5 : 1, textAlign: 'left', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--chip-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--chip)'; }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: danger ? 'rgba(255,122,90,0.12)' : 'rgba(199,242,132,0.10)',
        display: 'grid', placeItems: 'center',
        color: danger ? 'var(--negative)' : 'var(--accent)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: danger ? 'var(--negative)' : 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </button>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function SettingsModal({ onClose }) {
  const { t, lang, setLang } = useI18n();
  const { user, updateProfile, deleteAccount } = useAuth();
  const { transactions, bulkDeleteTransactions, exportAllData } = useFinance();

  const aiEnabled = user?.user_metadata?.ai_assistant_enabled === true;
  const [enabled, setEnabled]   = useState(aiEnabled);
  const [saving,  setSaving]    = useState(false);

  // sub-modais
  const [showConsent,       setShowConsent]       = useState(false);
  const [showPrivacy,       setShowPrivacy]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // exportar dados
  const [exporting, setExporting] = useState(false);

  // apagar todos os lançamentos
  const [clearAllText,  setClearAllText]  = useState('');
  const [clearingAll,   setClearingAll]   = useState(false);
  const [clearAllError, setClearAllError] = useState('');

  // deletar conta
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState('');

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleToggle       = () => { if (!enabled) setShowConsent(true); else setEnabled(false); };
  const handleAcceptConsent = () => { setEnabled(true); setShowConsent(false); };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ ai_assistant_enabled: enabled });
    setSaving(false);
    onClose();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData();
      const exportData = {
        ...data,
        user: { email: user.email, id: user.id },
        settings: {
          ai_assistant_enabled: user.user_metadata?.ai_assistant_enabled ?? false,
          terms_accepted_at:    user.user_metadata?.terms_accepted_at    ?? null,
        },
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `meus-dados-financeiros-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    setClearAllError('');
    try {
      const ids = transactions.map(tx => tx.id);
      if (ids.length > 0) await bulkDeleteTransactions(ids);
      setShowClearAllConfirm(false);
      setClearAllText('');
    } catch (e) {
      setClearAllError(e.message || 'Erro ao apagar. Tente novamente.');
    } finally {
      setClearingAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    const { error } = await deleteAccount();
    if (error) { setDeleteError(error); setDeleting(false); }
  };

  const changed = enabled !== aiEnabled;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={15} style={{ color: 'var(--text-3)' }} />
            <h2>{t('settings.title')}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-form" style={{ gap: 20 }}>
          {/* Conta */}
          <div>
            <SectionLabel>{t('settings.account')}</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--chip)', borderRadius: 10 }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{t('settings.activeAccount')}</div>
              </div>
            </div>
          </div>

          {/* Privacidade */}
          <div>
            <SectionLabel>{t('settings.privacy')}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SettingRow
                icon={<Shield size={16} />}
                title={t('settings.privacyPolicyTitle')}
                subtitle={t('settings.privacyPolicySubtitle')}
                onClick={() => setShowPrivacy(true)}
              />
              <SettingRow
                icon={<Download size={16} />}
                title={t('settings.exportMyData')}
                subtitle={exporting ? t('settings.exportingEllipsis') : t('settings.exportSubtitle')}
                onClick={handleExport}
                disabled={exporting}
              />
            </div>
          </div>

          {/* Assistente de IA */}
          <div>
            <SectionLabel>{t('settings.aiAssistant')}</SectionLabel>
            <SettingRow
              icon={<BotIcon size={16} />}
              title={t('settings.enableAI')}
              subtitle={enabled ? t('settings.aiEnabled') : t('settings.aiDisabled')}
              onClick={handleToggle}
              right={
                <div className={`toggle-track${enabled ? ' on' : ''}`} style={{ flexShrink: 0 }}>
                  <div className="toggle-thumb" />
                </div>
              }
            />
            {enabled && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,192,74,0.08)', border: '1px solid rgba(255,192,74,0.2)', borderRadius: 8, marginTop: 8, fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>
                <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                {t('settings.aiWarning')}
              </div>
            )}
          </div>

          {/* Idioma */}
          <div>
            <SectionLabel>{t('settings.language')}</SectionLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { code: 'pt', label: '🇧🇷 PT' },
                { code: 'en', label: '🇺🇸 EN' },
                { code: 'es', label: '🇪🇸 ES' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                    background: lang === code ? 'var(--accent)' : 'var(--chip)',
                    color: lang === code ? 'var(--accent-ink)' : 'var(--text-2)',
                    border: '1px solid',
                    borderColor: lang === code ? 'var(--accent)' : 'var(--line)',
                    transition: 'all 120ms',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Zona de perigo */}
          <div>
            <SectionLabel danger>{t('settings.dangerZone')}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SettingRow
                icon={<Trash2 size={16} />}
                title="Apagar todos os lançamentos"
                subtitle={`Zera o histórico financeiro (${transactions.length} lançamento${transactions.length !== 1 ? 's' : ''}). Categorias e projetos são mantidos.`}
                onClick={() => { setShowClearAllConfirm(true); setClearAllText(''); setClearAllError(''); }}
                danger
              />
              <SettingRow
                icon={<Trash2 size={16} />}
                title={t('settings.deleteAccount')}
                subtitle={t('settings.deleteAccountSubtitle')}
                onClick={() => setShowDeleteConfirm(true)}
                danger
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>{t('common.cancel')}</button>
          <button
            type="button"
            className="btn primary"
            style={{ flex: 1, justifyContent: 'center', opacity: (!changed || saving) ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={saving || !changed}
          >
            {saving ? t('common.savingEllipsis') : t('common.save')}
          </button>
        </div>
      </div>

      {/* Sub-modal: consentimento da IA */}
      {showConsent && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2>{t('settings.enableAITitle')}</h2>
              <button className="icon-btn" onClick={() => setShowConsent(false)}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'rgba(255,192,74,0.08)', border: '1px solid rgba(255,192,74,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
                <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--warn)' }} />
                <span>{t('settings.enableAIConsent')}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowConsent(false)}>{t('common.cancel')}</button>
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleAcceptConsent}>{t('settings.understood')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: política de privacidade */}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {/* Sub-modal: apagar todos os lançamentos */}
      {showClearAllConfirm && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <h2 style={{ color: 'var(--negative)' }}>⚠️ Apagar todos os lançamentos?</h2>
              <button className="icon-btn" onClick={() => { setShowClearAllConfirm(false); setClearAllText(''); }} disabled={clearingAll}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
                Essa ação irá apagar <strong style={{ color: 'var(--negative)' }}>todos os {transactions.length} lançamentos</strong> da sua conta permanentemente. Categorias, cartões, projetos, metas e investimentos <strong style={{ color: 'var(--text)' }}>não serão afetados</strong>.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                Para confirmar, digite <strong style={{ color: 'var(--text)', fontFamily: 'monospace', letterSpacing: 1 }}>CONFIRMAR</strong> abaixo:
              </p>
              <input
                type="text"
                className="field-input"
                placeholder="Digite CONFIRMAR"
                value={clearAllText}
                onChange={e => setClearAllText(e.target.value)}
                disabled={clearingAll}
                maxLength={9}
                autoComplete="off"
                style={{ fontFamily: 'monospace', letterSpacing: 1 }}
              />
              {clearAllError && (
                <div style={{ fontSize: 12.5, color: 'var(--negative)', background: 'rgba(255,122,90,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  {clearAllError}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowClearAllConfirm(false); setClearAllText(''); }} disabled={clearingAll}>Cancelar</button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent', opacity: (clearAllText !== 'CONFIRMAR' || clearingAll) ? 0.4 : 1 }}
                onClick={handleClearAll}
                disabled={clearAllText !== 'CONFIRMAR' || clearingAll}
              >
                {clearingAll
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Apagando…</>
                  : <><Trash2 size={14} /> Apagar tudo</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: deletar conta */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <h2 style={{ color: 'var(--negative)' }}>{t('settings.deleteAccountTitle')}</h2>
              <button className="icon-btn" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}><X size={15} /></button>
            </div>
            <div className="modal-form" style={{ gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55 }}>{t('settings.deleteAccountDesc')}</p>
              {deleteError && (
                <div style={{ fontSize: 12.5, color: 'var(--negative)', background: 'rgba(255,122,90,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} disabled={deleting}>{t('common.cancel')}</button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: 'var(--negative)', color: '#fff', borderColor: 'transparent', opacity: deleting ? 0.6 : 1 }}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 size={14} /> {deleting ? t('common.deletingEllipsis') : t('settings.deleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
