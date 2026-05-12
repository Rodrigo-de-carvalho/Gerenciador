import { createContext, useContext, useReducer, useEffect } from 'react';

const STORAGE_KEY = 'gerenciador_financeiro_data';

const initialState = {
  transactions: [],
  categories: [
    { id: '1', name: 'Salário', type: 'income', color: '#22c55e', icon: '💼' },
    { id: '2', name: 'Freelance', type: 'income', color: '#10b981', icon: '💻' },
    { id: '3', name: 'Investimentos', type: 'income', color: '#3b82f6', icon: '📈' },
    { id: '4', name: 'Outros (Entrada)', type: 'income', color: '#8b5cf6', icon: '💰' },
    { id: '5', name: 'Alimentação', type: 'expense', color: '#f97316', icon: '🍽️' },
    { id: '6', name: 'Transporte', type: 'expense', color: '#f59e0b', icon: '🚗' },
    { id: '7', name: 'Moradia', type: 'expense', color: '#ef4444', icon: '🏠' },
    { id: '8', name: 'Saúde', type: 'expense', color: '#ec4899', icon: '❤️' },
    { id: '9', name: 'Educação', type: 'expense', color: '#06b6d4', icon: '📚' },
    { id: '10', name: 'Lazer', type: 'expense', color: '#a855f7', icon: '🎮' },
    { id: '11', name: 'Compras', type: 'expense', color: '#d946ef', icon: '🛍️' },
    { id: '12', name: 'Outros (Saída)', type: 'expense', color: '#6b7280', icon: '📋' },
  ],
  budgets: [],
  projects: [],
};

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...initialState, ...parsed };
    }
  } catch {
    // ignore
  }
  return initialState;
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
      };
    case 'SET_BUDGET': {
      const existing = state.budgets.find(b => b.categoryId === action.payload.categoryId);
      if (existing) {
        return {
          ...state,
          budgets: state.budgets.map(b =>
            b.categoryId === action.payload.categoryId ? action.payload : b
          ),
        };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    }
    case 'DELETE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter(b => b.categoryId !== action.payload),
      };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        transactions: state.transactions.map(t =>
          t.projectId === action.payload ? { ...t, projectId: null } : t
        ),
      };
    case 'IMPORT_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addTransaction = (transaction) => {
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: { ...transaction, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    });
  };

  const updateTransaction = (transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
  };

  const deleteTransaction = (id) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  };

  const addCategory = (category) => {
    dispatch({
      type: 'ADD_CATEGORY',
      payload: { ...category, id: crypto.randomUUID() },
    });
  };

  const deleteCategory = (id) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  };

  const setBudget = (budget) => {
    dispatch({ type: 'SET_BUDGET', payload: budget });
  };

  const deleteBudget = (categoryId) => {
    dispatch({ type: 'DELETE_BUDGET', payload: categoryId });
  };

  const addProject = (project) => {
    dispatch({
      type: 'ADD_PROJECT',
      payload: { ...project, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    });
  };

  const updateProject = (project) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: project });
  };

  const deleteProject = (id) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  };

  const getSummary = (month, year) => {
    const filtered = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactions: filtered };
  };

  const getProjectSummary = (projectId) => {
    const txs = state.transactions.filter(t => t.projectId === projectId);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactions: txs };
  };

  return (
    <FinanceContext.Provider value={{
      ...state,
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
      dispatch,
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
