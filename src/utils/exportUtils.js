import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatMonth } from './formatters';

// Remove caracteres fora do range Latin-1 (emojis etc.) para compatibilidade com fontes PDF padrão
const pdfSafe = (str) => {
  if (!str) return '';
  return str.replace(/[^\x00-\xFF]/g, '').replace(/\s+/g, ' ').trim();
};

// Remove caracteres inválidos em nomes de aba do Excel
const xlsxSheetName = (str) =>
  (str || 'Dados').replace(/[[\]:*?/\\]/g, '').replace(/[^\x00-\xFF]/g, '').slice(0, 31) || 'Dados';

export function exportToExcel(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);

  const incomeRows = transactions
    .filter(t => t.type === 'income')
    .map(t => ({
      Data: formatDate(t.date),
      Descricao: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Entrada',
      Valor: t.amount,
    }));

  const expenseRows = transactions
    .filter(t => t.type === 'expense')
    .map(t => ({
      Data: formatDate(t.date),
      Descricao: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Saida',
      Valor: t.amount,
    }));

  const allRows = [...incomeRows, ...expenseRows].sort((a, b) =>
    new Date(a.Data) - new Date(b.Data)
  );

  const totalIncome = incomeRows.reduce((s, r) => s + r.Valor, 0);
  const totalExpense = expenseRows.reduce((s, r) => s + r.Valor, 0);
  const balance = totalIncome - totalExpense;

  const summaryRows = [
    {},
    { Descricao: 'RESUMO DO MES' },
    { Descricao: 'Total de Entradas', Valor: totalIncome },
    { Descricao: 'Total de Saidas', Valor: totalExpense },
    { Descricao: 'Saldo', Valor: balance },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet([...allRows, ...summaryRows]);
  wsData['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, xlsxSheetName(`Lancamentos - ${monthLabel}`));

  const catMap = {};
  transactions.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    if (!catMap[cat]) catMap[cat] = { Entrada: 0, Saida: 0 };
    if (t.type === 'income') catMap[cat].Entrada += t.amount;
    else catMap[cat].Saida += t.amount;
  });

  const catRows = Object.entries(catMap).map(([cat, vals]) => ({
    Categoria: cat,
    'Total Entradas': vals.Entrada,
    'Total Saidas': vals.Saida,
    Resultado: vals.Entrada - vals.Saida,
  }));

  const wsCat = XLSX.utils.json_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

  XLSX.writeFile(wb, `Financeiro_${monthLabel.replace(/ /g, '_')}.xlsx`);
}

// Cifra brand colours (RGB)
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

function cifraHeader(doc, title, subtitle) {
  // Dark background strip
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 42, 'F');

  // Accent left bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 4, 42, 'F');

  // Brand mark circle
  doc.setFillColor(...C.accent);
  doc.circle(22, 21, 9, 'F');
  doc.setTextColor(...C.bg);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('c', 22, 25.5, { align: 'center' });

  // Title
  doc.setTextColor(...C.text);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 36, 18);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text3);
  doc.text(subtitle, 36, 26);

  // Date
  doc.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 196, 26, { align: 'right' });

  // Brand name right
  doc.setTextColor(...C.text2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('Cifra', 196, 18, { align: 'right' });
}

