// hooks/useTaskHistory.ts
import { useEffect, useState } from 'react';
import {
  hardDeleteTask,
  listCompleted,
  reopenTask,
  type Task
} from '../src/api/services/task.service';

export function useCompletedTasks(query: string, periodDays?: number) {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

useEffect(() => {
  let mounted = true;
  (async () => {
    setLoading(true);
    try {
      const items = await listCompleted(query, periodDays);
      if (mounted) setData(items);
    } catch (e) {
      if (mounted) setData([]); // fallback
      console.log('[useCompletedTasks] erro:', e);
    } finally {
      if (mounted) setLoading(false);
    }
  })();
  return () => { mounted = false; };
}, [query, periodDays]);


  const reopen = async (id: string) => {
    // UI otimista
    setData(prev => prev.filter(t => t.id !== id));
    try { await reopenTask(id); } catch { /* opcional: rollback */ }
  };

  return { data, loading, reopen };
}

export function useTrashTasks(query: string, periodDays?: number) {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

useEffect(() => {
  let mounted = true;
  (async () => {
    setLoading(true);
    try {
      const items = await listCompleted(query, periodDays);
      if (mounted) setData(items);
    } catch (e) {
      if (mounted) setData([]); // fallback
      console.log('[useCompletedTasks] erro:', e);
    } finally {
      if (mounted) setLoading(false);
    }
  })();
  return () => { mounted = false; };
}, [query, periodDays]);


  const restore = async (id: string) => {
    setData(prev => prev.filter(t => t.id !== id));
    try { await reopenTask(id); } catch {}
  };

  const hardDelete = async (id: string) => {
    setData(prev => prev.filter(t => t.id !== id));
    try { await hardDeleteTask(id); } catch {}
  };

  return { data, loading, restore, hardDelete };
}
