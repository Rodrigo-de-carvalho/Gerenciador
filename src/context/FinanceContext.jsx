import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DEFAULT_CATEGORIES = [
  { name: 'Salário',          type: 'income',  color: '#22c55e', icon: '💼' },
  { name: 'Freelance',        type: 'income',  color: '#10b981', icon: '💻' },
  { name: 'Investimentos',    type: 'income',  color: '#3b82f6', icon: '📈' },
  { name: 'Outros (Entrada)', type: 'income',  color: '#8b5cf6', icon: '💰' },
  { name: 'Alimentação',      type: 'expense', color: '#f97316', icon: '🍽️' },
  { name: 'Transporte',       type: 'expense', color: '#f59e0b', icon: '🚗' },
  { name: 'Moradia',          type: 'expense', color: '#ef4444', icon: '🏠' },
  { name: 'Saúde',            type: 'expense', color: '#ec4899', icon: '❤️' },
  { name: 'Educação',         type: 'expense', color: '#06b6d4', icon: '📚' },
  { name: 'Lazer',            type: 'expense', color: '#a855f7', icon: '🎮' },
  { name: 'Compras',          type: 'expense', color: '#d946ef', icon: '🛍️' },
  { name: 'Outros (Saída)',   type: 'expense', color: '#6b7280', icon: '📋' },
];

// Arredonda para 2 casas decimais sem erros de ponto flutuante.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Advances a date string by one month, clamping day to month length
function advanceOneMonth(dateStr, dayOfMonth) {
  const [y, m] = dateStr.split('-').map(Number);
  const newMonth = m === 12 ? 1 : m + 1;
  const newYear  = m === 12 ? y + 1 : y;
  // new Date(Y, M, 0) with 1-indexed M gives last day of that month
  const lastDay = new Date(newYear, newMonth, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const mapTx = (row) => ({
  id: row.id,
  type: row.type,
  description: row.description,
  amount: Number(row.amount),
  date: row.date,
  categoryId: row.category_id,
  projectId: row.project_id,
  notes: row.notes || '',
  cardId: row.card_id || null,
  installmentTotal: row.installment_total ?? 1,
  installmentCurrent: row.installment_current ?? 1,
  installmentGroupId: row.installment_group_id || null,
  paid: row.paid ?? true,
  createdAt: row.created_at,
});

const mapCat = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  color: row.color,
  icon: row.icon,
});

const mapProject = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  icon: row.icon,
  color: row.color,
  includeInOverview: row.include_in_overview ?? true,
  createdAt: row.created_at,
});

const mapCard = (row) => ({
  id: row.id,
  name: row.name,
  limitAmount: row.limit_amount ? Number(row.limit_amount) : null,
  closingDay: row.closing_day ?? 1,
  color: row.color,
  icon: row.icon,
  createdAt: row.created_at,
});

const mapBudget = (row) => ({
  id: row.id,
  categoryId: row.category_id,
  amount: Number(row.amount),
});

const mapRecurring = (row) => ({
  id: row.id,
  type: row.type,
  description: row.description,
  amount: Number(row.amount),
  categoryId: row.category_id,
  dayOfMonth: row.day_of_month,
  active: row.active,
  nextDate: row.next_date,
});

const mapInvestment = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  invested: Number(row.invested),
  currentValue: Number(row.current_value),
  notes: row.notes || '',
  date: row.date,
});

const mapLoan = (row) => ({
  id: row.id,
  direction: row.direction,          // 'owe' (eu devo) | 'owed' (me devem)
  counterparty: row.counterparty,
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  dueDate: row.due_date || null,
  notes: row.notes || '',
  createdAt: row.created_at,
});

// ── localStorage cache (stale-while-revalidate) ────────────────────────────
const CACHE_VERSION = 2; // bump this to invalidate all caches after schema changes

function cacheKey(userId) {
  return `cifra_v${CACHE_VERSION}_${userId}`;
}

function readCache(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeCache(userId, data) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch (_) {
    // Ignore QuotaExceededError — cache is best-effort
  }
}

function clearCache(userId) {
  try { localStorage.removeItem(cacheKey(userId)); } catch (_) {}
}

