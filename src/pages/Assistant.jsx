import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Trash2, Bot, User, Loader2, Lock, Settings } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, MONTHS, getCurrentMonthYear } from '../utils/formatters';

function buildSystemPrompt({ income, expense, balance, topCategories, projects, cards, month, year, getCardBill }) {
  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0.0';
  const monthName = MONTHS[month - 1];

  const categoryLines = topCategories
    .slice(0, 5)
    .map(c => `  - ${c.name}: ${formatCurrency(c.total)}`)
    .join('\n');

  const projectLines = projects
    .filter(p => p.includeInOverview !== false)
    .map(p => `  - ${p.icon} ${p.name}`)
    .join('\n') || '  Nenhum projeto ativo';

  const cardLines = cards.length > 0
    ? cards.map(c => {
        const bill = getCardBill(c.id, month, year);
        return `  - ${c.icon} ${c.name}: fatura ${formatCurrency(bill.total)} (${bill.paid ? 'paga' : 'pendente'})`;
      }).join('\n')
    : '  Nenhum cartão cadastrado';

  return `Você é um assistente financeiro pessoal inteligente e amigável, especialista em finanças pessoais brasileiras.\n\nContexto financeiro atual do usuário:\n- Mês: ${monthName} ${year}\n- Entradas: ${formatCurrency(income)}\n- Saídas: ${formatCurrency(expense)}\n- Saldo: ${formatCurrency(balance)}\n- Taxa de poupança: ${savingsRate}%\n- Maiores gastos por categoria:\n${categoryLines || '  Nenhum gasto registrado'}\n- Projetos ativos:\n${projectLines}\n- Cartões:\n${cardLines}\n\nResponda sempre em português brasileiro. Seja direto, prático e personalizado com base nos dados financeiros acima. Use os dados reais para dar conselhos específicos ao usuário.`;
}

function AssistantLocked() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.14)-theme(spacing.8))] max-h-[800px] text-center px-6">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2">
        Assistente de IA desativado
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
        O assistente financeiro com IA está desativado por padrão para proteger sua privacidade.
        Para usar o chat, ative-o nas configurações da conta.
      </p>
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
        <Settings className="w-4 h-4 flex-shrink-0" />
        <span>Clique no seu avatar (canto superior direito) → <strong>Configurações</strong></span>
      </div>
    </div>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const { transactions, categories, projects, cards, getSummary, getCardBill } = useFinance();
  const now = getCurrentMonthYear();

  const aiEnabled = user?.user_metadata?.ai_assistant_enabled === true;

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente financeiro pessoal. Tenho acesso aos seus dados financeiros do mês atual e posso te ajudar com análises, dicas de economia, planejamento e muito mais. Como posso te ajudar hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const systemPrompt = useMemo(() => {
    const { income, expense, balance, transactions: monthTxs } = getSummary(now.month, now.year);

    const catTotals = {};
    monthTxs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat ? `${cat.icon} ${cat.name}` : 'Sem categoria';
        catTotals[name] = (catTotals[name] || 0) + t.amount;
      });
    const topCategories = Object.entries(catTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return buildSystemPrompt({
      income,
      expense,
      balance,
      topCategories,
      projects,
      cards,
      month: now.month,
      year: now.year,
      getCardBill,
    });
  }, [transactions, categories, projects, cards, now.month, now.year]);

  if (!aiEnabled) {
    return <AssistantLocked />;
  }

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = newMessages
        .slice(1)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          systemPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      const assistantContent = data.content || 'Não foi possível obter resposta.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Desculpe, ocorreu um erro ao conectar com o assistente. ${err.message ? `(${err.message})` : ''} Verifique sua conexão e tente novamente.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([{
      role: 'assistant',
      content: 'Olá! Sou seu assistente financeiro pessoal. Tenho acesso aos seus dados financeiros do mês atual e posso te ajudar com análises, dicas de economia, planejamento e muito mais. Como posso te ajudar hoje?',
    }]);
  };

  const suggestedQuestions = [
    'Como está minha saúde financeira este mês?',
    'Onde posso economizar mais?',
    'Analise meus gastos por categoria',
    'Dicas para aumentar minha poupança',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.8))] max-h-[800px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">Assistente Financeiro</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Powered by Groq · Llama 3.3</p>
          </div>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={clearConversation}
          title="Limpar conversa"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Limpar</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user'
                ? 'bg-blue-600'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5 text-white" />
              }
            </div>

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && !loading && (
        <div className="flex-shrink-0 py-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 px-1">Sugestões:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q); inputRef.current?.focus(); }}
                className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-shrink-0 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none input-field min-h-[44px] max-h-32 py-2.5 text-sm"
            placeholder="Pergunte algo sobre suas finanças..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="btn-primary px-4 self-end"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 px-1">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
