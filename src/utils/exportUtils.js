import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatMonth } from './formatters';

const pdfSafe = (str) => {
  if (!str) return '';
  return str.replace(/[^\x00-\xFF]/g, '').replace(/\s+/g, ' ').trim();
};

const xlsxSheetName = (str) =>
  (str || 'Dados').replace(/[[\]:*?/\\]/g, '').replace(/[^\x00-\xFF]/g, '').slice(0, 31) || 'Dados';

const C = {
  bg:      [14,  13,  11],
  surface: [26,  24,  21],
  surface2:[33,  30,  26],
  line:    [41,  37,  31],
  accent:  [199, 242, 132],
  text:    [239, 234, 224],
  text2:   [183, 175, 159],
  text3:   [124, 117, 103],
  pos:     [199, 242, 132],
  neg:     [255, 122,  90],
};

const TH = { fillColor: C.surface2, textColor: C.text3, fontStyle: 'bold', fontSize: 7.5, cellPadding: 4 };
const TB = { fillColor: C.surface,  textColor: C.text,  fontSize: 8,   cellPadding: 3.5 };
const TA = { fillColor: C.bg };

// ── PDF helpers ───────────────────────────────────────────

function cifraHeader(doc, title, subtitle) {
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 42, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 4, 42, 'F');
  doc.setFillColor(...C.accent);
  doc.circle(22, 21, 9, 'F');
  doc.setTextColor(...C.bg);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('c', 22, 25.5, { align: 'center' });
  doc.setTextColor(...C.text);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 36, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text3);
  doc.text(subtitle, 36, 26);
  doc.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 196, 26, { align: 'right' });
  doc.setTextColor(...C.text2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('Cifra', 196, 18, { align: 'right' });
}

function cifraKpiCards(doc, cards, y) {
  const gap = 4, cardH = 20, startX = 14, totalW = 182;
  const cardW = (totalW - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    doc.setFillColor(...C.surface2);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    doc.setFillColor(...(card.color || C.accent));
    doc.roundedRect(x, y, 2, cardH, 1, 1, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text3);
    doc.text(card.label, x + 6, y + 7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(card.color || C.text));
    doc.text(card.value, x + 6, y + 15);
  });
}

function sectionTitle(doc, label, y) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text2);
  doc.text(label, 14, y);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(14, y + 2, 196, y + 2);
}

// Draws horizontal category bars; returns Y after last bar
function drawCatBars(doc, catRows, startY) {
  const ROW_H = 9, LABEL_W = 58, BAR_X = 14 + LABEL_W + 3, BAR_MAX_W = 78, AMT_X = BAR_X + BAR_MAX_W + 5;
  const maxVal = catRows.length > 0 ? catRows[0].value : 1;
  catRows.forEach((cat, i) => {
    const y = startY + i * ROW_H;
    const fillW = maxVal > 0 ? Math.max((cat.value / maxVal) * BAR_MAX_W, 0) : 0;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text2);
    const label = cat.name.length > 20 ? cat.name.slice(0, 20) + '...' : cat.name;
    doc.text(label, 14, y + 5.5);
    doc.setFillColor(...C.surface2);
    doc.roundedRect(BAR_X, y + 2, BAR_MAX_W, 4, 1, 1, 'F');
    if (fillW > 0) {
      doc.setFillColor(...C.neg);
      doc.roundedRect(BAR_X, y + 2, fillW, 4, 1, 1, 'F');
    }
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(formatCurrency(cat.value), AMT_X, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text3);
    doc.text(`${(cat.pct * 100).toFixed(0)}%`, 196, y + 5.5, { align: 'right' });
  });
  return startY + catRows.length * ROW_H;
}

function addFooter(doc, title = 'Cifra — Gerenciador Financeiro') {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.surface);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.text3);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 291);
    doc.text(`Pagina ${i} de ${n}`, 196, 291, { align: 'right' });
  }
}

// Only fills background on pages after page 1 (page 1 bg is drawn manually before any content)
const makeBgHook = (doc) => (data) => {
  if (data.pageNumber > 1) {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, 210, 297, 'F');
  }
};

