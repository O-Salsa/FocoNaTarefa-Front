// app/(tabs)/index.tsx
import { Snackbar } from '@/src/api/components/Snackbar';
import {
  completeTask,
  createTask,
  listActive,
  softDeleteTask,
  type Task,
} from '@/src/api/services/task.service';
import { theme } from '@/src/api/styles/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';


export default function HomeScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [snack, setSnack] = useState<{ visible: boolean; text: string; withUndo?: boolean }>({
    visible: false,
    text: '',
    withUndo: false,
  });

  const [showComposer, setShowComposer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // seleção múltipla
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const lastAction = useRef<{ kind: 'complete' | 'delete'; task: Task } | null>(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await listActive();
      setTasks(data);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar tarefas ativas.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    if (selectionMode) {
      setShowComposer(false);
      setNewTitle('');
      setNewDescription('');
    }
  }, [selectionMode]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  };

  // ===== Seleção =====
  const toggleSelect = (id: string) => {
    setSelectionMode(true);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectionMode(false);
  };

  // ===== Ações individuais (desativadas quando em seleção) =====
  const onComplete = async (item: Task) => {
    if (selectionMode) return toggleSelect(String(item.id));
    setTasks(prev => prev.filter(t => t.id !== item.id));
    lastAction.current = { kind: 'complete', task: item };
    setSnack({ visible: true, text: 'Tarefa concluída', withUndo: true });
    try { await completeTask(item.id); }
    catch { setTasks(prev => [item, ...prev]); setSnack({ visible: true, text: 'Falha ao concluir', withUndo: false }); }
  };

  const onSoftDelete = async (item: Task) => {
    if (selectionMode) return toggleSelect(String(item.id));
    setTasks(prev => prev.filter(t => t.id !== item.id));
    lastAction.current = { kind: 'delete', task: item };
    setSnack({ visible: true, text: 'Movida para Lixeira', withUndo: true });
    try { await softDeleteTask(item.id); }
    catch { setTasks(prev => [item, ...prev]); setSnack({ visible: true, text: 'Falha ao mover para Lixeira', withUndo: false }); }
  };

  // ===== Ações em massa =====
  const bulkComplete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setTasks(prev => prev.filter(t => !ids.includes(String(t.id))));
    clearSelection();
    setSnack({ visible: true, text: 'Concluídas' });

    const ps = ids.map(id => completeTask(id).catch(e => e));
    const results = await Promise.allSettled(ps);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) { await load(false); Alert.alert('Atenção', 'Algumas tarefas não puderam ser concluídas.'); }
  };

  const bulkSoftDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setTasks(prev => prev.filter(t => !ids.includes(String(t.id))));
    clearSelection();
    setSnack({ visible: true, text: 'Movidas para Lixeira' });

    const ps = ids.map(id => softDeleteTask(id).catch(e => e));
    const results = await Promise.allSettled(ps);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) { await load(false); Alert.alert('Atenção', 'Algumas tarefas não foram movidas.'); }
  };

  const RightActions = ({ item }: { item: Task }) => (
    <View style={S.swipeRight}>
      <Pressable
        style={({ pressed }) => [
          S.swipeBtn,
          S.complete,
          pressed && S.pressablePressed,
        ]}
        onPress={() => onComplete(item)}
      >
        <Text style={S.swipeText}>Concluir</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          S.swipeBtn,
          S.trash,
          pressed && S.pressablePressed,
        ]}
        onPress={() => onSoftDelete(item)}
      >
        <Text style={S.swipeText}>Lixeira</Text>
      </Pressable>
    </View>
  );

  const ListHeader = (
    <View style={S.headerRow}>
      <Text style={S.appTitle}>FocoNaTarefa</Text>
      <TouchableOpacity style={S.avatar} onPress={() => router.push('/profile')}>
        <Text style={S.avatarTxt}>S</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Task }) => {
    const id = String(item.id);
    const isSelected = selected.has(id);

    // ⭐ Pressable envolve o card inteiro → toca em qualquer lugar para selecionar/deselecionar
    const CardInner = (
      <Pressable
        onPress={() => toggleSelect(id)}                 // ⭐ aqui
        style={[
          S.card,
          isSelected && S.cardSelected
        ]}
      >
        <View style={S.row}>
          {/* Círculo visual (apenas indicador, toque é no card todo) */}
          <View style={[S.check, isSelected && S.checkOn]}>
            {isSelected && <View style={S.checkDot} />}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={S.cardTitle}>{item.title || '(Sem título)'}</Text>
            {!!item.description && <Text style={S.cardSub}>{item.description}</Text>}
          </View>
        </View>
      </Pressable>
    );

    // Se estiver em modo seleção, desabilita swipe para não conflitar com toques
    if (selectionMode) return CardInner;

    return (
      <Swipeable renderRightActions={() => <RightActions item={item} />}>
        {CardInner}
      </Swipeable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={S.avoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={S.container}>
      {loading ? (
        <>
          {ListHeader}
        <ActivityIndicator style={{ marginTop: 24 }} />
        </>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(i) => String(i.id)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: selectionMode ? 160 : showComposer ? 240 : 100 }}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={S.emptyBox}>
              <Text style={S.emptyEmoji}>📝</Text>
              <Text style={S.emptyTitle}>Sem tarefas ativas</Text>
              <Text style={S.emptySub}>Toque no “+” para criar uma tarefa.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      {/* FAB some quando estiver selecionando */}
      {!selectionMode && (
        showComposer ? (
          <View style={S.composer}>
            <TextInput
              style={S.composerInput}
              placeholder="Título da tarefa"
              placeholderTextColor={theme.colors.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
              editable={!creating}
            />
            <TextInput
              style={[S.composerInput, S.composerDescription]}
              placeholder="Descrição (opcional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={newDescription}
              onChangeText={setNewDescription}
              editable={!creating}
              multiline
            />
            <View style={S.composerActions}>
              <Pressable
                style={({ pressed }) => [
                  S.composerBtn,
                  S.composerCancel,
                  creating && S.composerBtnDisabled,
                  !creating && pressed && S.pressablePressed,
                ]}
                onPress={() => {
                  if (creating) return;
                  setShowComposer(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
              >
                <Text style={S.composerCancelText}>✕</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  S.composerBtn,
                  S.composerCancel,
                  creating && S.composerBtnDisabled,
                  !creating && pressed && S.pressablePressed,
                ]}
                onPress={async () => {
                  if (creating) return;
                  if (!newTitle.trim()) {
                    Alert.alert('Aviso', 'Digite um título para a tarefa.');
                    return;
                  }
                  try {
                    setCreating(true);
                    await createTask({
                      title: newTitle.trim(),
                      description: newDescription.trim() ? newDescription.trim() : undefined,
                    });
                    await load(false);
                    setSnack({ visible: true, text: 'Tarefa criada' });
                    setShowComposer(false);
                    setNewTitle('');
                    setNewDescription('');
                  } catch {
                    Alert.alert('Erro', 'Falha ao criar tarefa.');
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={S.composerConfirmText}>✓</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [S.fab, pressed && S.pressablePressed]}
            onPress={() => setShowComposer(true)}
          >
            <Text style={S.fabPlus}>＋</Text>
          </Pressable>
        )
      )}

      {/* Barra de ações em massa (⭐ sem contador, só botões) */}
      {selectionMode && (
        <View style={S.bulkBar}>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={({ pressed }) => [
                S.bulkBtn,
                S.bulkPrimary,
                pressed && S.pressablePressed,
              ]}
              onPress={bulkComplete}
            >
              <Text style={[S.bulkBtnTxt, S.bulkPrimaryTxt]}>Concluir</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                S.bulkBtn,
                S.bulkDanger,
                pressed && S.pressablePressed,
              ]}
              onPress={bulkSoftDelete}
            >
              <Text style={[S.bulkBtnTxt, S.bulkDangerTxt]}>Lixeira</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                S.bulkBtn,
                S.bulkNeutral,
                pressed && S.pressablePressed,
              ]}
              onPress={clearSelection}
            >
              <Text style={[S.bulkBtnTxt, S.bulkNeutralTxt]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

        <Snackbar
          visible={snack.visible}
          text={snack.text}
          actionLabel={snack.withUndo ? 'Desfazer' : undefined}
          onActionPress={snack.withUndo ? () => {
            const a = lastAction.current;
            if (!a) return;
            setTasks(prev => [a.task, ...prev]);
            lastAction.current = null;
            setSnack({ visible: false, text: '' });
          } : undefined}
          onDismiss={() => setSnack({ visible: false, text: '', withUndo: false })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  avoiding: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 52, paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  appTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.textPrimary },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.lilacSoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  avatarTxt: { color: theme.colors.accentDark, fontWeight: '800' },

    pressablePressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  emptyBox: { alignItems: 'center', marginTop: 32 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { marginTop: 6, fontWeight: '700', color: theme.colors.textPrimary },
  emptySub: { color: theme.colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: theme.colors.surface ?? '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F3F6',
  },
  cardSelected: {
    borderColor: theme.colors.accent,
    borderWidth: 1.5,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },

  // indicador de seleção
  check: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: theme.colors.accent, marginTop: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: theme.colors.lilacSoft,
    borderColor: theme.colors.accentDark,
  },
  checkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accentDark },

  cardTitle: { fontWeight: '700', fontSize: 16, marginBottom: 2, color: theme.colors.textPrimary },
  cardSub: { color: theme.colors.textSecondary },

  // Swipe
  swipeRight: { flexDirection: 'row', alignItems: 'center' },
  swipeBtn: { paddingHorizontal: 18, justifyContent: 'center' },
  complete: { backgroundColor: theme.colors.greenSoft },
  trash: { backgroundColor: theme.colors.redSoft },
  swipeText: { fontWeight: '700', color: theme.colors.textPrimary },

  // FAB
  fab: {
    position: 'absolute',
    right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
  },
  fabPlus: { fontSize: 30, color: '#fff', lineHeight: 30, fontWeight: '800' },

  composer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    borderRadius: 20,
    padding: 16,
    backgroundColor: theme.colors.surface ?? '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border ?? '#E2E2E6',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  composerInput: {
    borderWidth: 1,
    borderColor: theme.colors.border ?? '#E2E2E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    marginBottom: 10,
  },
  composerDescription: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  composerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  composerBtnDisabled: {
    opacity: 0.6,
  },
  composerConfirm: {
    backgroundColor: theme.colors.accent,
  },
  composerConfirmText: {
    fontSize: 22,
    color: '#18850aff',
    fontWeight: '700',
  },
  composerCancel: {
    backgroundColor: theme.colors.redSoft ?? '#FDE7E7',
  },
  composerCancelText: {
    fontSize: 22,
    color: theme.colors.redStrong ?? '#B3261E',
    fontWeight: '700',
  },

  // Bulk action bar (sem contador)
  bulkBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bulkBtn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  bulkBtnTxt: { fontWeight: '700' },
  bulkPrimary: {
    backgroundColor: theme.colors.greenSoft,
    borderColor: '#9ED69E',
  },
  bulkPrimaryTxt: { color: '#176B29' },
  bulkDanger: {
    backgroundColor: theme.colors.redSoft,
    borderColor: '#F5B5B5',
  },
  bulkDangerTxt: { color: theme.colors.redStrong ?? '#B3261E' },
  bulkNeutral: {
    backgroundColor: theme.colors.graySoft,
    borderColor: '#D3D3D8',
  },
  bulkNeutralTxt: { color: theme.colors.textSecondary },
});