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
  createdAt: row.created_at,
});

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgetsState] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setCategories([]);
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [txRes, catRes, projRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
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
    }).select().single();
    if (data) setTransactions(prev => [mapTx(data), ...prev]);
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
    }).select().single();
    if (data) setProjects(prev => [...prev, mapProject(data)]);
  };

  const updateProject = async (proj) => {
    const { data } = await supabase.from('projects').update({
      name: proj.name,
      description: proj.description || null,
      icon: proj.icon,
      color: proj.color,
    }).eq('id', proj.id).select().single();
    if (data) setProjects(prev => prev.map(p => p.id === data.id ? mapProject(data) : p));
  };

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.map(t => t.projectId === id ? { ...t, projectId: null } : t));
  };

  const getSummary = (month, year) => {
    const filtered = transactions.filter(t => {
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
      budgets,
      loading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      deleteCategory,
      setBudget,
      deleteBudget,
      addProject,
      updateProject,
      deleteProject,
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
