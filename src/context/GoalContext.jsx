import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const GoalContext = createContext(null);

export function GoalProvider({ children }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (!user) { setGoals([]); return; }
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setGoals(data.map(r => ({
          projectId: r.project_id,
          targetAmount: r.target_amount,
          deadline: r.deadline,
          id: r.id,
        })));
      });
  }, [user]);

  const addGoal = useCallback(async (projectId, meta = {}) => {
    if (!user) return;
    const { data, error } = await supabase.from('goals').insert({
      user_id: user.id,
      project_id: projectId,
      target_amount: meta.targetAmount || null,
      deadline: meta.deadline || null,
    }).select().single();
    if (!error && data) {
      setGoals(prev => [
        ...prev.filter(g => g.projectId !== projectId),
        { projectId: data.project_id, targetAmount: data.target_amount, deadline: data.deadline, id: data.id },
      ]);
    }
  }, [user]);

  const updateGoal = useCallback(async (projectId, meta) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('goals')
      .update({ target_amount: meta.targetAmount ?? null, deadline: meta.deadline ?? null })
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .select().single();
    if (!error && data) {
      setGoals(prev => prev.map(g => g.projectId === projectId
        ? { ...g, targetAmount: data.target_amount, deadline: data.deadline }
        : g
      ));
    }
  }, [user]);

  const removeGoal = useCallback(async (projectId) => {
    if (!user) return;
    await supabase.from('goals').delete().eq('project_id', projectId).eq('user_id', user.id);
    setGoals(prev => prev.filter(g => g.projectId !== projectId));
  }, [user]);

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