function buildCatExpRows(transactions, categories) {
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const map = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const name = pdfSafe(categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria');
    map[name] = (map[name] || 0) + t.amount;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value]) => ({ name, value, pct: totalExpense > 0 ? value / totalExpense : 0 }));
}

function buildAllCatMap(transactions, categories) {
  const map = {};
  transactions.forEach(t => {
    const cat = pdfSafe(categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria');
    if (!map[cat]) map[cat] = { entrada: 0, saida: 0 };
    if (t.type === 'income') map[cat].entrada += t.amount;
    else map[cat].saida += t.amount;
  });
  return map;
}

function txTableRows(transactions, categories) {
  return [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const cat  = categories.find(c => c.id === t.categoryId);
      const desc = pdfSafe(t.description);
      return [
        formatDate(t.date),
        desc.length > 38 ? desc.slice(0, 38) + '...' : desc,
        pdfSafe(cat?.name || '-'),
        t.type === 'income' ? 'Entrada' : 'Saida',
        formatCurrency(t.amount),
      ];
    });
}

const TX_COLS = {
  0: { cellWidth: 22 },
  1: { cellWidth: 68 },
  2: { cellWidth: 38 },
  3: { cellWidth: 22, halign: 'center' },
  4: { cellWidth: 32, halign: 'right' },
};

function txParseCell(data) {
  if (data.section === 'body' && data.column.index === 3) {
    data.cell.styles.textColor = data.cell.raw === 'Entrada' ? C.pos : C.neg;
    data.cell.styles.fontStyle = 'bold';
  }
  if (data.section === 'body' && data.column.index === 4) {
    data.cell.styles.fontStyle = 'bold';
  }
}

// ── EXCEL ────────────────────────────────────────────────

