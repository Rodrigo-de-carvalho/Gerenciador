import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Trash2, Loader2, Lock, Settings } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import { useI18n } from '../i18n';

function buildSystemPrompt({ income, expense, balance, topCategories, categories, projects, cards, month, year, getCardBill }) {
  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0.0';
  const monthName = MONTHS[month - 1];
  const spendingLines = topCategories.slice(0, 5).map(c => `  - ${c.name}: ${formatCurrency(c.total)}`).join('\n');
  const projectLines = projects.length > 0
    ? projects.map(p => `  - ${p.icon} ${p.name} (id: ${p.id})${p.includeInOverview === false ? ' [isolado]' : ''}`).join('\n')
    : '  Nenhum';
  const cardLines = cards.length > 0
    ? cards.map(c => { const bill = getCardBill(c.id, month, year); return `  - ${c.icon} ${c.name}: fatura ${formatCurrency(bill.total)}`; }).join('\n')
    : '  Nenhum cartão';
  const allCatLines = categories.map(c => `  - ${c.icon} ${c.name} (${c.type === 'income' ? 'receita' : 'despesa'})`).join('\n');
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

  return `Você é o Cifra IA, assistente financeiro pessoal inteligente e amigável, especialista em finanças pessoais brasileiras.

Contexto financeiro atual do usuário:
- Mês: ${monthName} ${year}
- Entradas: ${formatCurrency(income)}
- Saídas: ${formatCurrency(expense)}
- Saldo: ${formatCurrency(balance)}
- Taxa de poupança: ${savingsRate}%
- Maiores gastos por categoria:
${spendingLines || '  Nenhum gasto registrado'}
- Projetos existentes:
${projectLines}
- Cartões:
${cardLines}

Categorias disponíveis:
${allCatLines}

Data de hoje: ${today}

Capacidades disponíveis (use as ferramentas automaticamente):
- Registrar transações → add_transaction
- Criar projetos → add_project
- Editar projetos → update_project (identifique pelo nome)
- Excluir projetos → delete_project (identifique pelo nome)
- Criar categorias → add_category
- Adicionar investimentos → add_investment
- Definir orçamento → set_budget

Regras de comportamento:
1. Responda sempre em português brasileiro.
2. Seja direto e prático.
3. Quando o usuário mencionar qualquer gasto, compra, pagamento ou receita — mesmo que seja "gastei X", "paguei X", "recebi X" — use add_transaction automaticamente sem pedir confirmação.
4. Quando o usuário pedir para criar, editar ou excluir um projeto, categoria, investimento ou orçamento, execute a ferramenta adequada imediatamente.
5. Para referenciar projetos nas ferramentas, use o nome exato como aparece na lista acima.
6. Após executar qualquer ferramenta, confirme o que foi feito de forma sucinta.
7. Se uma operação falhar, informe o erro claramente.`;
}

