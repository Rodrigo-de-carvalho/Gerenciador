import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { parseCSVFile, detectBank, parseRows, BANK_LABELS } from '../utils/csvParsers';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';

export default function ImportCSV({ onClose }) {
  const { categories, bulkAddTransactions } = useFinance();
  const [step, setStep]       = useState('upload');
  const [bank, setBank]       = useState(null);
  const [rows, setRows]       = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError]     = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  // Try to match Nubank's built-in category names to user's categories
  const autoCategory = useCallback((hint, type) => {
    if (!hint) return null;
    return categories.find(c => c.type === type && c.name.toLowerCase() === hint.toLowerCase())?.id || null;
  }, [categories]);

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError('Use um arquivo .csv ou .txt exportado pelo seu banco.');
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
          if (!data?.length) { setError('Arquivo vazio ou sem transações.'); return; }

          const headers = meta.fields || Object.keys(data[0] || {});
          const detectedBank = detectBank(headers);

          if (detectedBank === 'unknown') {
            setError('Banco não reconhecido. Suportados: Nubank, Inter e Itaú.');
            return;
          }

          const parsed = parseRows(detectedBank, data).map(r => ({
            ...r,
            categoryId: autoCategory(r.categoryHint, r.type),
          }));

          if (!parsed.length) {
            setError('Nenhuma transação extraída. Verifique se o arquivo é um extrato válido.');
            return;
          }

          setBank(detectedBank);
          setRows(parsed);
          setSelected(new Set(parsed.map((_, i) => i)));
          setStep('preview');
        } catch {
          setError('Erro ao processar o arquivo. Tente exportar novamente.');
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
      const toImport = rows.filter((_, i) => selected.has(i));
      const count = await bulkAddTransactions(toImport);
      setImportCount(count);
      setStep('done');
    } catch {
      setError('Erro ao importar. Tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const selCount = selected.size;

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: step === 'preview' ? 700 : 480, transition: 'max-width 200ms' }}>
        <div className="modal-head">
          <h2>{step === 'done' ? 'Importação concluída' : 'Importar extrato CSV'}</h2>
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
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--line-2)'}`,
                  borderRadius: 12, padding: '36px 20px', textAlign: 'center',
                  cursor: 'pointer', background: dragging ? 'rgba(199,242,132,0.05)' : 'var(--chip)',
                  transition: 'border-color 120ms, background 120ms',
                }}
              >
                <Upload size={28} style={{ color: dragging ? 'var(--accent)' : 'var(--text-3)', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>
                  Arraste o arquivo ou{' '}
                  <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>clique para selecionar</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>.csv ou .txt exportado pelo banco</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                onChange={e => processFile(e.target.files[0])} />

              {error && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,122,90,0.08)', border: '1px solid rgba(255,122,90,0.2)', borderRadius: 8, fontSize: 12.5, color: 'var(--negative)', lineHeight: 1.5 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.06em' }}>BANCOS SUPORTADOS</div>
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
                <strong style={{ color: 'var(--text-2)' }}>Como exportar:</strong> no app do banco, acesse Extrato → Exportar → CSV. Para o Itaú, use o internet banking no computador.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
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
                  {rows.length} transações · {selCount} selecionada{selCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={toggleAll}
                  style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  {selCount === rows.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
                </button>
              </div>

              {/* Table */}
              <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--chip)', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '8px 10px', width: 32, textAlign: 'center' }}>
                        <input type="checkbox" checked={selCount === rows.length && rows.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>DATA</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>DESCRIÇÃO</th>
                      <th style={{ padding: '8px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>VALOR</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>TIPO</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>CATEGORIA</th>
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
                              {row.type === 'income' ? 'Entrada' : 'Saída'}
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
                Categorias foram auto-detectadas pelo nome quando possível. Você pode ajustá-las após importar.
              </div>

              {error && (
                <div style={{ fontSize: 12.5, color: 'var(--negative)', background: 'rgba(255,122,90,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" style={{ justifyContent: 'center' }} onClick={() => { setStep('upload'); setError(''); }}>Voltar</button>
              <button
                className="btn primary"
                style={{ flex: 2, justifyContent: 'center', opacity: (selCount === 0 || importing) ? 0.5 : 1 }}
                onClick={handleImport}
                disabled={selCount === 0 || importing}
              >
                {importing ? 'Importando...' : `Importar ${selCount} transaç${selCount !== 1 ? 'ões' : 'ão'}`}
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
                  {importCount} transaç{importCount !== 1 ? 'ões importadas' : 'ão importada'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  Os lançamentos já aparecem na lista de transações.
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