export function exportToExcel(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const wb = XLSX.utils.book_new();

  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? `${((balance / totalIncome) * 100).toFixed(1)}%` : '0%';

  const catMap = buildAllCatMap(transactions, categories);
  const catRows = Object.entries(catMap).sort((a, b) => (b[1].saida + b[1].entrada) - (a[1].saida + a[1].entrada));

  // ── Aba 1: Resumo
  const wsRes = XLSX.utils.aoa_to_sheet([
    ['RESUMO FINANCEIRO', monthLabel.toUpperCase()],
    [],
    ['INDICADORES', 'VALOR'],
    ['Total de Entradas (R$)', totalIncome],
    ['Total de Saidas (R$)',   totalExpense],
    ['Saldo do Periodo (R$)',  balance],
    ['Taxa de Poupanca',       savingsRate],
    ['Total de Lancamentos',   transactions.length],
    ['Lancamentos de Entrada', income.length],
    ['Lancamentos de Saida',   expense.length],
    [],
    ['RESUMO POR CATEGORIA'],
    ['Categoria', 'Entradas (R$)', 'Saidas (R$)', 'Resultado (R$)', '% das Despesas'],
    ...catRows.map(([cat, v]) => [
      cat,
      v.entrada || 0,
      v.saida || 0,
      v.entrada - v.saida,
      totalExpense > 0 ? `${((v.saida / totalExpense) * 100).toFixed(1)}%` : '0%',
    ]),
  ]);
  wsRes['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumo');

  // ── Aba 2: Lancamentos
  const allRows = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => ({
    Data:        formatDate(t.date),
    Descricao:   t.description,
    Categoria:   categories.find(c => c.id === t.categoryId)?.name || '-',
    Tipo:        t.type === 'income' ? 'Entrada' : 'Saida',
    'Valor (R$)': t.amount,
    Notas:       t.notes || '',
  }));
  const wsData = XLSX.utils.json_to_sheet(allRows);
  wsData['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 30 }];
  const lastRow = allRows.length + 1;
  wsData[`B${lastRow + 1}`] = { t: 's', v: 'TOTAL ENTRADAS' };
  wsData[`E${lastRow + 1}`] = { t: 'n', f: `SUMIF(D2:D${lastRow},"Entrada",E2:E${lastRow})`, v: totalIncome };
  wsData[`B${lastRow + 2}`] = { t: 's', v: 'TOTAL SAIDAS' };
  wsData[`E${lastRow + 2}`] = { t: 'n', f: `SUMIF(D2:D${lastRow},"Saida",E2:E${lastRow})`, v: totalExpense };
  wsData[`B${lastRow + 3}`] = { t: 's', v: 'SALDO' };
  wsData[`E${lastRow + 3}`] = { t: 'n', f: `E${lastRow + 1}-E${lastRow + 2}`, v: balance };
  wsData['!ref'] = `A1:F${lastRow + 3}`;
  XLSX.utils.book_append_sheet(wb, wsData, 'Lancamentos');

  // ── Aba 3: Por Categoria
  const wsCat = XLSX.utils.aoa_to_sheet([
    ['Categoria', 'Entradas (R$)', 'Saidas (R$)', 'Resultado (R$)', '% das Despesas'],
    ...catRows.map(([cat, v]) => [
      cat,
      v.entrada || 0,
      v.saida || 0,
      v.entrada - v.saida,
      totalExpense > 0 ? parseFloat(((v.saida / totalExpense) * 100).toFixed(1)) : 0,
    ]),
    [],
    ['TOTAL', totalIncome, totalExpense, balance],
  ]);
  wsCat['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

  XLSX.writeFile(wb, `Financeiro_${monthLabel.replace(/ /g, '_')}.xlsx`);
}

// ── PDF MENSAL ────────────────────────────────────────────

export function generatePDFReport(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');

  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  cifraHeader(doc, 'Relatorio Financeiro', pdfSafe(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)));

  cifraKpiCards(doc, [
    { label: 'SALDO DO PERIODO',  value: formatCurrency(balance),      color: balance >= 0 ? C.pos : C.neg },
    { label: 'TOTAL ENTRADAS',    value: formatCurrency(totalIncome),  color: C.pos },
    { label: 'TOTAL SAIDAS',      value: formatCurrency(totalExpense), color: C.neg },
    { label: 'TAXA DE POUPANCA',  value: totalIncome > 0 ? `${((balance / totalIncome) * 100).toFixed(1)}%` : '0%', color: C.accent },
  ], 48);

  const catExpRows = buildCatExpRows(transactions, categories);
  let tableStartY = 80;

  if (catExpRows.length > 0) {
    sectionTitle(doc, 'DESPESAS POR CATEGORIA', 76);
    const barsEnd = drawCatBars(doc, catExpRows, 82);
    tableStartY = barsEnd + 8;
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(14, tableStartY - 3, 196, tableStartY - 3);
  }

  sectionTitle(doc, `LANCAMENTOS DO MES (${transactions.length})`, tableStartY);

  const bgHook = makeBgHook(doc);

  autoTable(doc, {
    startY: tableStartY + 6,
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
    body: txTableRows(transactions, categories),
    theme: 'plain',
    headStyles: TH,
    bodyStyles: TB,
    alternateRowStyles: TA,
    columnStyles: TX_COLS,
    willDrawPage: bgHook,
    didParseCell: txParseCell,
  });

  const finalY = doc.lastAutoTable.finalY + 12;
  if (finalY < 250 && catExpRows.length > 0) {
    sectionTitle(doc, 'RESUMO POR CATEGORIA', finalY);
    const allCatMap = buildAllCatMap(transactions, categories);
    autoTable(doc, {
      startY: finalY + 6,
      head: [['Categoria', 'Entradas', 'Saidas', 'Resultado']],
      body: Object.entries(allCatMap)
        .sort((a, b) => (b[1].saida + b[1].entrada) - (a[1].saida + a[1].entrada))
        .map(([cat, v]) => [
          cat,
          v.entrada > 0 ? formatCurrency(v.entrada) : '-',
          v.saida > 0 ? formatCurrency(v.saida) : '-',
          formatCurrency(v.entrada - v.saida),
        ]),
      theme: 'plain',
      headStyles: TH,
      bodyStyles: TB,
      alternateRowStyles: TA,
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 34, halign: 'right' },
        2: { cellWidth: 34, halign: 'right' },
        3: { cellWidth: 34, halign: 'right' },
      },
      willDrawPage: bgHook,
    });
  }

  addFooter(doc);
  return doc;
}

export function downloadPDF(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  generatePDFReport(transactions, categories, month, year).save(`Financeiro_${monthLabel.replace(/ /g, '_')}.pdf`);
}

