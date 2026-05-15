import { createContext, useContext, useState, useCallback } from 'react';

const KEY = 'cifra_goals_v2';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));

const GoalContext = createContext(null);

export function GoalProvider({ children }) {
  const [goals, setGoals] = useState(load);

  const addGoal = useCallback((projectId, meta = {}) => {
    setGoals(prev => {
      const next = [
        ...prev.filter(g => g.projectId !== projectId),
        { projectId, targetAmount: meta.targetAmount || null, deadline: meta.deadline || null },
      ];
      save(next);
      return next;
    });
  }, []);

  const updateGoal = useCallback((projectId, meta) => {
    setGoals(prev => {
      const next = prev.map(g => g.projectId === projectId ? { ...g, ...meta } : g);
      save(next);
      return next;
    });
  }, []);

  const removeGoal = useCallback((projectId) => {
    setGoals(prev => {
      const next = prev.filter(g => g.projectId !== projectId);
      save(next);
      return next;
    });
  }, []);

  const isGoal = useCallback((projectId) => goals.some(g => g.projectId === projectId), [goals]);
  const getGoalMeta = useCallback((projectId) => goals.find(g => g.projectId === projectId) || null, [goals]);
  const goalProjectIds = new Set(goals.map(g => g.projectId));

  return (
    <GoalContext.Provider value={{ goals, goalProjectIds, addGoal, updateGoal, removeGoal, isGoal, getGoalMeta }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoals must be used within GoalProvider');
  return ctx;
}
