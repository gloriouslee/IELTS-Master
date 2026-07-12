'use client';

import { useEffect, useMemo, useState } from 'react';
import { completeActivityAction } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';

export type DailyTask = { id: string; activityType: string; title: string; titleVi: string; minutes: number; href: string; completed: boolean };
const defaults = [
  { activityType: 'vocabulary', title: 'Vocabulary test', titleVi: 'Kiểm tra từ vựng', minutes: 10, href: '/vocabulary' },
  { activityType: 'reading', title: 'Reading practice', titleVi: 'Luyện đọc hiểu', minutes: 15, href: '/reading' },
  { activityType: 'writing', title: 'Writing practice', titleVi: 'Luyện Writing Task 2', minutes: 20, href: '/writing' },
];

export function useDailyPlan(userId?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const key = `ielts-daily-plan-${date}`;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [tasks, setTasks] = useState<DailyTask[]>([]);

  useEffect(() => {
    if (!configured) {
      const saved = localStorage.getItem(key);
      try {
        queueMicrotask(() => setTasks(saved ? JSON.parse(saved) : defaults.map(task => ({ ...task, id: task.activityType, completed: false }))));
      } catch {
        localStorage.removeItem(key);
        queueMicrotask(() => setTasks(defaults.map(task => ({ ...task, id: task.activityType, completed: false }))));
      }
      return;
    }
    if (!userId) return;
    const load = async () => {
      const supabase = createClient();
      await supabase.from('daily_tasks').upsert(defaults.map((task, priority) => ({
        user_id: userId, task_date: date, title: task.title, title_vi: task.titleVi,
        activity_type: task.activityType, target_minutes: task.minutes, target_url: task.href, priority,
      })), { onConflict: 'user_id,task_date,activity_type' });
      const { data, error } = await supabase.from('daily_tasks')
        .select('id,title,title_vi,activity_type,target_minutes,target_url,daily_task_completions(id)')
        .eq('user_id', userId).eq('task_date', date).order('priority');
      if (error) console.error('Unable to load daily plan:', error.message);
      else setTasks((data || []).map(item => ({
        id: item.id, activityType: item.activity_type, title: item.title, titleVi: item.title_vi,
        minutes: item.target_minutes, href: item.target_url,
        completed: Array.isArray(item.daily_task_completions) && item.daily_task_completions.length > 0,
      })));
    };
    void load();
  }, [configured, date, key, userId]);

  const toggle = (id: string) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    const completed = !task.completed;
    setTasks(old => old.map(item => item.id === id ? { ...item, completed } : item));
    if (!configured) {
      const next = tasks.map(item => item.id === id ? { ...item, completed } : item);
      localStorage.setItem(key, JSON.stringify(next));
      return;
    }
    if (!userId) return;
    const sync = async () => {
      const supabase = createClient();
      if (completed) {
        const { error } = await supabase.from('daily_task_completions').upsert({ task_id: id, user_id: userId, xp_earned: 15 }, { onConflict: 'task_id,user_id' });
        if (!error) await completeActivityAction('daily_task', `daily-${date}-${task.activityType}`);
      } else {
        await supabase.from('daily_task_completions').delete().eq('task_id', id).eq('user_id', userId);
      }
    };
    void sync();
  };
  const stats = useMemo(() => ({ completed: tasks.filter(task => task.completed).length, minutes: tasks.filter(task => task.completed).reduce((total, task) => total + task.minutes, 0), total: tasks.reduce((total, task) => total + task.minutes, 0) }), [tasks]);
  return { tasks, toggle, stats };
}
