import Papa from 'papaparse';

// ── helpers ────────────────────────────────────────────────

function norm(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function parseAmount(str) {
  if (str === null || str === undefined || str === '') return null;
  let s = String(str).trim().replace(/[R$\s]/g, '');
  // Brazilian format: 1.234,56 → 1234.56
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function parseDateBR(str) {
  if (!str) return null;
  str = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{2}/.test(str)) {
    const [d, m, y] = str.split('/');
    return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function findKey(obj, ...candidates) {
  const keys = Object.keys(obj);
  for (const cand of candidates) {
    const found = keys.find(k => norm(k).includes(norm(cand)));
    if (found) return found;
  }
  return null;
}

// ── public ─────────────────────────────────────────────────

export function parseCSVFile(text) {
  const firstLine = text.split('\n')[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  return Papa.parse(text.trim(), {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: h => h.trim().replace(/^﻿/, ''), // strip BOM
  });
}

export function detectBank(headers) {
  const h = headers.map(norm);
  const has = (...words) => words.every(w => h.some(k => k.includes(w)));
  const any = (...words) => words.some(w => h.some(k => k.includes(w)));

  if (has('titulo') && has('valor')) return 'nubank_credit';          // Nubank fatura (com ou sem coluna Categoria/Hora)
  if (has('identificador') && has('valor') && any('descricao', 'descri')) return 'nubank_conta';
  if (has('lancamento') && has('tipo') && has('valor') && !has('historico')) return 'c6_credit';
  if (any('estabelecimento', 'parcelas') && has('data') && has('valor')) return 'santander_credit';
  if (any('lancamento') && any('historico')) return 'inter';
  if (has('historico') && any('credito', 'cred') && any('debito', 'deb')) return 'itau';
  if (has('historico') && has('valor')) return 'inter'; // Inter fallback
  if (any('tipo') && any('descri', 'descricao') && has('valor') && !any('historico', 'titulo')) return 'mercadopago';
  return 'unknown';
}

export const BANK_LABELS = {
  nubank_credit:    'Nubank — Fatura',
  nubank_conta:     'Nubank — Conta',
  inter:            'Banco Inter',
  itau:             'Itaú',
  mercadopago:      'Mercado Pago',
  c6_credit:        'C6 Bank — Fatura',
  santander_credit: 'Santander — Fatura',
  unknown:          'Banco desconhecido',
};

export function parseRows(bank, data) {
  switch (bank) {

    case 'nubank_credit': {
      return data.map(r => {
        const dateKey   = findKey(r, 'data');
        const titleKey  = findKey(r, 'titulo', 'title', 'descri', 'descr');
        const catKey    = findKey(r, 'categoria', 'category');
        const valKey    = findKey(r, 'valor', 'value', 'amount');
        const amount    = parseAmount(valKey ? r[valKey] : null);
        if (amount === null) return null;
        return {
          date:         parseDateBR(dateKey ? r[dateKey] : null),
          description:  String(titleKey ? r[titleKey] : '-').trim(),
          categoryHint: catKey ? String(r[catKey]).trim() : '',
          amount:       Math.abs(amount),
          type:         amount >= 0 ? 'expense' : 'income',
        };
      }).filter(r => r && r.date && r.amount > 0);
    }

    case 'nubank_conta':
      return data.map(r => {
        const amount = parseAmount(r['Valor'] || r['valor']);
        if (amount === null) return null;
        const descKey = findKey(r, 'descri', 'titulo', 'hist');
        return {
          date:         parseDateBR(r['Data'] || r['data']),
          description:  String(descKey ? r[descKey] : '-').trim(),
          categoryHint: '',
          amount:       Math.abs(amount),
          type:         amount >= 0 ? 'income' : 'expense',
        };
      }).filter(r => r && r.date && r.amount > 0);

    case 'inter': {
      return data.map(r => {
        const dateKey = findKey(r, 'data');
        const histKey = findKey(r, 'historico', 'hist', 'descri');
        const valKey  = findKey(r, 'valor');
        const amount  = parseAmount(valKey ? r[valKey] : null);
        if (amount === null) return null;
        return {
          date:         parseDateBR(dateKey ? r[dateKey] : null),
          description:  String(histKey ? r[histKey] : '-').trim(),
          categoryHint: '',
          amount:       Math.abs(amount),
          type:         amount >= 0 ? 'income' : 'expense',
        };
      }).filter(r => r && r.date && r.amount > 0);
    }

    case 'itau': {
      return data.map(r => {
        const dateKey = findKey(r, 'data');
        const histKey = findKey(r, 'historico', 'hist');
        const credKey = findKey(r, 'credito', 'cred');
        const debKey  = findKey(r, 'debito', 'deb');
        const credit  = credKey ? parseAmount(r[credKey]) : null;
        const debit   = debKey  ? parseAmount(r[debKey])  : null;
        const isIncome = credit !== null && credit > 0;
        const amount   = isIncome ? credit : (debit || 0);
        if (!amount || amount <= 0) return null;
        return {
          date:         parseDateBR(dateKey ? r[dateKey] : null),
          description:  String(histKey ? r[histKey] : '-').trim(),
          categoryHint: '',
          amount,
          type: isIncome ? 'income' : 'expense',
        };
      }).filter(r => r && r.date && r.amount > 0);
    }

    case 'mercadopago': {
      return data.map(r => {
        const dateKey = findKey(r, 'data');
        const descKey = findKey(r, 'descri', 'desc');
        const typeKey = findKey(r, 'tipo');
        const valKey  = findKey(r, 'valor');
        const amount  = parseAmount(valKey ? r[valKey] : null);
        if (amount === null) return null;

        // Prefer sign from amount; fall back to tipo column text
        let type;
        if (amount !== 0) {
          type = amount > 0 ? 'income' : 'expense';
        } else {
          const tipo = norm(String(typeKey ? r[typeKey] : ''));
          type = (tipo.includes('entrada') || tipo.includes('receb') || tipo.includes('credito')) ? 'income' : 'expense';
        }

        return {
          date:         parseDateBR(dateKey ? r[dateKey] : null),
          description:  String(descKey ? r[descKey] : '-').trim(),
          categoryHint: '',
          amount:       Math.abs(amount),
          type,
        };
      }).filter(r => r && r.date && r.amount > 0);
    }

    case 'c6_credit': {
      return data.map(r => {
        const dateKey = findKey(r, 'data');
        const descKey = findKey(r, 'lancamento', 'descri');
        const valKey  = findKey(r, 'valor');
        const amount  = parseAmount(valKey ? r[valKey] : null);
        if (amount === null) return null;
        return {
          date:         parseDateBR(dateKey ? r[dateKey] : null),
          description:  String(descKey ? r[descKey] : '-').trim(),
          categoryHint: '',
          amount:       Math.abs(amount),
          type:         amount >= 0 ? 'expense' : 'income',
        };
      }).filter(r => r && r.date && r.amount > 0);
    }

    case 'santander_credit': {
      return data.map(r => {
        const dateKey = findKey(r, 'data');
        const descKey = findKey(r, 'estabelecimento', 'descri', 'hist');
        const valKey  = findKey(r, 'valor');
        const amount  = parseAmount(valKey ? r[valKey] : null);
        if (amount === null) return null;
        return {
          date:         parseDateBR(dateKey ? r[dateKey] : null),
          description:  String(descKey ? r[descKey] : '-').trim(),
          categoryHint: '',
          amount:       Math.abs(amount),
          type:         amount >= 0 ? 'expense' : 'income',
        };
      }).filter(r => r && r.date && r.amount > 0);
    }

    default:
      return [];
  }
}