export default function Assistant() {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    transactions, categories, projects, cards,
    getSummary, getCardBill,
    addTransaction, addProject, updateProject, deleteProject,
    addCategory, setBudget,
  } = useFinance();
  const now = getCurrentMonthYear();
  const aiEnabled = user?.user_metadata?.ai_assistant_enabled === true;

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: t('assistant.initialMessage'),
  }]);
  const [apiHistory, setApiHistory] = useState([]);
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
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat ? `${cat.icon} ${cat.name}` : 'Sem categoria';
      catTotals[name] = (catTotals[name] || 0) + t.amount;
    });
    const topCategories = Object.entries(catTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    return buildSystemPrompt({ income, expense, balance, topCategories, categories, projects, cards, month: now.month, year: now.year, getCardBill });
  }, [transactions, categories, projects, cards, now.month, now.year]);

  if (!aiEnabled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 64, height: 64, background: 'var(--chip)', borderRadius: 16, display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <Lock size={28} style={{ color: 'var(--text-3)' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t('assistant.aiDisabledTitle')}</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
          {t('assistant.aiDisabledDesc')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--chip)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)' }}>
          <Settings size={14} style={{ flexShrink: 0 }} />
          <span>{t('assistant.aiDisabledHint')} <strong>{t('assistant.configSettings')}</strong></span>
        </div>
      </div>
    );
  }

  // ── Executor de ferramentas ──────────────────────────────────────────────────

  const executeTool = async (toolCall) => {
    const name = toolCall.function.name;
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      return { success: false, error: 'Argumentos inválidos da ferramenta.' };
    }

    // ── add_transaction ──────────────────────────────────────────────────────
    if (name === 'add_transaction') {
      try {
        // Resolve categoria pelo nome
        const cat = categories.find(c =>
          c.name.toLowerCase() === (args.category_name || '').toLowerCase() && c.type === args.type
        ) || categories.find(c => c.type === args.type);

        // Resolve projeto pelo nome (opcional)
        const proj = args.project_name
          ? projects.find(p => p.name.toLowerCase() === args.project_name.toLowerCase())
          : null;

        const result = await addTransaction({
          description: args.description,
          amount: Math.abs(Number(args.amount)),
          type: args.type,
          date: args.date,
          categoryId: cat?.id || null,
          projectId: proj?.id || null,
          notes: args.notes || null,
        });

        return {
          success: true,
          description: args.description,
          amount: args.amount,
          type: args.type,
          category: cat?.name || null,
          project: proj?.name || null,
          date: args.date,
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── add_project ──────────────────────────────────────────────────────────
    if (name === 'add_project') {
      try {
        const created = await addProject({
          name: args.name,
          description: args.description || '',
          icon: args.icon || '🏗️',
          color: args.color || '#3b82f6',
          includeInOverview: args.include_in_overview !== false,
        });
        return { success: true, id: created.id, name: created.name };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── update_project ───────────────────────────────────────────────────────
    if (name === 'update_project') {
      try {
        const proj = projects.find(p => p.name.toLowerCase() === args.project_name.toLowerCase());
        if (!proj) return { success: false, error: `Projeto "${args.project_name}" não encontrado.` };

        await updateProject({
          id: proj.id,
          name: args.new_name ?? proj.name,
          description: args.description ?? proj.description,
          icon: args.icon ?? proj.icon,
          color: args.color ?? proj.color,
          includeInOverview: args.include_in_overview ?? proj.includeInOverview,
        });
        return { success: true, name: args.new_name ?? proj.name };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── delete_project ───────────────────────────────────────────────────────
    if (name === 'delete_project') {
      try {
        const proj = projects.find(p => p.name.toLowerCase() === args.project_name.toLowerCase());
        if (!proj) return { success: false, error: `Projeto "${args.project_name}" não encontrado.` };
        await deleteProject(proj.id);
        return { success: true, deleted: proj.name };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── add_category ─────────────────────────────────────────────────────────
    if (name === 'add_category') {
      try {
        const created = await addCategory({
          name: args.name,
          type: args.type,
          icon: args.icon || '📋',
          color: args.color || '#6b7280',
        });
        return { success: true, name: created.name, type: created.type };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── add_investment ───────────────────────────────────────────────────────
    if (name === 'add_investment') {
      try {
        const { data, error } = await supabase
          .from('investments')
          .insert({
            user_id: user.id,
            name: args.name,
            type: args.type,
            invested: args.invested,
            current_value: args.current_value,
            notes: args.notes || null,
            date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { success: true, name: data.name, type: data.type, invested: data.invested, current_value: data.current_value };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── set_budget ───────────────────────────────────────────────────────────
    if (name === 'set_budget') {
      try {
        const cat = categories.find(c =>
          c.name.toLowerCase() === (args.category_name || '').toLowerCase() && c.type === 'expense'
        );
        if (!cat) return { success: false, error: `Categoria de despesa "${args.category_name}" não encontrada.` };
        await setBudget({ categoryId: cat.id, amount: args.amount });
        return { success: true, category: cat.name, amount: args.amount };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    return { success: false, error: `Ferramenta desconhecida: ${name}` };
  };

  // ── Chamada à API ────────────────────────────────────────────────────────────

  const callApi = async (history) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, systemPrompt }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let currentHistory = [...apiHistory, userMsg];

    try {
      const result = await callApi(currentHistory);

      if (result.tool_calls?.length) {
        // Executa todas as ferramentas e coleta resultados
        const toolResultMsgs = [];
        for (const tc of result.tool_calls) {
          const outcome = await executeTool(tc);
          toolResultMsgs.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(outcome),
          });
        }

        // Envia histórico + resultados das ferramentas de volta para obter resposta final
        currentHistory = [
          ...currentHistory,
          result.assistant_message,
          ...toolResultMsgs,
        ];

        const final = await callApi(currentHistory);
        const assistantMsg = { role: 'assistant', content: final.content || 'Feito!' };
        setMessages(prev => [...prev, assistantMsg]);
        setApiHistory([...currentHistory, { role: 'assistant', content: assistantMsg.content }]);
      } else {
        const assistantMsg = { role: 'assistant', content: result.content };
        setMessages(prev => [...prev, assistantMsg]);
        setApiHistory([...currentHistory, assistantMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `${t('assistant.errorMessage')} ${err.message ? `(${err.message})` : ''}` }]);
      setApiHistory(currentHistory);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearConversation = () => {
    setMessages([{ role: 'assistant', content: t('assistant.conversationReset') }]);
    setApiHistory([]);
  };

  const suggestions = [
    t('assistant.suggestion1'),
    t('assistant.suggestion2'),
    t('assistant.suggestion3'),
    t('assistant.suggestion4'),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', maxHeight: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--info) 100%)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>❆</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{t('assistant.title')}</div>
          <div className="t-meta">{t('assistant.subtitle')}</div>
        </div>
        <button
          className="btn"
          style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12 }}
          onClick={clearConversation}
          title={t('assistant.clear')}
        >
          <Trash2 size={13} />
          <span>{t('assistant.clear')}</span>
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8, scrollbarWidth: 'thin', scrollbarColor: 'var(--line-2) transparent', minHeight: 0 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
              background: msg.role === 'user' ? 'var(--text)' : 'linear-gradient(135deg, var(--accent) 0%, var(--info) 100%)',
              fontSize: 12, fontWeight: 600, color: msg.role === 'user' ? 'var(--bg)' : 'var(--accent-ink)',
            }}>
              {msg.role === 'user' ? (user?.email?.[0]?.toUpperCase() || 'U') : '❆'}
            </div>
            <div className={`bubble ${msg.role}`}>
              {msg.content.split('\n').map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--accent) 0%, var(--info) 100%)', fontSize: 12 }}>❆</div>
            <div className="bubble ai" style={{ padding: '14px 16px' }}>
              <Loader2 size={16} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && !loading && (
        <div style={{ flexShrink: 0, padding: '12px 0 8px' }}>
          <div className="t-label" style={{ marginBottom: 8 }}>{t('assistant.suggestions')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {suggestions.map((q, i) => (
              <button key={i} className="chip" onClick={() => { setInput(q); inputRef.current?.focus(); }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            ref={inputRef}
            style={{
              flex: 1, background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '10px 12px', fontSize: 13.5,
              color: 'var(--text)', resize: 'none', minHeight: 44, maxHeight: 120,
              fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--line)'}
            placeholder={t('assistant.inputPlaceholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="btn primary"
            style={{ padding: '0 16px', alignSelf: 'flex-end', height: 44 }}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          {t('assistant.enterHint')}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
