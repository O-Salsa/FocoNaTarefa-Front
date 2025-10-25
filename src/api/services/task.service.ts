// src/api/services/task.service.ts
import api from '@/src/api/api';

export type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'DELETED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
}

function adaptTask(raw: any): Task {
  return {
    id: String(raw.id),
    title: raw.title ?? raw.titulo ?? '',               // 👈 fallback
    description: raw.description ?? raw.descricao ?? '',
    status: raw.status,
    createdAt: raw.createdAt ?? raw.criadoEm ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.atualizadoEm ?? raw.updated_at,
    completedAt: raw.completedAt ?? raw.concluidoEm,
    deletedAt: raw.deletedAt ?? raw.deletadoEm,
  };
}

function normalizeList(data: any): Task[] {
  const items = Array.isArray(data) ? data : (data.content ?? data.items ?? []);
  return items.map(adaptTask);                           // 👈 adapta cada item
}

// …restante do arquivo permanece igual…


// LISTA ATIVAS (usa o mesmo endpoint com filtro ?status=ACTIVE)
export async function listActive(q?: string, limit?: number): Promise<Task[]> {
  const params: any = { status: 'ACTIVE' };
  if (q) params.q = q;
  if (limit) params.size = limit; // se seu backend usa page/size
  const { data } = await api.get('/api/tasks', { params });
  return normalizeList(data);
}

// CRIA
export async function createTask(payload: { title: string; description?: string }) {
  const { data } = await api.post('/api/tasks', payload);
  return data as Task;
}

// CONCLUI (defina este endpoint no backend)
export async function completeTask(id: string) {
  const { data } = await api.patch(`/api/tasks/${id}/complete`, {});
  return data as Task;
}

// SOFT-DELETE (manda para a lixeira)
export async function softDeleteTask(id: string) {
  const { data } = await api.patch(`/api/tasks/${id}/soft-delete`, {});
  return data as Task;
}

// (Se quiser manter o histórico)
// COMPLETED / TRASH / REOPEN / HARD DELETE
export async function listCompleted(q?: string, periodDays?: number): Promise<Task[]> {
  const params: any = { status: 'COMPLETED' };
  if (q) params.q = q;
  if (periodDays) params.periodDays = periodDays;
  const { data } = await api.get('/api/tasks', { params });
  return normalizeList(data);
}

export async function listTrash(q?: string, periodDays?: number): Promise<Task[]> {
  const params: any = {};
  if (q) params.q = q;
  if (periodDays) params.periodDays = periodDays;
  const { data } = await api.get('/api/tasks/trash', { params });
  return normalizeList(data);
}

export async function reopenTask(id: string): Promise<Task> {
  const { data } = await api.patch(`/api/tasks/${id}/reopen`, {});
  return data as Task;
}
export async function restoreTask(id: string): Promise<Task> {
  try {
    const { data } = await api.post(`/api/tasks/${id}/restore`, {});
    return data as Task;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404 || status === 405 || status === 501) {
      const fallback = await api.patch(`/api/tasks/${id}/restore`, {});
      return fallback.data as Task;
    }
    throw error;
  }
}

export async function hardDeleteTask(id: string): Promise<void> {
  await api.delete(`/api/tasks/${id}`);
}
