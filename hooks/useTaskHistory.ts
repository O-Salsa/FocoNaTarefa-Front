// hooks/useTaskHistory.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hardDeleteTask,
  listCompleted,
  listTrash,
  reopenTask,
  restoreTask,
  type Task,
} from '../src/api/services/task.service';

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

function isExpired(deletedAt?: string, now: number = Date.now()) {
  if (!deletedAt) return false;
  return now >= new Date(deletedAt).getTime() + THIRTY_DAYS_IN_MS;
}

export function useCompletedTasks() {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listCompleted();
      setData(items);
    } catch (e) {
      setData([]);
      console.log('[useCompletedTasks] erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const reopen = useCallback(async (id: string) => {
    setData((prev) => prev.filter((t) => t.id !== id));
    try {
      await reopenTask(id);
    } catch (e) {
      console.log('[useCompletedTasks] reopen erro:', e);
      void fetchData();
    }
  }, [fetchData]);

  return { data, loading, reopen, refresh: fetchData };
}

export function useTrashTasks() {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listTrash();
      setData(items.filter((task) => !isExpired(task.deletedAt)));
    } catch (e) {
      setData([]);
      console.log('[useTrashTasks] erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data.length) return;
    const expired = data.filter((task) => isExpired(task.deletedAt, now));
    if (!expired.length) return;

    setData((prev) => prev.filter((task) => !expired.some((e) => e.id === task.id)));
    expired.forEach((task) => {
      void hardDeleteTask(task.id).catch((e) => console.log('[useTrashTasks] auto hardDelete erro:', e));
    });
  }, [data, now]);

  const restore = useCallback(async (id: string) => {
    setData((prev) => prev.filter((t) => t.id !== id));
    try {
      await restoreTask(id);
    } catch (e) {
      console.log('[useTrashTasks] restore erro:', e);
      void fetchData();
    }
  }, [fetchData]);

  const hardDelete = useCallback(async (id: string) => {
    setData((prev) => prev.filter((t) => t.id !== id));
    try {
      await hardDeleteTask(id);
    } catch (e) {
      console.log('[useTrashTasks] hardDelete erro:', e);
      void fetchData();
    }
  }, [fetchData]);

  const countdowns = useMemo(() => {
    return data.reduce<Record<string, number>>((acc, task) => {
      if (!task.deletedAt) return acc;
      const expiresAt = new Date(task.deletedAt).getTime() + THIRTY_DAYS_IN_MS;
      acc[task.id] = Math.max(0, expiresAt - now);
      return acc;
    }, {});
  }, [data, now]);

  return { data, loading, restore, hardDelete, refresh: fetchData, now, countdowns };
}