import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCompletedTasks, useTrashTasks } from '../../hooks/useTaskHistory';
import { Snackbar } from '../../src/api/components/Snackbar'; // você tem esse componente
import { Task, completeTask, softDeleteTask } from '../../src/api/services/task.service';

type Tab = 'completed' | 'trash';

type LastAction =
  | { type: 'reopen'; task: Task }
  | { type: 'restore'; task: Task };

export default function ExploreScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('completed');
  const [snack, setSnack] = useState<{ visible: boolean; text: string; canUndo: boolean }>({
    visible: false,
    text: '',
    canUndo: false,
  });
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  const completed = useCompletedTasks();
  const trash = useTrashTasks();

  const data = useMemo(() => (activeTab === 'completed' ? completed.data : trash.data), [activeTab, completed.data, trash.data]);
  const loading = activeTab === 'completed' ? completed.loading : trash.loading;

  const showSnack = useCallback((text: string, action: LastAction | null) => {
    setSnack({ visible: true, text, canUndo: !!action });
    setLastAction(action);
  }, []);

  const dismissSnack = useCallback(() => {
    setSnack({ visible: false, text: '', canUndo: false });
    setLastAction(null);
  }, []);

  const handleReopen = async (task: Task) => {
    await completed.reopen(task.id);
    showSnack('Tarefa reaberta', { type: 'reopen', task });
  };

  const handleRestore = async (task: Task) => {
    await trash.restore(task.id);
    showSnack('Tarefa restaurada', { type: 'restore', task });
  };

  const handleHardDelete = async (task: Task) => {
    await trash.hardDelete(task.id);
    showSnack('Excluída definitivamente', null);
  };

  const refreshCompleted = completed.refresh;
  const refreshTrash = trash.refresh;

  const undo = useCallback(async () => {
    if (!lastAction) return;
    const action = lastAction;
    dismissSnack();

    try {
      if (action.type === 'reopen') {
        await completeTask(action.task.id);
        await refreshCompleted();
      } else if (action.type === 'restore') {
        await softDeleteTask(action.task.id);
        await refreshTrash();
      }
      showSnack('Ação desfeita', null);
    } catch (error) {
      console.log('[ExploreScreen] undo erro:', error);
      showSnack('Não foi possível desfazer.', null);
    }
  }, [dismissSnack, lastAction, refreshCompleted, refreshTrash, showSnack]);

  return (
    <View style={S.container}>
      <Text style={S.title}>Histórico</Text>

      {/* Abas */}
      <View style={S.tabs}>
        <Pressable
          onPress={() => setActiveTab('completed')}
          style={({ pressed }) => [
            S.tabBtn,
            activeTab === 'completed' && S.tabBtnActive,
            pressed && S.pressablePressed,
          ]}
        >
          <Text style={S.tabTxt}>Concluídas</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('trash')}
          style={({ pressed }) => [
            S.tabBtn,
            activeTab === 'trash' && S.tabBtnActive,
            pressed && S.pressablePressed,
          ]}
        >

          <Text style={S.tabTxt}>Lixeira</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={S.empty}>
              {activeTab === 'completed'
                ? 'Nenhuma tarefa concluída.'
                : 'Sua lixeira está vazia.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={S.card}>
              <Text style={S.cardTitle}>{item.title}</Text>
              <Text style={S.cardSub}>
                {activeTab === 'completed'
                  ? tempoRelativo(item.completedAt)
                  : contagemRegressiva(trash.countdowns[item.id])}
              </Text>

              <View style={S.actions}>
                {activeTab === 'completed' ? (
                  <Pressable
                    onPress={() => {
                      void handleReopen(item);
                    }}
                    style={({ pressed }) => [
                      S.btn,
                      S.btnPrimary,
                      pressed && S.pressablePressed,
                    ]}
                  >
                    <Text style={S.btnTxt}>Reabrir</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => {
                        void handleRestore(item);
                      }}
                      style={({ pressed }) => [
                        S.btn,
                        S.btnNeutral,
                        pressed && S.pressablePressed,
                      ]}
                    >
                      <Text style={S.btnTxt}>Restaurar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void handleHardDelete(item);
                      }}
                      style={({ pressed }) => [
                        S.btn,
                        S.btnDanger,
                        pressed && S.pressablePressed,
                      ]}
                    >
                      <Text style={S.btnTxt}>Excluir</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Snackbar */}
      {snack.visible && (
        <Snackbar
          visible={snack.visible}
          text={snack.text}
          actionLabel={snack.canUndo ? 'Desfazer' : undefined}
          onActionPress={snack.canUndo ? () => { void undo(); } : undefined}
          onDismiss={dismissSnack}
        />

      )}

      {activeTab === 'trash' && (
        <Text style={S.hint}>Itens permanecem por 30 dias antes de exclusão automática.</Text>
      )}
    </View>
  );
}

function tempoRelativo(iso?: string) {
  if (!iso) return 'agora';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `há ${d} dia${d > 1 ? 's' : ''}`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `há ${h} hora${h > 1 ? 's' : ''}`;
  const m = Math.floor(diff / 60000);
  if (m > 0) return `há ${m} min`;
  return 'agora';
}

function contagemRegressiva(restante?: number) {
  if (restante === undefined) return 'Restam 30 dias';
  const diff = Math.max(0, restante);
  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const minutos = Math.floor((diff % 3600000) / 60000);
  const segundos = Math.floor((diff % 60000) / 1000);

  if (diff <= 0) return 'Removendo...';

  const partes = [
    dias > 0 ? `${dias}d` : null,
    horas > 0 || dias > 0 ? `${horas}h` : null,
    minutos > 0 || horas > 0 || dias > 0 ? `${minutos}m` : null,
    `${segundos}s`,
  ].filter(Boolean);

  return `Exclui em ${partes.join(' ')}`;
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '600', marginBottom: 16 },
  tabs: { flexDirection: 'row', marginBottom: 12 },
  tabBtn: { flex: 1, backgroundColor: '#EAEAEA', padding: 10, borderRadius: 16, marginRight: 6, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#DCCEF3' }, // lilás pastel
  tabTxt: { fontWeight: '500' },
  pressablePressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  search: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  chips: { flexDirection: 'row', marginBottom: 16 },
  chip: { backgroundColor: '#EAEAEA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: '#D9D9D9' },
  chipTxt: { fontSize: 14 },
  empty: { textAlign: 'center', color: '#8E8E93', marginTop: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontWeight: '600', marginBottom: 6, fontSize: 16 },
  cardSub: { color: '#666', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  btnPrimary: { backgroundColor: '#DCCEF3' },
  btnNeutral: { backgroundColor: '#EEE' },
  btnDanger: { backgroundColor: '#F8D7DA' },
  btnTxt: { fontWeight: '600' },
  hint: { textAlign: 'center', color: '#8E8E93', fontSize: 12, marginTop: 4, marginBottom: 8 },
});
