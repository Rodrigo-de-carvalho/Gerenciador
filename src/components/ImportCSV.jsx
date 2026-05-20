import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { parseCSVFile, detectBank, parseRows, BANK_LABELS } from '../utils/csvParsers';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { useI18n } from '../i18n';

export default function ImportCSV({ onClose }) {
  const { t } = useI18n();
  const { categories, cards, bulkAddTransactions } = useFinance();
  const [step, setStep]       = useState('upload');
  const [bank, setBank]       = useState(null);
  const [rows, setRows]       = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError]     = useState('');
  const [dragging, setDragging] = useState(false);
  const [cardId, setCardId]   = useState('');
  const fileRef = useRef();

  const CREDIT_CARD_BANKS = ['nubank_credit', 'c6_credit', 'santander_credit'];
  const isCreditCardBank = (b) => CREDIT_CARD_BANKS.includes(b);

  // Try to match Nubank's built-in category names to user's categories
  const autoCategory = useCallback((hint, type) => {
    if (!hint) return null;
    return categories.find(c => c.type === type && c.name.toLowerCase() === hint.toLowerCase())?.id || null;
  }, [categories]);

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError(t('importCSV.errBadFormat'));
      return;
    }
    setError('');

    const read = (encoding) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        // If UTF-8 has replacement chars, retry with latin1
        if (encoding === 'UTF-8' && text.includes('�')) {
          read('ISO-8859-1');
          return;
        }
        try {
          const { data, meta } = parseCSVFile(text);
          if (!data?.length) { setError(t('importCSV.errEmpty')); return; }

          const headers = meta.fields || Object.keys(data[0] || {});
          const detectedBank = detectBank(headers);

          if (detectedBank === 'unknown') {
            setError(t('importCSV.errUnknownBank'));
            return;
          }

          const parsed = parseRows(detectedBank, data).map(r => ({
            ...r,
            categoryId: autoCategory(r.categoryHint, r.type),
          }));

          if (!parsed.length) {
            setError(t('importCSV.errNoTransactions'));
            return;
          }

          setBank(detectedBank);
          setRows(parsed);
          setSelected(new Set(parsed.map((_, i) => i)));
          setStep('preview');
        } catch {
          setError(t('importCSV.errProcessing'));
        }
      };
      reader.readAsText(file, encoding);
    };
    read('UTF-8');
  }, [autoCategory]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const toggleRow  = (i) => setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  const toggleAll  = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const resolvedCardId = isCreditCardBank(bank) ? (cardId || null) : null;
      const toImport = rows.filter((_, i) => selected.has(i)).map(r => ({
        ...r,
        cardId: resolvedCardId,
      }));
      const count = await bulkAddTransactions(toImport);
      setImportCount(count);
      setStep('done');
    } catch {
      setError(t('importCSV.errImporting'));
    } finally {
      setImporting(false);
    }
  };

  const selCount = selected.size;

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: step === 'preview' ? 700 : 480, transition: 'max-width 200ms' }}>
        <div className="modal-head">
          <h2>{step === 'done' ? t('importCSV.done') : t('importCSV.title')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <>
            <div className="modal-form" style={{ gap: 16 }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                  position: 'relative',
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--line-2)'}`,
                  borderRadius: 12, padding: '36px 20px', textAlign: 'center',
                  cursor: 'pointer', background: dragging ? 'rgba(199,242,132,0.05)' : 'var(--chip)',
                  transition: 'border-color 120ms, background 120ms',
                }}
              >
                {/* input overlaps the entire area — works on all browsers including iOS/WebView */}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  onChange={e => processFile(e.target.files[0])}
                />
                <Upload size={28} style={{ color: dragging ? 'var(--accent)' : 'var(--text-3)', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>
                  {t('importCSV.dropFile')}{' '}
                  <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{t('importCSV.clickToSelect')}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('importCSV.fileHint')}</div>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,122,90,0.08)', border: '1px solid rgba(255,122,90,0.2)', borderRadius: 8, fontSize: 12.5, color: 'var(--negative)', lineHeight: 1.5 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.06em' }}>{t('importCSV.supportedBanks')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { name: 'Nubank',       hint: 'Fatura (crédito) ou extrato da conta' },
                    { name: 'Inter',        hint: 'Extrato da conta corrente' },
                    { name: 'Itaú',         hint: 'Extrato da conta corrente' },
                    { name: 'Mercado Pago', hint: 'Atividades / extrato da conta' },
                  ].map(b => (
                    <div key={b.name} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'var(--chip)', borderRadius: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>— {b.hint}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-2)' }}>{t('importCSV.howToExport')}</strong> {t('importCSV.howToExportDesc')}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>{t('common.cancel')}</button>
            </div>
          </>
        )}

        {/* ── PREVIEW ── */}
        {step === 'preview' && (
          <>
            <div className="modal-form" style={{ gap: 14 }}>
              {/* Header stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(199,242,132,0.12)', border: '1px solid rgba(199,242,132,0.25)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                  {BANK_LABELS[bank] || bank}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {`${rows.length} ${t('importCSV.transactions')} · ${selCount} ${selCount !== 1 ? t('importCSV.selectedPlural') : t('importCSV.selected')}`}
                </span>
                <button
                  onClick={toggleAll}
                  style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  {selCount === rows.length ? t('importCSV.deselectAll') : t('importCSV.selectAll')}
                </button>
              </div>

              {/* Card selector — only for credit card imports */}
              {isCreditCardBank(bank) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--chip)', borderRadius: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    Vincular ao cartão:
                  </label>
                  <select
                    value={cardId}
                    onChange={e => setCardId(e.target.value)}
                    style={{
                      flex: 1, minWidth: 180,
                      background: 'var(--surface)', color: 'var(--text-1)',
                      border: '1px solid var(--line-2)', borderRadius: 6,
                      padding: '5px 10px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    <option value="">Nenhum (sem vínculo)</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.icon ? `${card.icon} ${card.name}` : card.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Table */}
              <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--chip)', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '8px 10px', width: 32, textAlign: 'center' }}>
                        <input type="checkbox" checked={selCount === rows.length && rows.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{t('importCSV.columnDate')}</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{t('importCSV.columnDesc')}</th>
                      <th style={{ padding: '8px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{t('importCSV.columnValue')}</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{t('importCSV.columnType')}</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{t('importCSV.columnCategory')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const isSel = selected.has(i);
                      const cat   = categories.find(c => c.id === row.categoryId);
                      return (
                        <tr
                          key={i}
                          onClick={() => toggleRow(i)}
                          style={{
                            cursor: 'pointer', opacity: isSel ? 1 : 0.38,
                            borderTop: '1px solid var(--line)',
                            transition: 'opacity 100ms',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--chip)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <td style={{ padding: '7px 10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleRow(i)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '7px 8px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: 12 }}>{row.date}</td>
                          <td style={{ padding: '7px 8px', maxWidth: 240 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{row.description}</div>
                          </td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: row.type === 'income' ? 'var(--positive)' : 'var(--negative)' }}>
                            {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount)}
                          </td>
                          <td style={{ padding: '7px 8px' }}>
                            <span style={{
                              fontSize: 11.5, padding: '2px 7px', borderRadius: 4,
                              background: row.type === 'income' ? 'rgba(199,242,132,0.1)' : 'rgba(255,122,90,0.1)',
                              color: row.type === 'income' ? 'var(--positive)' : 'var(--negative)',
                            }}>
                              {row.type === 'income' ? t('importCSV.incomeType') : t('importCSV.expenseType')}
                            </span>
                          </td>
                          <td style={{ padding: '7px 8px', fontSize: 12, color: cat ? 'var(--text-2)' : 'var(--text-3)' }}>
                            {cat ? `${cat.icon} ${cat.name}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
                {t('importCSV.autoDetectedCategories')}
              </div>

              {error && (
                <div style={{ fontSize: 12.5, color: 'var(--negative)', background: 'rgba(255,122,90,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ justifyContent: 'center' }} onClick={() => { setStep('upload'); setError(''); }}>{t('importCSV.back')}</button>
              <button
                className="btn primary"
                style={{ flex: 2, justifyContent: 'center', opacity: (selCount === 0 || importing) ? 0.5 : 1 }}
                onClick={handleImport}
                disabled={selCount === 0 || importing}
              >
                {importing ? t('common.importingEllipsis') : t('importCSV.importFn')(selCount)}
              </button>
            </div>
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <>
            <div className="modal-form" style={{ alignItems: 'center', textAlign: 'center', padding: '12px 0 20px', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(199,242,132,0.1)', border: '1px solid rgba(199,242,132,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={26} style={{ color: 'var(--positive)' }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  {t('importCSV.importedFn')(importCount)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  {t('importCSV.importedDesc')}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                Ver transações
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
