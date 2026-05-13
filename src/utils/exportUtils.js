import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatMonth } from './formatters';

export function exportToExcel(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);

  const incomeRows = transactions
    .filter(t => t.type === 'income')
    .map(t => ({
      Data: formatDate(t.date),
      Descrição: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Entrada',
      Valor: t.amount,
    }));

  const expenseRows = transactions
    .filter(t => t.type === 'expense')
    .map(t => ({
      Data: formatDate(t.date),
      Descrição: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Saída',
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
    { Descrição: 'RESUMO DO MÊS' },
    { Descrição: 'Total de Entradas', Valor: totalIncome },
    { Descrição: 'Total de Saídas', Valor: totalExpense },
    { Descrição: 'Saldo', Valor: balance },
  ];

  const wb = XLSX.utils.book_new();

  // Main sheet
  const wsData = XLSX.utils.json_to_sheet([...allRows, ...summaryRows]);

  // Column widths
  wsData['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, wsData, `Lançamentos - ${monthLabel}`);

  // Category breakdown sheet
  const catMap = {};
  transactions.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    if (!catMap[cat]) catMap[cat] = { Entrada: 0, Saída: 0 };
    if (t.type === 'income') catMap[cat].Entrada += t.amount;
    else catMap[cat].Saída += t.amount;
  });

  const catRows = Object.entries(catMap).map(([cat, vals]) => ({
    Categoria: cat,
    'Total Entradas': vals.Entrada,
    'Total Saídas': vals.Saída,
    Resultado: vals.Entrada - vals.Saída,
  }));

  const wsCat = XLSX.utils.json_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

  XLSX.writeFile(wb, `Financeiro_${monthLabel.replace(/ /g, '_')}.xlsx`);
}

