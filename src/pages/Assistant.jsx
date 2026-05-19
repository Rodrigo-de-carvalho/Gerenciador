import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Trash2, Loader2, Lock, Settings } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, MONTHS, getCurrentMonthYear } from '../utils/formatters';
import { useI18n } from '../i18n';

function buildSystemPrompt({ income, expense, balance, topCategories, projects, cards, month, year, getCardBill }) {
  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0.0';
  const monthName = MONTHS[month - 1];
  const categoryLines = topCategories.slice(0, 5).map(c => `  - ${c.name}: ${formatCurrency(c.total)}`).join('\n');
  const projectLines = projects.filter(p => p.includeInOverview !== false).map(p => `  - ${p.icon} ${p.name}`).join('\n') || '  Nenhum projeto ativo';
  const cardLines = cards.length > 0
    ? cards.map(c => { const bill = getCardBill(c.id, month, year); return `  - ${c.icon} ${c.name}: fatura ${formatCurrency(bill.total)}`; }).join('\n')
    : '  Nenhum cartão cadastrado';
  return `Você é um assistente financeiro pessoal inteligente e amigável, especialista em finanças pessoais brasileiras.\n\nContexto financeiro atual do usuário:\n- Mês: ${monthName} ${year}\n- Entradas: ${formatCurrency(income)}\n- Saídas: ${formatCurrency(expense)}\n- Saldo: ${formatCurrency(balance)}\n- Taxa de poupança: ${savingsRate}%\n- Maiores gastos por categoria:\n${categoryLines || '  Nenhum gasto registrado'}\n- Projetos ativos:\n${projectLines}\n- Cartões:\n${cardLines}\n\nResponda sempre em português brasileiro. Seja direto, prático e personalizado com base nos dados financeiros acima.`;
}

export default function Assistant() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { transactions, categories, projects, cards, getSummary, getCardBill } = useFinance();
  const now = getCurrentMonthYear();
  const aiEnabled = user?.user_metadata?.ai_assistant_enabled === true;

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: t('assistant.initialMessage'),
  }]);
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
    const topCategories = Object.entries(catTotals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    return buildSystemPrompt({ income, expense, balance, topCategories, projects, cards, month: now.month, year: now.year, getCardBill });
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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const conversationHistory = newMessages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, systemPrompt }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`);
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'Não foi possível obter resposta.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `${t('assistant.errorMessage')} ${err.message ? `(${err.message})` : ''}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearConversation = () => {
    setMessages([{ role: 'assistant', content: t('assistant.conversationReset') }]);
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
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
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
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          {t('assistant.enterHint')}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
