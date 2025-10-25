import { useCallback, useEffect, useState } from 'react';
import {
  hardDeleteTask,
  listCompleted,
  listTrash,
  reopenTask,
  restoreTask,
  type Task
} from '../src/api/services/task.service';

/**
 * HOOK: Tarefas concluídas
 * - lista /api/tasks?status=COMPLETED
 * - permite reabrir (PATCH /{id}/reopen)
 */
export function useCompletedTasks(query?: string, periodDays?: number) {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  /** 🔄 Buscar tarefas concluídas */
  const fetcher = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listCompleted(query, periodDays);
      // Filtra só as concluídas válidas
      setData(items.filter((t) => t.status === 'COMPLETED' && !t.deletedAt));
    } catch (e) {
      console.log('[useCompletedTasks] erro:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [query, periodDays]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  /** ♻️ Reabrir tarefa concluída → volta a ser ACTIVE */
  const reopen = useCallback(async (id: string) => {
    setData((prev) => prev.filter((t) => t.id !== id)); // UI otimista
    try {
      await reopenTask(id);
    } catch (e) {
      console.log('[useCompletedTasks] reopen erro:', e);
      // rollback se falhar
      void fetcher();
    }
  }, [fetcher]);

  return { data, loading, reopen, refresh: fetcher };
}

/**
 * HOOK: Tarefas na Lixeira
 * - lista /api/tasks/trash
 * - restaura (POST /{id}/restore)
 * - exclui definitivamente (DELETE /{id})
 * - calcula contador regressivo de 30 dias até exclusão
 */
export function useTrashTasks(query?: string, periodDays?: number) {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  /** 🔄 Buscar tarefas da lixeira */
  const fetcher = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listTrash(query, periodDays);
      // Filtra só os deletados válidos
      const filtered = items.filter((t) => t.status === 'DELETED' && !!t.deletedAt);
      setData(filtered);

      // Calcula tempo restante (30 dias após deletedAt)
      const now = Date.now();
      const newCountdowns: Record<string, number> = {};
      filtered.forEach((task) => {
        const deletedAtMs = new Date(task.deletedAt!).getTime();
        const expireAtMs = deletedAtMs + 30 * 24 * 60 * 60 * 1000; // 30 dias
        newCountdowns[task.id] = Math.max(0, expireAtMs - now);
      });
      setCountdowns(newCountdowns);
    } catch (e) {
      console.log('[useTrashTasks] erro:', e);
      setData([]);
      setCountdowns({});
    } finally {
      setLoading(false);
    }
  }, [query, periodDays]);

  /** Atualiza countdown a cada segundo */
  useEffect(() => {
    void fetcher();
    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const updated: Record<string, number> = {};
        for (const id in prev) {
          updated[id] = Math.max(0, prev[id] - 1000);
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetcher]);

  /** ♻️ Restaurar tarefa da lixeira → volta a ser ACTIVE */
  const restore = useCallback(async (id: string) => {
    setData((prev) => prev.filter((t) => t.id !== id)); // UI otimista
    try {
      await restoreTask(id);
    } catch (e) {
      console.log('[useTrashTasks] restore erro:', e);
      void fetcher(); // rollback se falhar
    }
  }, [fetcher]);

  /** ❌ Exclusão definitiva */
  const hardDelete = useCallback(async (id: string) => {
    setData((prev) => prev.filter((t) => t.id !== id));
    try {
      await hardDeleteTask(id);
    } catch (e) {
      console.log('[useTrashTasks] hardDelete erro:', e);
      void fetcher();
    }
  }, [fetcher]);

  return { data, loading, restore, hardDelete, refresh: fetcher, countdowns };
}
