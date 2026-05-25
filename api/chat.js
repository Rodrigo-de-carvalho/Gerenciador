const TOOLS = [
  // ── Transações ──────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description:
        'Adiciona uma nova transação financeira (receita ou despesa) no Cifra. ' +
        'Use sempre que o usuário mencionar um gasto, compra, pagamento ou receita.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Nome ou descrição da transação (ex: "Almoço", "Salário", "Netflix")' },
          amount: { type: 'number', description: 'Valor em reais, sempre positivo' },
          type: { type: 'string', enum: ['income', 'expense'], description: '"income" para receita/entrada, "expense" para despesa/saída' },
          date: { type: 'string', description: 'Data no formato YYYY-MM-DD. Use a data de hoje se não especificada.' },
          category_name: { type: 'string', description: 'Nome exato de uma das categorias disponíveis listadas no contexto.' },
          project_name: { type: 'string', description: 'Nome do projeto ao qual vincular (opcional).' },
          notes: { type: 'string', description: 'Observações adicionais (opcional)' },
        },
        required: ['description', 'amount', 'type', 'date'],
      },
    },
  },

  // ── Projetos ────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'add_project',
      description:
        'Cria um novo projeto no Cifra para organizar transações de um objetivo ou tema específico ' +
        '(ex: viagem, reforma, evento, negócio). Use quando o usuário pedir para criar um projeto.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome do projeto' },
          description: { type: 'string', description: 'Descrição opcional do projeto' },
          icon: { type: 'string', description: 'Emoji representando o projeto (ex: ✈️, 🏠, 🎵, 💼, 🚗)' },
          color: { type: 'string', description: 'Cor hex (ex: #3b82f6, #22c55e, #f97316). Escolha uma cor que combine com o tema.' },
          include_in_overview: {
            type: 'boolean',
            description: 'Se true, as transações do projeto entram no saldo geral do dashboard. Se false, ficam isoladas (ideal para projetos paralelos).',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_project',
      description: 'Edita um projeto existente. Identifique o projeto pelo nome.',
      parameters: {
        type: 'object',
        properties: {
          project_name: { type: 'string', description: 'Nome atual do projeto a editar' },
          new_name: { type: 'string', description: 'Novo nome (opcional)' },
          description: { type: 'string', description: 'Nova descrição (opcional)' },
          icon: { type: 'string', description: 'Novo ícone emoji (opcional)' },
          color: { type: 'string', description: 'Nova cor hex (opcional)' },
          include_in_overview: { type: 'boolean', description: 'Incluir no saldo geral? (opcional)' },
        },
        required: ['project_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_project',
      description: 'Remove um projeto existente pelo nome. As transações vinculadas ficam sem projeto (não são excluídas).',
      parameters: {
        type: 'object',
        properties: {
          project_name: { type: 'string', description: 'Nome exato do projeto a remover' },
        },
        required: ['project_name'],
      },
    },
  },

  // ── Categorias ──────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'add_category',
      description: 'Cria uma nova categoria de receita ou despesa para organizar os lançamentos.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da categoria (ex: "Pet Shop", "Streaming", "Dividendos")' },
          type: { type: 'string', enum: ['income', 'expense'], description: 'Se é categoria de entrada ou saída' },
          icon: { type: 'string', description: 'Emoji representando a categoria (ex: 🐾, 📺, 💸)' },
          color: { type: 'string', description: 'Cor hex (ex: #3b82f6)' },
        },
        required: ['name', 'type'],
      },
    },
  },

  // ── Investimentos ───────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'add_investment',
      description: 'Adiciona um novo ativo à carteira de investimentos do usuário.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome ou ticker do ativo (ex: PETR4, Tesouro Selic 2029, Bitcoin, MXRF11)' },
          type: {
            type: 'string',
            enum: ['acoes', 'fiis', 'renda_fixa', 'crypto', 'outros'],
            description: 'Tipo: acoes=ações, fiis=fundos imobiliários, renda_fixa=CDB/Tesouro/LCI, crypto=criptomoedas, outros=demais',
          },
          invested: { type: 'number', description: 'Valor total investido em R$' },
          current_value: { type: 'number', description: 'Valor atual do ativo em R$' },
          notes: { type: 'string', description: 'Observações opcionais (ex: "Vencimento 2026", "Posição inicial")' },
        },
        required: ['name', 'type', 'invested', 'current_value'],
      },
    },
  },

  // ── Orçamentos ──────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'set_budget',
      description: 'Define ou atualiza o orçamento mensal para uma categoria de despesa. Útil quando o usuário quer controlar quanto gasta em algo.',
      parameters: {
        type: 'object',
        properties: {
          category_name: { type: 'string', description: 'Nome da categoria de despesa' },
          amount: { type: 'number', description: 'Valor limite mensal em R$' },
        },
        required: ['category_name', 'amount'],
      },
    },
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, systemPrompt } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      let errMsg = `Serviço de IA indisponível (HTTP ${response.status})`;
      try {
        const errData = await response.json();
        errMsg = errData.error?.message || errData.error || errMsg;
      } catch {
        try { errMsg = (await response.text()) || errMsg; } catch { /* ignore */ }
      }
      return res.status(500).json({ error: errMsg });
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return res.status(500).json({ error: 'Resposta vazia do modelo de IA. Tente novamente.' });
    }

    // tool_calls can appear with finish_reason 'tool_calls' or sometimes 'stop'
    const toolCalls = choice.message?.tool_calls;
    if (toolCalls?.length) {
      return res.json({
        tool_calls: toolCalls,
        assistant_message: {
          role: 'assistant',
          content: choice.message.content ?? null,
          tool_calls: toolCalls,
        },
      });
    }

    res.json({ content: choice.message?.content || 'Não foi possível obter resposta.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro interno no servidor.' });
  }
}
