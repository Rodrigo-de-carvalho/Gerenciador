import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [cards, setCards] = useState([]);
  const [budgets, setBudgetsState] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setCategories([]);
      setProjects([]);
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [txRes, catRes, projRes, cardsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('cards').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ]);

      let cats = catRes.data?.map(mapCat) || [];

      if (cats.length === 0) {
        const { data: inserted } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
          .select();
        cats = inserted?.map(mapCat) || [];
      }

      setTransactions(txRes.data?.map(mapTx) || []);
      setCategories(cats);
      setProjects(projRes.data?.map(mapProject) || []);
      setCards(cardsRes.data?.map(mapCard) || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTransaction = async (tx) => {
    const { data } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: tx.type,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      category_id: tx.categoryId || null,
      project_id: tx.projectId || null,
      notes: tx.notes || null,
      card_id: tx.cardId || null,
      paid: tx.cardId ? false : true,
    }).select().single();
    if (data) setTransactions(prev => [mapTx(data), ...prev]);
  };

  const addInstallmentTransaction = async (tx, installmentCount) => {
    const groupId = crypto.randomUUID();
    const perAmount = tx.amount / installmentCount;
    const rows = [];

    for (let i = 0; i < installmentCount; i++) {
      const d = new Date(tx.date + 'T00:00:00');
      d.setMonth(d.getMonth() + i);
      const dateStr = d.toISOString().split('T')[0];
      rows.push({
        user_id: user.id,
        type: tx.type,
        description: `${tx.description} (${i + 1}/${installmentCount})`,
        amount: perAmount,
        date: dateStr,
        category_id: tx.categoryId || null,
        project_id: tx.projectId || null,
        notes: tx.notes || null,
        card_id: tx.cardId || null,
        installment_group_id: groupId,
        installment_total: installmentCount,
        installment_current: i + 1,
        paid: false,
      });
    }

    const { data } = await supabase.from('transactions').insert(rows).select();
    if (data) {
      const mapped = data.map(mapTx);
      setTransactions(prev => [...mapped, ...prev]);
    }
  };

  const updateTransaction = async (tx) => {
    const { data } = await supabase.from('transactions').update({
      type: tx.type,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      category_id: tx.categoryId || null,
      project_id: tx.projectId || null,
      notes: tx.notes || null,
      card_id: tx.cardId || null,
      paid: tx.paid ?? true,
    }).eq('id', tx.id).select().single();
    if (data) setTransactions(prev => prev.map(t => t.id === data.id ? mapTx(data) : t));
  };

  const deleteTransaction = async (id) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addCategory = async (cat) => {
    const { data } = await supabase.from('categories').insert({
      user_id: user.id,
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon,
    }).select().single();
    if (data) setCategories(prev => [...prev, mapCat(data)]);
  };

  const deleteCategory = async (id) => {
    await supabase.from('categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const setBudget = (budget) => {
    setBudgetsState(prev => {
      const exists = prev.find(b => b.categoryId === budget.categoryId);
      if (exists) return prev.map(b => b.categoryId === budget.categoryId ? budget : b);
      return [...prev, budget];
    });
  };

  const deleteBudget = (categoryId) => {
    setBudgetsState(prev => prev.filter(b => b.categoryId !== categoryId));
  };

  const addProject = async (proj) => {
    const { data } = await supabase.from('projects').insert({
      user_id: user.id,
      name: proj.name,
      description: proj.description || null,
      icon: proj.icon,
      color: proj.color,
      include_in_overview: proj.includeInOverview ?? true,
    }).select().single();
    if (data) {
      const mapped = mapProject(data);
      setProjects(prev => [...prev, mapped]);
      return mapped;
    }
    return null;
  };

  const updateProject = async (proj) => {
    const { data } = await supabase.from('projects').update({
      name: proj.name,
      description: proj.description || null,
      icon: proj.icon,
      color: proj.color,
      include_in_overview: proj.includeInOverview ?? true,
    }).eq('id', proj.id).select().single();
    if (data) setProjects(prev => prev.map(p => p.id === data.id ? mapProject(data) : p));
  };

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.map(t => t.projectId === id ? { ...t, projectId: null } : t));
  };

  const addCard = async (card) => {
    const { data } = await supabase.from('cards').insert({
      user_id: user.id,
      name: card.name,
      limit_amount: card.limitAmount || null,
      closing_day: card.closingDay ?? 1,
      color: card.color,
      icon: card.icon,
    }).select().single();
    if (data) setCards(prev => [...prev, mapCard(data)]);
  };

  const updateCard = async (card) => {
    const { data } = await supabase.from('cards').update({
      name: card.name,
      limit_amount: card.limitAmount || null,
      closing_day: card.closingDay ?? 1,
      color: card.color,
      icon: card.icon,
    }).eq('id', card.id).select().single();
    if (data) setCards(prev => prev.map(c => c.id === data.id ? mapCard(data) : c));
  };

  const deleteCard = async (id) => {
    await supabase.from('cards').delete().eq('id', id);
    setCards(prev => prev.filter(c => c.id !== id));
    setTransactions(prev => prev.map(t => t.cardId === id ? { ...t, cardId: null } : t));
  };

  const getCardBill = (cardId, month, year) => {
    const txs = transactions.filter(t => {
      if (t.cardId !== cardId) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const paid = txs.length > 0 && txs.every(t => t.paid);
    return { transactions: txs, total, paid };
  };

  const payCardBill = async (cardId, month, year) => {
    const bill = getCardBill(cardId, month, year);
    const unpaid = bill.transactions.filter(t => !t.paid);
    if (unpaid.length === 0) return;

    const ids = unpaid.map(t => t.id);
    await supabase.from('transactions').update({ paid: true }).in('id', ids);
    setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, paid: true } : t));
  };

  const getSummary = (month, year) => {
    const excludedProjectIds = new Set(
      projects.filter(p => p.includeInOverview === false).map(p => p.id)
    );
    const filtered = transactions.filter(t => {
      if (t.projectId && excludedProjectIds.has(t.projectId)) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactions: filtered };
  };

  const getProjectSummary = (projectId) => {
    const txs = transactions.filter(t => t.projectId === projectId);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactions: txs };
  };

  return (
    <FinanceContext.Provider value={{
      transactions,
      categories,
      projects,
      cards,
      budgets,
      loading,
      addTransaction,
      addInstallmentTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      deleteCategory,
      setBudget,
      deleteBudget,
      addProject,
      updateProject,
      deleteProject,
      addCard,
      updateCard,
      deleteCard,
      getCardBill,
      payCardBill,
      getSummary,
      getProjectSummary,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