export function getPDFBase64(transactions, categories, month, year) {
  return generatePDFReport(transactions, categories, month, year).output('datauristring');
}

// ── WHATSAPP MENSAL ───────────────────────────────────────

export function generateWhatsAppText(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? `${((balance / totalIncome) * 100).toFixed(1)}%` : '0%';

  const lines = [
    `📊 *Relatorio Financeiro — Cifra*`,
    `📅 ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
    ``,
    `💰 *RESUMO*`,
    `✅ Entradas:   ${formatCurrency(totalIncome)}`,
    `❌ Saidas:     ${formatCurrency(totalExpense)}`,
    `${balance >= 0 ? '🟢' : '🔴'} Saldo:      ${formatCurrency(balance)}`,
    `💹 Poupanca:   ${savingsRate}`,
  ];

  const catMap = {};
  expense.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    catMap[cat] = (catMap[cat] || 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topCats.length > 0) {
    lines.push('', '📋 *TOP CATEGORIAS (SAIDAS)*');
    topCats.forEach(([cat, val]) => {
      const pct = totalExpense > 0 ? `${((val / totalExpense) * 100).toFixed(0)}%` : '0%';
      lines.push(`  • ${cat}: ${formatCurrency(val)} _(${pct})_`);
    });
  }

  const top3 = [...expense].sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (top3.length > 0) {
    lines.push('', '💸 *MAIORES SAIDAS*');
    top3.forEach((t, i) => lines.push(`  ${i + 1}. ${t.description} — ${formatCurrency(t.amount)}`));
  }

  lines.push('', `📝 *LANCAMENTOS (${transactions.length} total)*`);
  [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
    const icon = t.type === 'income' ? '⬆' : '⬇';
    const cat  = categories.find(c => c.id === t.categoryId)?.name;
    lines.push(`${icon} ${formatDate(t.date)} | ${t.description}${cat ? ` [${cat}]` : ''} | ${formatCurrency(t.amount)}`);
  });

  lines.push('', '_Gerado pelo Cifra — Gerenciador Financeiro_');
  return lines.join('\n');
}

// ── EXCEL PROJETO ─────────────────────────────────────────

export function exportProjectToExcel(transactions, categories, project) {
  const label = pdfSafe(project.name);
  const wb = XLSX.utils.book_new();

  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  const catMap = buildAllCatMap(transactions, categories);
  const catRows = Object.entries(catMap).sort((a, b) => (b[1].saida + b[1].entrada) - (a[1].saida + a[1].entrada));

  // ── Aba 1: Resumo
  const wsRes = XLSX.utils.aoa_to_sheet([
    ['RELATORIO DO PROJETO', label],
    [],
    ['INDICADORES', 'VALOR'],
    ['Total de Entradas (R$)', totalIncome],
    ['Total de Saidas (R$)',   totalExpense],
    ['Saldo do Projeto (R$)',  balance],
    ['Total de Lancamentos',   transactions.length],
    [],
    ['RESUMO POR CATEGORIA'],
    ['Categoria', 'Entradas (R$)', 'Saidas (R$)', 'Resultado (R$)'],
    ...catRows.map(([cat, v]) => [cat, v.entrada || 0, v.saida || 0, v.entrada - v.saida]),
  ]);
  wsRes['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumo');

  // ── Aba 2: Lancamentos
  const allRows = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => ({
    Data:        formatDate(t.date),
    Descricao:   t.description,
    Categoria:   categories.find(c => c.id === t.categoryId)?.name || '-',
    Tipo:        t.type === 'income' ? 'Entrada' : 'Saida',
    'Valor (R$)': t.amount,
    Notas:       t.notes || '',
  }));
  const wsData = XLSX.utils.json_to_sheet(allRows);
  wsData['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 30 }];
  const lastRow = allRows.length + 1;
  wsData[`B${lastRow + 1}`] = { t: 's', v: 'TOTAL ENTRADAS' };
  wsData[`E${lastRow + 1}`] = { t: 'n', f: `SUMIF(D2:D${lastRow},"Entrada",E2:E${lastRow})`, v: totalIncome };
  wsData[`B${lastRow + 2}`] = { t: 's', v: 'TOTAL SAIDAS' };
  wsData[`E${lastRow + 2}`] = { t: 'n', f: `SUMIF(D2:D${lastRow},"Saida",E2:E${lastRow})`, v: totalExpense };
  wsData[`B${lastRow + 3}`] = { t: 's', v: 'SALDO' };
  wsData[`E${lastRow + 3}`] = { t: 'n', f: `E${lastRow + 1}-E${lastRow + 2}`, v: balance };
  wsData['!ref'] = `A1:F${lastRow + 3}`;
  XLSX.utils.book_append_sheet(wb, wsData, xlsxSheetName(label));

  XLSX.writeFile(wb, `Projeto_${label.replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.xlsx`);
}

// ── PDF PROJETO ───────────────────────────────────────────

export function downloadProjectPDF(transactions, categories, project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');

  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  cifraHeader(doc, pdfSafe(project.name), 'Relatorio do Projeto');

  cifraKpiCards(doc, [
    { label: 'SALDO DO PROJETO',  value: formatCurrency(balance),      color: balance >= 0 ? C.pos : C.neg },
    { label: 'TOTAL ENTRADAS',    value: formatCurrency(totalIncome),  color: C.pos },
    { label: 'TOTAL SAIDAS',      value: formatCurrency(totalExpense), color: C.neg },
    { label: 'LANCAMENTOS',       value: String(transactions.length),  color: C.accent },
  ], 48);

  const catExpRows = buildCatExpRows(transactions, categories);
  let tableStartY = 80;

  if (catExpRows.length > 0) {
    sectionTitle(doc, 'DESPESAS POR CATEGORIA', 76);
    const barsEnd = drawCatBars(doc, catExpRows, 82);
    tableStartY = barsEnd + 8;
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(14, tableStartY - 3, 196, tableStartY - 3);
  }

  sectionTitle(doc, `LANCAMENTOS DO PROJETO (${transactions.length})`, tableStartY);

  const bgHook = makeBgHook(doc);

  autoTable(doc, {
    startY: tableStartY + 6,
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
    body: txTableRows(transactions, categories),
    theme: 'plain',
    headStyles: TH,
    bodyStyles: TB,
    alternateRowStyles: TA,
    columnStyles: TX_COLS,
    willDrawPage: bgHook,
    didParseCell: txParseCell,
  });

  addFooter(doc, `Cifra — ${pdfSafe(project.name)}`);
  doc.save(`Projeto_${pdfSafe(project.name).replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.pdf`);
}

// ── WHATSAPP PROJETO ──────────────────────────────────────

export function generateProjectWhatsAppText(transactions, categories, project) {
  const income  = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  const lines = [
    `${project.icon || '📁'} *Projeto: ${project.name}*`,
    ``,
    `💰 *RESUMO*`,
    `✅ Entradas:   ${formatCurrency(totalIncome)}`,
    `❌ Saidas:     ${formatCurrency(totalExpense)}`,
    `${balance >= 0 ? '🟢' : '🔴'} Saldo:      ${formatCurrency(balance)}`,
  ];

  const catMap = {};
  expense.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    catMap[cat] = (catMap[cat] || 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topCats.length > 0) {
    lines.push('', '📋 *TOP CATEGORIAS (SAIDAS)*');
    topCats.forEach(([cat, val]) => {
      const pct = totalExpense > 0 ? `${((val / totalExpense) * 100).toFixed(0)}%` : '0%';
      lines.push(`  • ${cat}: ${formatCurrency(val)} _(${pct})_`);
    });
  }

  const top3 = [...expense].sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (top3.length > 0) {
    lines.push('', '💸 *MAIORES SAIDAS*');
    top3.forEach((t, i) => lines.push(`  ${i + 1}. ${t.description} — ${formatCurrency(t.amount)}`));
  }

  lines.push('', `📝 *LANCAMENTOS (${transactions.length} total)*`);
  [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
    const icon = t.type === 'income' ? '⬆' : '⬇';
    lines.push(`${icon} ${formatDate(t.date)} | ${t.description} | ${formatCurrency(t.amount)}`);
  });

  lines.push('', '_Gerado pelo Cifra — Gerenciador Financeiro_');
  return lines.join('\n');
}
