// Lançamento Rápido por Texto: transforma "Uber 25,00" em uma transação
// categorizada. É um classificador local por palavras-chave — parece IA para o
// usuário, mas roda 100% offline (sem custo e sem enviar dados pra fora).

// Palavra-chave → nome de categoria alvo (bate com as categorias padrão do app;
// o match final é feito contra as categorias reais do usuário, por inclusão).
const KEYWORD_RULES = [
  { cat: 'Transporte',   words: ['uber', '99', 'taxi', 'táxi', 'onibus', 'ônibus', 'metro', 'metrô', 'gasolina', 'combustivel', 'combustível', 'estacionamento', 'pedagio', 'pedágio', 'passagem', 'brt', 'trem'] },
  { cat: 'Alimentação',  words: ['ifood', 'mercado', 'supermercado', 'restaurante', 'lanche', 'pizza', 'hamburguer', 'hambúrguer', 'almoço', 'almoco', 'jantar', 'cafe', 'café', 'padaria', 'feira', 'acougue', 'açougue', 'marmita', 'delivery', 'sorvete', 'comida'] },
  { cat: 'Moradia',      words: ['aluguel', 'luz', 'energia', 'agua', 'água', 'condominio', 'condomínio', 'internet', 'gas', 'gás', 'iptu', 'faxina', 'reforma'] },
  { cat: 'Saúde',        words: ['farmacia', 'farmácia', 'remedio', 'remédio', 'medico', 'médico', 'dentista', 'academia', 'consulta', 'exame', 'plano de saude', 'plano de saúde', 'psicologo', 'psicólogo'] },
  { cat: 'Educação',     words: ['curso', 'livro', 'faculdade', 'escola', 'apostila', 'mensalidade', 'aula'] },
  { cat: 'Lazer',        words: ['cinema', 'show', 'jogo', 'game', 'netflix', 'spotify', 'disney', 'hbo', 'prime', 'streaming', 'viagem', 'bar', 'balada', 'festa', 'parque'] },
  { cat: 'Compras',      words: ['shopping', 'roupa', 'tenis', 'tênis', 'sapato', 'amazon', 'shopee', 'mercado livre', 'magalu', 'presente', 'celular', 'eletronico', 'eletrônico'] },
  { cat: 'Salário',      words: ['salario', 'salário', 'pagamento', 'holerite'], income: true },
  { cat: 'Freelance',    words: ['freela', 'freelance', 'bico', 'job'], income: true },
  { cat: 'Investimentos', words: ['dividendo', 'rendimento', 'juros recebidos'], income: true },
];

const INCOME_HINTS = ['recebi', 'recebido', 'ganhei', 'entrou', 'venda', 'vendi', 'salario', 'salário', 'freela', 'pix recebido', 'caixinha', 'gorjeta'];

/**
 * Extrai { amount, description, type, categoryName } de um texto livre como
 * "Uber 25,00" ou "recebi 300 do freela". Retorna null se não achar um valor.
 */
export function parseQuickEntry(text) {
  const raw = (text || '').trim();
  if (!raw) return null;

  // Último número do texto é o valor ("Uber 25,00", "mercado R$ 132.50", "pix 300")
  const match = raw.match(/(\d+(?:[.,]\d{1,2})?)(?!.*\d)/);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(',', '.'));
  if (!(amount > 0)) return null;

  let description = raw
    .replace(match[1], '')
    .replace(/\br\$\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, '')
    .trim();
  if (!description) description = 'Lançamento rápido';
  description = description.charAt(0).toUpperCase() + description.slice(1);

  const lower = raw.toLowerCase();
  let type = INCOME_HINTS.some(w => lower.includes(w)) ? 'income' : 'expense';
  let categoryName = null;

  for (const rule of KEYWORD_RULES) {
    if (rule.words.some(w => lower.includes(w))) {
      categoryName = rule.cat;
      if (rule.income) type = 'income';
      break;
    }
  }

  return { amount, description, type, categoryName };
}

/**
 * Resolve a categoria real do usuário a partir do palpite do parser.
 * Cai em "Outros" do tipo certo (ou na primeira categoria do tipo) se não achar.
 */
export function resolveCategory(categories, type, categoryName) {
  const ofType = categories.filter(c => c.type === type);
  if (categoryName) {
    const hit = ofType.find(c =>
      c.name.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(c.name.toLowerCase())
    );
    if (hit) return hit;
  }
  return ofType.find(c => c.name.toLowerCase().includes('outros')) || ofType[0] || null;
}