// Trava de sessão: evita que duas execuções concorrentes de loadData (ex.: re-mount
// rápido, troca de sessão) materializem as MESMAS recorrências em duplicidade.
// (A corrida entre dispositivos diferentes só é 100% resolvida no servidor —
//  ver nota no README sobre constraint única / cron.)
let recurringProcessing = false;

// ── Context ─────────────────────────────────────────────────────────────────

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories]     = useState([]);
  const [projects, setProjects]         = useState([]);
  const [cards, setCards]               = useState([]);
  const [budgets, setBudgetsState]      = useState([]);
  const [recurring, setRecurring]       = useState([]);
  const [investments, setInvestments]   = useState([]);
  const [loans, setLoans]               = useState([]);
  // loading=true only on the very first load (no cache). After that the cache
  // fills the UI instantly and the background refresh is invisible.
  const [loading, setLoading]           = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setCategories([]);
      setProjects([]);
      setCards([]);
      setBudgetsState([]);
      setRecurring([]);
      setInvestments([]); // bug fix: investimentos não eram limpos no logout
      setLoans([]);
      setLoading(false);
      return;
    }

    // ── 1. Populate UI from cache immediately (zero network wait) ──────────
    const cached = readCache(user.id);
    if (cached) {
      setTransactions(cached.transactions || []);
      setCategories(cached.categories     || []);
      setProjects(cached.projects         || []);
      setCards(cached.cards               || []);
      setBudgetsState(cached.budgets      || []);
      setRecurring(cached.recurring       || []);
      setInvestments(cached.investments   || []);
      setLoans(cached.loans               || []);
      setLoading(false); // hide spinner — show cached data right away
    } else {
      setLoading(true);  // first-ever load, no cache yet
    }

    // ── 2. Fetch fresh data from Supabase in background ────────────────────
    try {
      const [txRes, catRes, projRes, cardsRes, budgetsRes, recurringRes, invRes, loansRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('cards').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('recurring').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('loans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      let cats = catRes.data?.map(mapCat) || [];
      if (cats.length === 0 && !catRes.error) {
        const { data: inserted } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
          .select();
        cats = inserted?.map(mapCat) || [];
      }

      // Process overdue recurring transactions (com trava anti-duplicação)
      const todayStr = new Date().toISOString().split('T')[0];
      const dueRecs  = (recurringRes.data || []).filter(r => r.active && r.next_date <= todayStr);
      let allTxs     = txRes.data?.map(mapTx) || [];
      const recurringData = recurringRes.data?.map(mapRecurring) || [];

      if (dueRecs.length && !recurringProcessing) {
        recurringProcessing = true;
        try {
          const newTxRows  = [];
          const nextDates  = {};

          for (const rec of dueRecs) {
            let nextStr = rec.next_date;
            while (nextStr <= todayStr) {
              newTxRows.push({
                user_id:     user.id,
                type:        rec.type,
                description: rec.description,
                amount:      rec.amount,
                date:        nextStr,
                category_id: rec.category_id,
                notes:       null,
                paid:        true,
              });
              nextStr = advanceOneMonth(nextStr, rec.day_of_month);
            }
            nextDates[rec.id] = nextStr;
          }

          if (newTxRows.length) {
            const { data: inserted } = await supabase.from('transactions').insert(newTxRows).select();
            if (inserted) allTxs = [...inserted.map(mapTx), ...allTxs];
          }

          await Promise.all(
            Object.entries(nextDates).map(([id, next_date]) =>
              supabase.from('recurring').update({ next_date }).eq('id', id)
            )
          );

          recurringData.forEach(r => {
            if (nextDates[r.id]) r.nextDate = nextDates[r.id];
          });
        } finally {
          recurringProcessing = false;
        }
      }

      const freshProjects    = projRes.data?.map(mapProject)       || [];
      const freshCards       = cardsRes.data?.map(mapCard)          || [];
      const freshBudgets     = budgetsRes.data?.map(mapBudget)      || [];
      const freshInvestments = invRes.data?.map(mapInvestment)      || [];
      const freshLoans       = loansRes.data?.map(mapLoan)          || [];

      // ── 3. Update UI with fresh data (silently replaces cached view) ──────
      setTransactions(allTxs);
      setCategories(cats);
      setProjects(freshProjects);
      setCards(freshCards);
      setBudgetsState(freshBudgets);
      setRecurring(recurringData);
      setInvestments(freshInvestments);
      setLoans(freshLoans);

      // ── 4. Persist fresh data to cache for next reload ────────────────────
      writeCache(user.id, {
        transactions: allTxs,
        categories:   cats,
        projects:     freshProjects,
        cards:        freshCards,
        budgets:      freshBudgets,
        recurring:    recurringData,
        investments:  freshInvestments,
        loans:        freshLoans,
      });
    } catch (e) {
      // bug fix: loadData não tinha catch — uma falha de rede/token sumia em silêncio.
      // Mantém o que já veio do cache e registra o erro para diagnóstico.
      console.error('[Finance] Falha ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Transactions ──────────────────────────────────────────

  // Otimista: a transação aparece na lista na hora (sem esperar o servidor) e só
  // é desfeita se o insert falhar — isso é o que faz "registrar" parecer instantâneo.
  const addTransaction = useCallback((tx) => {
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic = mapTx({
      id: tempId,
      type: tx.type,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      category_id: tx.categoryId || null,
      project_id: tx.projectId || null,
      notes: tx.notes || null,
      card_id: tx.cardId || null,
      paid: tx.cardId ? false : true,
      created_at: new Date().toISOString(),
    });
    setTransactions(prev => [optimistic, ...prev]);

    const persist = async () => {
      const { data, error } = await supabase.from('transactions').insert({
        user_id:     user.id,
        type:        tx.type,
        description: tx.description,
        amount:      tx.amount,
        date:        tx.date,
        category_id: tx.categoryId || null,
        project_id:  tx.projectId || null,
        notes:       tx.notes || null,
        card_id:     tx.cardId || null,
        paid:        tx.cardId ? false : true,
      }).select().single();
      if (error) {
        setTransactions(prev => prev.filter(t => t.id !== tempId));
        throw new Error(error.message);
      }
      const real = mapTx(data);
      setTransactions(prev => prev.map(t => t.id === tempId ? real : t));
      return real;
    };

    return { optimistic, persist: persist() };
  }, [user]);

  const addInstallmentTransaction = useCallback(async (tx, installmentCount) => {
    const groupId = crypto.randomUUID();
    // bug fix de dinheiro: arredonda cada parcela e joga a sobra de centavos na 1ª,
    // garantindo que a soma das parcelas seja exatamente o valor digitado.
    const perAmount   = round2(tx.amount / installmentCount);
    const firstAmount = round2(tx.amount - perAmount * (installmentCount - 1));
    const originalDay = parseInt(tx.date.split('-')[2], 10);
    const rows = [];
    let installDate = tx.date;
    for (let i = 0; i < installmentCount; i++) {
      if (i > 0) installDate = advanceOneMonth(installDate, originalDay);
      rows.push({
        user_id:              user.id,
        type:                 tx.type,
        description:          `${tx.description} (${i + 1}/${installmentCount})`,
        amount:               i === 0 ? firstAmount : perAmount,
        date:                 installDate,
        category_id:          tx.categoryId || null,
        project_id:           tx.projectId || null,
        notes:                tx.notes || null,
        card_id:              tx.cardId || null,
        installment_group_id: groupId,
        installment_total:    installmentCount,
        installment_current:  i + 1,
        paid:                 false,
      });
    }
    const { data, error } = await supabase.from('transactions').insert(rows).select();
    if (error) throw new Error(error.message);
    if (data) setTransactions(prev => [...data.map(mapTx), ...prev]);
  }, [user]);

  const bulkAddTransactions = useCallback(async (txArray) => {
    if (!txArray.length) return [];
    const rows = txArray.map(tx => ({
      user_id:     user.id,
      type:        tx.type,
      description: tx.description,
      amount:      tx.amount,
      date:        tx.date,
      category_id: tx.categoryId || null,
      card_id:     tx.cardId     || null,
      notes:       null,
      // Credit card transactions are unpaid until the bill is settled.
      // Account/cash transactions are considered paid immediately.
      paid: tx.cardId ? false : true,
    }));
    const { data, error } = await supabase.from('transactions').insert(rows).select();
    if (error) throw new Error(error.message);
    const mapped = data?.map(mapTx) || [];
    if (mapped.length) setTransactions(prev => [...mapped, ...prev]);
    return mapped; // returns the full mapped array so callers can get IDs
  }, [user]);

  const bulkDeleteTransactions = useCallback(async (ids) => {
    if (!ids?.length) return;
    const { error } = await supabase.from('transactions').delete().in('id', ids);
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
  }, []);

  const updateTransaction = useCallback(async (tx) => {
    const { data, error } = await supabase.from('transactions').update({
      type:        tx.type,
      description: tx.description,
      amount:      tx.amount,
      date:        tx.date,
      category_id: tx.categoryId || null,
      project_id:  tx.projectId || null,
      notes:       tx.notes || null,
      card_id:     tx.cardId || null,
      paid:        tx.paid ?? true,
    }).eq('id', tx.id).select().single();
    if (error) throw new Error(error.message);
    if (data) setTransactions(prev => prev.map(t => t.id === data.id ? mapTx(data) : t));
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Categories ────────────────────────────────────────────

  const addCategory = useCallback(async (cat) => {
    const { data, error } = await supabase.from('categories').insert({
      user_id: user.id,
      name:    cat.name,
      type:    cat.type,
      color:   cat.color,
      icon:    cat.icon,
    }).select().single();
    if (error) throw new Error(error.message);
    if (data) setCategories(prev => [...prev, mapCat(data)]);
    return mapCat(data);
  }, [user]);

  const deleteCategory = useCallback(async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Budgets ───────────────────────────────────────────────

  const setBudget = useCallback(async (budget) => {
    const { data, error } = await supabase.from('budgets').upsert(
      { user_id: user.id, category_id: budget.categoryId, amount: budget.amount },
      { onConflict: 'user_id,category_id' }
    ).select().single();
    if (error) throw new Error(error.message);
    if (data) {
      setBudgetsState(prev => {
        const exists = prev.find(b => b.categoryId === data.category_id);
        const mapped = mapBudget(data);
        return exists ? prev.map(b => b.categoryId === data.category_id ? mapped : b) : [...prev, mapped];
      });
    }
  }, [user]);

  const deleteBudget = useCallback(async (categoryId) => {
    const { error } = await supabase.from('budgets').delete().eq('user_id', user.id).eq('category_id', categoryId);
    if (error) throw new Error(error.message);
    setBudgetsState(prev => prev.filter(b => b.categoryId !== categoryId));
  }, [user]);

  // ── Recurring ─────────────────────────────────────────────

  const addRecurring = useCallback(async (rec) => {
    const { data, error } = await supabase.from('recurring').insert({
      user_id:     user.id,
      type:        rec.type,
      description: rec.description,
      amount:      rec.amount,
      category_id: rec.categoryId || null,
      day_of_month: rec.dayOfMonth,
      active:      true,
      next_date:   rec.nextDate,
    }).select().single();
    if (error) throw new Error(error.message);
    if (data) setRecurring(prev => [...prev, mapRecurring(data)]);
    return mapRecurring(data);
  }, [user]);

  const updateRecurring = useCallback(async (rec) => {
    const { data, error } = await supabase.from('recurring').update({
      type:        rec.type,
      description: rec.description,
      amount:      rec.amount,
      category_id: rec.categoryId || null,
      day_of_month: rec.dayOfMonth,
      active:      rec.active,
      next_date:   rec.nextDate,
    }).eq('id', rec.id).select().single();
    if (error) throw new Error(error.message);
    if (data) setRecurring(prev => prev.map(r => r.id === data.id ? mapRecurring(data) : r));
  }, []);

  const deleteRecurring = useCallback(async (id) => {
    const { error } = await supabase.from('recurring').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setRecurring(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleRecurring = useCallback(async (id) => {
    const rec = recurring.find(r => r.id === id);
    if (!rec) return;
    const { data, error } = await supabase.from('recurring').update({ active: !rec.active }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    if (data) setRecurring(prev => prev.map(r => r.id === data.id ? mapRecurring(data) : r));
  }, [recurring]);

  // ── Projects ──────────────────────────────────────────────

  const addProject = useCallback(async (proj) => {
    const { data, error } = await supabase.from('projects').insert({
      user_id:             user.id,
      name:                proj.name,
      description:         proj.description || null,
      icon:                proj.icon || '🏗️',
      color:               proj.color || '#3b82f6',
      include_in_overview: proj.includeInOverview ?? true,
    }).select().single();
    if (error) throw new Error(error.message);
    const mapped = mapProject(data);
    setProjects(prev => [...prev, mapped]);
    return mapped;
  }, [user]);

  const updateProject = useCallback(async (proj) => {
    const { data, error } = await supabase.from('projects').update({
      name:                proj.name,
      description:         proj.description || null,
      icon:                proj.icon,
      color:               proj.color,
      include_in_overview: proj.includeInOverview ?? true,
    }).eq('id', proj.id).select().single();
    if (error) throw new Error(error.message);
    if (data) setProjects(prev => prev.map(p => p.id === data.id ? mapProject(data) : p));
  }, []);

  const deleteProject = useCallback(async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setProjects(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.map(t => t.projectId === id ? { ...t, projectId: null } : t));
  }, []);

  // ── Cards ─────────────────────────────────────────────────

  const addCard = useCallback(async (card) => {
    const { data, error } = await supabase.from('cards').insert({
      user_id:      user.id,
      name:         card.name,
      limit_amount: card.limitAmount || null,
      closing_day:  card.closingDay ?? 1,
      color:        card.color,
      icon:         card.icon,
    }).select().single();
    if (error) throw new Error(error.message);
    if (data) setCards(prev => [...prev, mapCard(data)]);
  }, [user]);

  const updateCard = useCallback(async (card) => {
    const { data, error } = await supabase.from('cards').update({
      name:         card.name,
      limit_amount: card.limitAmount || null,
      closing_day:  card.closingDay ?? 1,
      color:        card.color,
      icon:         card.icon,
    }).eq('id', card.id).select().single();
    if (error) throw new Error(error.message);
    if (data) setCards(prev => prev.map(c => c.id === data.id ? mapCard(data) : c));
  }, []);

  const deleteCard = useCallback(async (id) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setCards(prev => prev.filter(c => c.id !== id));
    setTransactions(prev => prev.map(t => t.cardId === id ? { ...t, cardId: null } : t));
  }, []);

  // Fatura do cartão considerando o DIA DE FECHAMENTO (bug fix: antes usava só o
  // mês-calendário e ignorava o closingDay, mesmo a UI mostrando "Fecha dia X").
  // A fatura de (month/year) inclui as compras feitas DEPOIS do fechamento do mês
  // anterior até o fechamento deste mês (inclusive).
  const getCardBill = useCallback((cardId, month, year) => {
    const card = cards.find(c => c.id === cardId);
    const closingDay = card?.closingDay;
    let txs;
    if (closingDay && closingDay >= 1 && closingDay <= 28) {
      const end   = new Date(year, month - 1, closingDay, 23, 59, 59, 999); // fechamento deste mês
      const start = new Date(year, month - 2, closingDay, 23, 59, 59, 999); // fechamento do mês anterior
      txs = transactions.filter(t => {
        if (t.cardId !== cardId) return false;
        const d = new Date(t.date + 'T00:00:00');
        return d > start && d <= end;
      });
    } else {
      // sem dia de fechamento válido: cai no comportamento por mês-calendário
      txs = transactions.filter(t => {
        if (t.cardId !== cardId) return false;
        const d = new Date(t.date + 'T00:00:00');
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const paid  = txs.length > 0 && txs.every(t => t.paid);
    return { transactions: txs, total, paid };
  }, [transactions, cards]);

  const payCardBill = useCallback(async (cardId, month, year) => {
    const bill   = getCardBill(cardId, month, year);
    const unpaid = bill.transactions.filter(t => !t.paid);
    if (unpaid.length === 0) return;
    const ids = unpaid.map(t => t.id);
    // bug fix: checa o erro do Supabase (antes era engolido e a UI mentia "pago").
    const { error } = await supabase.from('transactions').update({ paid: true }).in('id', ids);
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, paid: true } : t));
  }, [getCardBill]);

  // ── Investimentos ─────────────────────────────────────────

  const addInvestment = useCallback(async (data) => {
    const { data: row, error } = await supabase.from('investments').insert({
      user_id:       user.id,
      name:          data.name,
      type:          data.type,
      invested:      data.invested,
      current_value: data.currentValue,
      notes:         data.notes || null,
      date:          data.date || new Date().toISOString().split('T')[0],
    }).select().single();
    if (error) throw new Error(error.message);
    const mapped = mapInvestment(row);
    setInvestments(prev => [mapped, ...prev]);
    return mapped;
  }, [user]);

  const updateInvestment = useCallback(async (data) => {
    const { data: row, error } = await supabase.from('investments').update({
      name:          data.name,
      type:          data.type,
      invested:      data.invested,
      current_value: data.currentValue,
      notes:         data.notes || null,
    }).eq('id', data.id).eq('user_id', user.id).select().single();
    if (error) throw new Error(error.message);
    const mapped = mapInvestment(row);
    setInvestments(prev => prev.map(i => i.id === data.id ? mapped : i));
    return mapped;
  }, [user]);

  const deleteInvestment = useCallback(async (id) => {
    const { error } = await supabase.from('investments').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    setInvestments(prev => prev.filter(i => i.id !== id));
  }, [user]);

  // ── Empréstimos ───────────────────────────────────────────
  // Mesmo padrão de insert/update/delete de addCard/updateCard/deleteCard.

  const addLoan = useCallback(async (data) => {
    const { data: row, error } = await supabase.from('loans').insert({
      user_id:      user.id,
      direction:    data.direction,
      counterparty: data.counterparty,
      total_amount: data.totalAmount,
      paid_amount:  data.paidAmount || 0,
      due_date:     data.dueDate || null,
      notes:        data.notes || null,
    }).select().single();
    if (error) throw new Error(error.message);
    if (row) setLoans(prev => [mapLoan(row), ...prev]);
  }, [user]);

  const updateLoan = useCallback(async (data) => {
    // paid_amount não é editado aqui — só evolui via registerLoanPayment.
    const { data: row, error } = await supabase.from('loans').update({
      direction:    data.direction,
      counterparty: data.counterparty,
      total_amount: data.totalAmount,
      due_date:     data.dueDate || null,
      notes:        data.notes || null,
    }).eq('id', data.id).select().single();
    if (error) throw new Error(error.message);
    if (row) setLoans(prev => prev.map(l => l.id === row.id ? mapLoan(row) : l));
  }, []);

  const deleteLoan = useCallback(async (id) => {
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setLoans(prev => prev.filter(l => l.id !== id));
  }, []);

  // Registra um pagamento de empréstimo: cria uma transação normal (reaproveitando
  // addTransaction, sem cardId) e só então incrementa o paid_amount — assim, se a
  // transação falhar, o saldo do empréstimo não fica adiantado. Sem soma paralela
  // de saldo: o impacto no caixa vem naturalmente da transação criada.
  const registerLoanPayment = useCallback(async (loanId, amount) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Empréstimo não encontrado.');
    const remaining = round2(loan.totalAmount - loan.paidAmount);
    const pay = round2(Math.min(amount, remaining));
    if (!(pay > 0)) return;

    // 1) Transação normal — saída se eu devo, entrada se me devem.
    const { persist } = addTransaction({
      type:        loan.direction === 'owe' ? 'expense' : 'income',
      description: `Pagamento de empréstimo — ${loan.counterparty}`,
      amount:      pay,
      date:        new Date().toISOString().split('T')[0],
      categoryId:  null,
      projectId:   null,
      notes:       null,
      cardId:      null,
    });
    await persist;

    // 2) Atualiza o paid_amount (sem ultrapassar o total).
    const newPaid = round2(loan.paidAmount + pay);
    const { data: row, error } = await supabase.from('loans')
      .update({ paid_amount: newPaid }).eq('id', loanId).select().single();
    if (error) throw new Error(error.message);
    if (row) setLoans(prev => prev.map(l => l.id === loanId ? mapLoan(row) : l));
  }, [loans, addTransaction]);

  // ── Exportação de dados (LGPD Art. 18 — Portabilidade) ────

  const exportAllData = useCallback(async () => {
    const [txRes, catRes, projRes, cardRes, goalRes, invRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('projects').select('*').eq('user_id', user.id),
      supabase.from('cards').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('investments').select('*').eq('user_id', user.id),
    ]);
    // Se alguma consulta falhar, sinaliza no export (evita exportar dados parciais
    // rotulados como completos — questão de portabilidade da LGPD).
    const anyError = [txRes, catRes, projRes, cardRes, goalRes, invRes].some(r => r.error);
    return {
      exportDate:   new Date().toISOString(),
      complete:     !anyError,
      transactions: txRes.data  || [],
      categories:   catRes.data  || [],
      projects:     projRes.data || [],
      cards:        cardRes.data || [],
      goals:        goalRes.data || [],
      investments:  invRes.data  || [],
    };
  }, [user]);

  // ── Summaries ─────────────────────────────────────────────

  const getSummary = useCallback((month, year) => {
    const excludedProjectIds = new Set(
      projects.filter(p => p.includeInOverview === false).map(p => p.id)
    );
    const filtered = transactions.filter(t => {
      if (t.projectId && excludedProjectIds.has(t.projectId)) return false;
      // Transações de cartão só entram no resumo após o pagamento da fatura.
      // Antes de pagar (paid: false) são obrigações futuras, não saída de caixa.
      if (t.cardId && !t.paid) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const income  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactions: filtered };
  }, [transactions, projects]);

  /**
   * Saldo acumulado: tudo que entrou menos tudo que saiu, contando todas as
   * transações até o fim do mês selecionado. É o "quanto eu tenho de verdade",
   * que carrega de um mês para o outro em vez de zerar na virada do mês.
   * Segue as mesmas regras do getSummary: ignora projetos fora do geral e
   * faturas de cartão ainda não pagas (obrigações futuras, não saída de caixa).
   */
  const getCumulativeBalance = useCallback((month, year) => {
    const excludedProjectIds = new Set(
      projects.filter(p => p.includeInOverview === false).map(p => p.id)
    );
    // dia 0 do mês seguinte = último dia do mês selecionado
    const cutoff = new Date(year, month, 0, 23, 59, 59, 999);
    let income = 0, expense = 0;
    for (const t of transactions) {
      if (t.projectId && excludedProjectIds.has(t.projectId)) continue;
      if (t.cardId && !t.paid) continue;
      const d = new Date(t.date + 'T00:00:00');
      if (d > cutoff) continue;
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [transactions, projects]);

  /**
   * Retorna o total já comprometido (não pago) em um cartão,
   * considerando TODAS as transações em aberto — mês atual + parcelas futuras.
   * Usado para calcular o limite disponível real.
   */
  const getCardUsedLimit = useCallback((cardId) =>
    transactions
      .filter(t => t.cardId === cardId && !t.paid)
      .reduce((s, t) => s + t.amount, 0)
  , [transactions]);

  const getProjectSummary = useCallback((projectId) => {
    const txs     = transactions.filter(t => t.projectId === projectId);
    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactions: txs };
  }, [transactions]);

  const clearUserCache = useCallback(() => { if (user) clearCache(user.id); }, [user]);

  // Memoiza o objeto do contexto: evita recriar a "value" a cada render e, com os
  // handlers em useCallback, impede re-renders em cascata de toda a árvore.
  const value = useMemo(() => ({
    transactions,
    categories,
    projects,
    cards,
    budgets,
    recurring,
    investments,
    loans,
    loading,
    clearCache: clearUserCache,
    addTransaction,
    addInstallmentTransaction,
    bulkAddTransactions,
    bulkDeleteTransactions,
    updateTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
    setBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleRecurring,
    addProject,
    updateProject,
    deleteProject,
    addCard,
    updateCard,
    deleteCard,
    getCardBill,
    getCardUsedLimit,
    payCardBill,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addLoan,
    updateLoan,
    deleteLoan,
    registerLoanPayment,
    exportAllData,
    getSummary,
    getCumulativeBalance,
    getProjectSummary,
  }), [
    transactions, categories, projects, cards, budgets, recurring, investments, loans, loading,
    clearUserCache, addTransaction, addInstallmentTransaction, bulkAddTransactions,
    bulkDeleteTransactions, updateTransaction, deleteTransaction, addCategory, deleteCategory,
    setBudget, deleteBudget, addRecurring, updateRecurring, deleteRecurring, toggleRecurring,
    addProject, updateProject, deleteProject, addCard, updateCard, deleteCard, getCardBill,
    getCardUsedLimit, payCardBill, addInvestment, updateInvestment, deleteInvestment,
    addLoan, updateLoan, deleteLoan, registerLoanPayment,
    exportAllData, getSummary, getCumulativeBalance, getProjectSummary,
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
