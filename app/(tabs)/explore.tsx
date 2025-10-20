import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCompletedTasks, useTrashTasks } from '../../hooks/useTaskHistory';
import { Snackbar } from '../../src/api/components/Snackbar'; // você tem esse componente

type Tab = 'completed' | 'trash';

export default function ExploreScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('completed');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<number | undefined>(30);
  const [snack, setSnack] = useState<{ visible: boolean; text: string }>({ visible: false, text: '' });

  const completed = useCompletedTasks(query, period);
  const trash = useTrashTasks(query, period);

  const data = useMemo(() => (activeTab === 'completed' ? completed.data : trash.data), [activeTab, completed.data, trash.data]);
  const loading = activeTab === 'completed' ? completed.loading : trash.loading;

  const handleReopen = async (id: string) => {
    await completed.reopen(id);
    setSnack({ visible: true, text: 'Tarefa reaberta' });
  };

  const handleRestore = async (id: string) => {
    await trash.restore(id);
    setSnack({ visible: true, text: 'Tarefa restaurada' });
  };

  const handleHardDelete = async (id: string) => {
    await trash.hardDelete(id);
    setSnack({ visible: true, text: 'Excluída definitivamente' });
  };

  function undo(): void {
    throw new Error('Function not implemented.');
  }

  return (
    <View style={S.container}>
      <Text style={S.title}>Histórico</Text>

      {/* Abas */}
      <View style={S.tabs}>
        <Pressable
          onPress={() => setActiveTab('completed')}
          style={[S.tabBtn, activeTab === 'completed' && S.tabBtnActive]}>
          <Text style={S.tabTxt}>Concluídas</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('trash')}
          style={[S.tabBtn, activeTab === 'trash' && S.tabBtnActive]}>
          <Text style={S.tabTxt}>Lixeira</Text>
        </Pressable>
      </View>

      {/* Busca */}
      <TextInput
        placeholder="Buscar..."
        placeholderTextColor="#A1A1A6"
        value={query}
        onChangeText={setQuery}
        style={S.search}
      />

      {/* Chips período */}
      <View style={S.chips}>
        {[
          { l: '7d', v: 7 },
          { l: '30d', v: 30 },
          { l: 'Todos', v: undefined as number | undefined },
        ].map((c) => (
          <Pressable
            key={c.l}
            onPress={() => setPeriod(c.v)}
            style={[S.chip, period === c.v && S.chipActive]}>
            <Text style={S.chipTxt}>{c.l}</Text>
          </Pressable>
        ))}
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
                ? 'Nenhuma tarefa concluída no período.'
                : 'Sua lixeira está vazia.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={S.card}>
              <Text style={S.cardTitle}>{item.title}</Text>
              <Text style={S.cardSub}>
                {activeTab === 'completed'
                  ? tempoRelativo(item.completedAt)
                  : `Na lixeira ${tempoRelativo(item.deletedAt)}`}
              </Text>

              <View style={S.actions}>
                {activeTab === 'completed' ? (
                  <Pressable onPress={() => handleReopen(item.id)} style={[S.btn, S.btnPrimary]}>
                    <Text style={S.btnTxt}>Reabrir</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable onPress={() => handleRestore(item.id)} style={[S.btn, S.btnNeutral]}>
                      <Text style={S.btnTxt}>Restaurar</Text>
                    </Pressable>
                    <Pressable onPress={() => handleHardDelete(item.id)} style={[S.btn, S.btnDanger]}>
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
          actionLabel="Desfazer"
          onActionPress={undo}
          onDismiss={() =>
            setSnack({
              visible: false,
              text: '',
            })
         }
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

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '600', marginBottom: 16 },
  tabs: { flexDirection: 'row', marginBottom: 12 },
  tabBtn: { flex: 1, backgroundColor: '#EAEAEA', padding: 10, borderRadius: 16, marginRight: 6, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#DCCEF3' }, // lilás pastel
  tabTxt: { fontWeight: '500' },
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