function cifraKpiCards(doc, cards, y) {
  const totalW = 182;
  const gap = 4;
  const cardW = (totalW - gap * (cards.length - 1)) / cards.length;
  const cardH = 20;
  const startX = 14;

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    doc.setFillColor(...C.surface2);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    // left accent stripe
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

export function generatePDFReport(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Full page dark background
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  cifraHeader(doc, 'Relatorio Financeiro', pdfSafe(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)));

  cifraKpiCards(doc, [
    { label: 'SALDO ATUAL',      value: formatCurrency(balance),      color: balance >= 0 ? C.pos : C.neg },
    { label: 'TOTAL ENTRADAS',   value: formatCurrency(totalIncome),  color: C.pos },
    { label: 'TOTAL SAIDAS',     value: formatCurrency(totalExpense), color: C.neg },
    { label: 'TAXA DE POUPANCA', value: totalIncome > 0 ? `${((balance / totalIncome) * 100).toFixed(1)}%` : '0%', color: C.accent },
  ], 48);

  // Section title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text2);
  doc.text('LANCAMENTOS DO MES', 14, 80);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(14, 82, 196, 82);

  const tableRows = [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const cat  = categories.find(c => c.id === t.categoryId);
      const desc = pdfSafe(t.description);
      return [
        formatDate(t.date),
        desc.length > 40 ? desc.slice(0, 40) + '...' : desc,
        pdfSafe(cat?.name || '-'),
        t.type === 'income' ? 'Entrada' : 'Saida',
        formatCurrency(t.amount),
      ];
    });

  const _bgPage = () => { doc.setFillColor(...C.bg); doc.rect(0, 0, 210, 297, 'F'); };

  autoTable(doc, {
    startY: 85,
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: C.surface2,
      textColor: C.text3,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fillColor: C.surface,
      textColor: C.text,
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: C.bg },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 68 },
      2: { cellWidth: 38 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 32, halign: 'right' },
    },
    willDrawPage: _bgPage,
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = data.cell.raw === 'Entrada' ? C.pos : C.neg;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  if (finalY < 255) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text2);
    doc.text('RESUMO POR CATEGORIA', 14, finalY);
    doc.setDrawColor(...C.line);
    doc.line(14, finalY + 2, 196, finalY + 2);

    const catMap = {};
    transactions.forEach(t => {
      const cat = pdfSafe(categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria');
      if (!catMap[cat]) catMap[cat] = { entrada: 0, saida: 0 };
      if (t.type === 'income') catMap[cat].entrada += t.amount;
      else catMap[cat].saida += t.amount;
    });

    autoTable(doc, {
      startY: finalY + 6,
      head: [['Categoria', 'Entradas', 'Saidas', 'Saldo']],
      body: Object.entries(catMap).map(([cat, v]) => [
        cat,
        formatCurrency(v.entrada),
        formatCurrency(v.saida),
        formatCurrency(v.entrada - v.saida),
      ]),
      theme: 'plain',
      headStyles: { fillColor: C.surface2, textColor: C.text3, fontStyle: 'bold', fontSize: 7.5, cellPadding: 4 },
      bodyStyles: { fillColor: C.surface, textColor: C.text, fontSize: 8, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 34, halign: 'right' },
        2: { cellWidth: 34, halign: 'right' },
        3: { cellWidth: 34, halign: 'right' },
      },
      willDrawPage: _bgPage,
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.surface);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.text3);
    doc.setFont('helvetica', 'normal');
    doc.text('Cifra — Gerenciador Financeiro', 14, 291);
    doc.text(`Pagina ${i} de ${pageCount}`, 196, 291, { align: 'right' });
  }

  return doc;
}

export function downloadPDF(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const doc = generatePDFReport(transactions, categories, month, year);
  doc.save(`Financeiro_${monthLabel.replace(/ /g, '_')}.pdf`);
}

export function getPDFBase64(transactions, categories, month, year) {
  const doc = generatePDFReport(transactions, categories, month, year);
  return doc.output('datauristring');
}

