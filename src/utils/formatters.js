export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * Converte texto digitado pelo usuário em número, aceitando os formatos
 * brasileiro e internacional: "1.234,56", "1,234.56", "1234,56", "1234.56",
 * "R$ 1.234,56". Retorna NaN se não for um número válido.
 * (parseFloat + replace(',', '.') corrompia valores com separador de milhar:
 * "1.234,56" virava 1.234 — cem vezes menor que o digitado.)
 */
export const parseAmount = (value) => {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // Os dois presentes: o que aparece por último é o separador decimal.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Só vírgula: decimal ("12,50") ou milhar ("1,234" — 3 dígitos após e mais de uma ou padrão exato)
    const after = s.length - lastComma - 1;
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1 || (after === 3 && /^\d{1,3}(,\d{3})+$/.test(s))) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  } else if (lastDot !== -1) {
    // Só ponto: "1.234" com grupos de 3 é milhar; "12.50" é decimal.
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1 || /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  return parseFloat(s);
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR').format(d);
};

export const formatMonth = (month, year) => {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
};

export const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export const getCurrentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};