export function generatePDFReport(transactions, categories, month, year) {
  const monthLabel = formatMonth(month, year);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Financeiro', 14, 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), 14, 27);
  doc.text(`Gerado em: ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 210 - 14, 27, { align: 'right' });

  // Summary cards
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');

  const cardY = 45;
  const cardH = 22;

  // Income card
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, cardY, 56, cardH, 3, 3, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(8);
  doc.text('TOTAL ENTRADAS', 16, cardY + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalIncome), 42, cardY + 16, { align: 'center' });

  // Expense card
  doc.setFillColor(255, 241, 242);
  doc.roundedRect(77, cardY, 56, cardH, 3, 3, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL SAÍDAS', 79, cardY + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalExpense), 105, cardY + 16, { align: 'center' });

  // Balance card
  const isPositive = balance >= 0;
  doc.setFillColor(isPositive ? 239 : 254, isPositive ? 246 : 226, isPositive ? 255 : 226);
  doc.roundedRect(140, cardY, 56, cardH, 3, 3, 'F');
  doc.setTextColor(isPositive ? 79 : 180, isPositive ? 70 : 35, isPositive ? 229 : 35);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SALDO', 142, cardY + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(balance), 168, cardY + 16, { align: 'center' });

  // Transactions table
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Lançamentos do Mês', 14, 80);

  const tableRows = transactions
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      return [
        formatDate(t.date),
        t.description.length > 35 ? t.description.slice(0, 35) + '...' : t.description,
        cat?.name || '-',
        t.type === 'income' ? 'Entrada' : 'Saída',
        formatCurrency(t.amount),
      ];
    });

  autoTable(doc, {
    startY: 85,
    head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 68 },
      2: { cellWidth: 38 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw;
        if (val === 'Entrada') {
          doc.setTextColor(22, 163, 74);
        } else {
          doc.setTextColor(220, 38, 38);
        }
      }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        doc.setTextColor(30, 30, 30);
      }
    },
  });

  // Category breakdown
  const finalY = doc.lastAutoTable.finalY + 12;
  if (finalY < 250) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumo por Categoria', 14, finalY);

    const catMap = {};
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
      if (!catMap[cat]) catMap[cat] = { entrada: 0, saida: 0 };
      if (t.type === 'income') catMap[cat].entrada += t.amount;
      else catMap[cat].saida += t.amount;
    });

    const catRows = Object.entries(catMap).map(([cat, vals]) => [
      cat,
      formatCurrency(vals.entrada),
      formatCurrency(vals.saida),
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Categoria', 'Entradas', 'Saídas']],
      body: catRows,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' },
      },
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('Gerenciador Financeiro', 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
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
    `📊 *Relatório Financeiro*`,
    `📅 ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
    ``,
    `💰 *RESUMO*`,
    `✅ Entradas: ${formatCurrency(totalIncome)}`,
    `❌ Saídas:   ${formatCurrency(totalExpense)}`,
    `${balance >= 0 ? '🟢' : '🔴'} Saldo:    ${formatCurrency(balance)}`,
    ``,
    `📋 *LANÇAMENTOS (${transactions.length} itens)*`,
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
      Descrição: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Entrada',
      Valor: t.amount,
    }));

  const expenseRows = transactions
    .filter(t => t.type === 'expense')
    .map(t => ({
      Data: formatDate(t.date),
      Descrição: t.description,
      Categoria: categories.find(c => c.id === t.categoryId)?.name || '-',
      Tipo: 'Saída',
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
    { Descrição: 'RESUMO DO PROJETO' },
    { Descrição: 'Total de Entradas', Valor: totalIncome },
    { Descrição: 'Total de Saídas', Valor: totalExpense },
    { Descrição: 'Saldo', Valor: balance },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet([...allRows, ...summaryRows]);
  wsData['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, label.slice(0, 31));

  const catMap = {};
  transactions.forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
    if (!catMap[cat]) catMap[cat] = { Entrada: 0, Saída: 0 };
    if (t.type === 'income') catMap[cat].Entrada += t.amount;
    else catMap[cat].Saída += t.amount;
  });

  const catRows = Object.entries(catMap).map(([cat, vals]) => ({
    Categoria: cat,
    'Total Entradas': vals.Entrada,
    'Total Saídas': vals.Saída,
    Resultado: vals.Entrada - vals.Saída,
  }));

  const wsCat = XLSX.utils.json_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

  XLSX.writeFile(wb, `Projeto_${label.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

export function downloadProjectPDF(transactions, categories, project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Parse project color to RGB
  const hex = (project.color || '#3b82f6').replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Header
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${project.icon || ''} ${project.name}`, 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório do Projeto', 14, 27);
  doc.text(`Gerado em: ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 196, 27, { align: 'right' });

  // Summary cards
  doc.setTextColor(30, 30, 30);
  const cardY = 45;
  const cardH = 22;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, cardY, 56, cardH, 3, 3, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL ENTRADAS', 16, cardY + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalIncome), 42, cardY + 16, { align: 'center' });

  doc.setFillColor(255, 241, 242);
  doc.roundedRect(77, cardY, 56, cardH, 3, 3, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL SAÍDAS', 79, cardY + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalExpense), 105, cardY + 16, { align: 'center' });

  const isPositive = balance >= 0;
  doc.setFillColor(isPositive ? 239 : 254, isPositive ? 246 : 226, isPositive ? 255 : 226);
  doc.roundedRect(140, cardY, 56, cardH, 3, 3, 'F');
  doc.setTextColor(isPositive ? 79 : 180, isPositive ? 70 : 35, isPositive ? 229 : 35);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SALDO', 142, cardY + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(balance), 168, cardY + 16, { align: 'center' });

  // Transactions table
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Lançamentos do Projeto', 14, 80);

  const tableRows = transactions
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      return [
        formatDate(t.date),
        t.description.length > 35 ? t.description.slice(0, 35) + '...' : t.description,
        cat?.name || '-',
        t.type === 'income' ? 'Entrada' : 'Saída',
        formatCurrency(t.amount),
      ];
    });

  autoTable(doc, {
    startY: 85,
    head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 68 },
      2: { cellWidth: 38 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
    },
  });

  // Category breakdown
  const finalY = doc.lastAutoTable.finalY + 12;
  if (finalY < 250) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Resumo por Categoria', 14, finalY);

    const catMap = {};
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria';
      if (!catMap[cat]) catMap[cat] = { entrada: 0, saida: 0 };
      if (t.type === 'income') catMap[cat].entrada += t.amount;
      else catMap[cat].saida += t.amount;
    });

    const catRows = Object.entries(catMap).map(([cat, vals]) => [
      cat,
      formatCurrency(vals.entrada),
      formatCurrency(vals.saida),
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Categoria', 'Entradas', 'Saídas']],
      body: catRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' },
      },
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('Gerenciador Financeiro', 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
  }

  doc.save(`Projeto_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
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
    `❌ Saídas:   ${formatCurrency(totalExpense)}`,
    `${balance >= 0 ? '🟢' : '🔴'} Saldo:    ${formatCurrency(balance)}`,
    ``,
    `📋 *LANÇAMENTOS (${transactions.length} itens)*`,
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