export function generateWhatsAppText(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const lines = [
    `📊 *Relatorio Financeiro*`,
    `📅 ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
    ``,
    `💰 *RESUMO*`,
    `✅ Entradas: ${formatCurrency(totalIncome)}`,
    `❌ Saidas:   ${formatCurrency(totalExpense)}`,
    `${balance >= 0 ? '🟢' : '🔴'} Saldo:    ${formatCurrency(balance)}`,
    ``,
    `📋 *LANCAMENTOS (${transactions.length} itens)*`,
  ];

  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(t => {
    const icon = t.type === 'income' ? '⬆️' : '⬇️';
    lines.push(`${icon} ${formatDate(t.date)} | ${t.description} | ${formatCurrency(t.amount)}`);
  });

  lines.push('');
  lines.push('_Gerado pelo Gerenciador Financeiro_');

  return lines.join('\n');
}

export function exportProjectToExcel(transactions, categories, project) {
  const label = project.name;

  const incomeRows = transactions
    .filter(t => t.type === 'income')
    .map(t => ({
      Data: formatDate(t.date),
      Descricao: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Entrada',
      Valor: t.amount,
    }));

  const expenseRows = transactions
    .filter(t => t.type === 'expense')
    .map(t => ({
      Data: formatDate(t.date),
      Descricao: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Saida',
      Valor: t.amount,
    }));

  const allRows = [...incomeRows, ...expenseRows].sort((a, b) =>
    new Date(a.Data) - new Date(b.Data)
  );

  const totalIncome = incomeRows.reduce((s, r) => s + r.Valor, 0);
  const totalExpense = expenseRows.reduce((s, r) => s + r.Valor, 0);
  const balance = totalIncome - totalExpense;

  const summaryRows = [
    {},
    { Descricao: 'RESUMO DO PROJETO' },
    { Descricao: 'Total de Entradas', Valor: totalIncome },
    { Descricao: 'Total de Saidas', Valor: totalExpense },
    { Descricao: 'Saldo', Valor: balance },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet([...allRows, ...summaryRows]);
  wsData['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, xlsxSheetName(label));

  const catMap = {};
  transactions.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    if (!catMap[cat]) catMap[cat] = { Entrada: 0, Saida: 0 };
    if (t.type === 'income') catMap[cat].Entrada += t.amount;
    else catMap[cat].Saida += t.amount;
  });

  const catRows = Object.entries(catMap).map(([cat, vals]) => ({
    Categoria: cat,
    'Total Entradas': vals.Entrada,
    'Total Saidas': vals.Saida,
    Resultado: vals.Entrada - vals.Saida,
  }));

  const wsCat = XLSX.utils.json_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

  XLSX.writeFile(wb, `Projeto_${pdfSafe(label).replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.xlsx`);
}

export function downloadProjectPDF(transactions, categories, project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  cifraHeader(doc, pdfSafe(project.name), 'Relatorio do Projeto');

  cifraKpiCards(doc, [
    { label: 'SALDO DO PROJETO',  value: formatCurrency(balance),      color: balance >= 0 ? C.pos : C.neg },
    { label: 'TOTAL ENTRADAS',    value: formatCurrency(totalIncome),  color: C.pos },
    { label: 'TOTAL SAIDAS',      value: formatCurrency(totalExpense), color: C.neg },
    { label: 'LANCAMENTOS',       value: String(transactions.length),  color: C.accent },
  ], 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text2);
  doc.text('LANCAMENTOS DO PROJETO', 14, 80);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(14, 82, 196, 82);

  const tableRows = [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const cat  = categories.find(c => c.id === t.categoryId);
      const desc = pdfSafe(t.description);
      return [
        formatDate(t.date),
        desc.length > 40 ? desc.slice(0, 40) + '...' : desc,
        pdfSafe(cat?.name || '-'),
        t.type === 'income' ? 'Entrada' : 'Saida',
        formatCurrency(t.amount),
      ];
    });

  autoTable(doc, {
    startY: 85,
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
    body: tableRows,
    theme: 'plain',
    headStyles: { fillColor: C.surface2, textColor: C.text3, fontStyle: 'bold', fontSize: 7.5, cellPadding: 4 },
    bodyStyles: { fillColor: C.surface, textColor: C.text, fontSize: 8, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: C.bg },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 68 },
      2: { cellWidth: 38 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 32, halign: 'right' },
    },
    willDrawPage: () => { doc.setFillColor(...C.bg); doc.rect(0, 0, 210, 297, 'F'); },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = data.cell.raw === 'Entrada' ? C.pos : C.neg;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.surface);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.text3);
    doc.setFont('helvetica', 'normal');
    doc.text('Cifra — Gerenciador Financeiro', 14, 291);
    doc.text(`Pagina ${i} de ${pageCount}`, 196, 291, { align: 'right' });
  }

  doc.save(`Projeto_${pdfSafe(project.name).replace(/[^a-zA-Z0-9]/g, '_') || 'projeto'}.pdf`);
}

export function generateProjectWhatsAppText(transactions, categories, project) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const lines = [
    `${project.icon || '📁'} *Projeto: ${project.name}*`,
    ``,
    `💰 *RESUMO*`,
    `✅ Entradas: ${formatCurrency(totalIncome)}`,
    `❌ Saidas:   ${formatCurrency(totalExpense)}`,
    `${balance >= 0 ? '🟢' : '🔴'} Saldo:    ${formatCurrency(balance)}`,
    ``,
    `📋 *LANCAMENTOS (${transactions.length} itens)*`,
  ];

  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(t => {
    const icon = t.type === 'income' ? '⬆️' : '⬇️';
    lines.push(`${icon} ${formatDate(t.date)} | ${t.description} | ${formatCurrency(t.amount)}`);
  });

  lines.push('');
  lines.push('_Gerado pelo Gerenciador Financeiro_');

  return lines.join('\n');
}
