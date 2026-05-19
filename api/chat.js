const TOOLS = [
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
          description: {
            type: 'string',
            description: 'Nome ou descrição da transação (ex: "Almoço", "Salário", "Netflix")',
          },
          amount: {
            type: 'number',
            description: 'Valor em reais, sempre positivo',
          },
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: '"income" para receita/entrada, "expense" para despesa/saída',
          },
          date: {
            type: 'string',
            description: 'Data no formato YYYY-MM-DD. Use a data de hoje se não especificada.',
          },
          category_name: {
            type: 'string',
            description: 'Nome exato de uma das categorias disponíveis listadas no contexto.',
          },
          notes: {
            type: 'string',
            description: 'Observações adicionais (opcional)',
          },
        },
        required: ['description', 'amount', 'type', 'date'],
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
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls?.length) {
      return res.json({
        tool_calls: choice.message.tool_calls,
        assistant_message: {
          role: 'assistant',
          content: choice.message.content ?? null,
          tool_calls: choice.message.tool_calls,
        },
      });
    }

    res.json({ content: choice?.message?.content || 'Não foi possível obter resposta.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
