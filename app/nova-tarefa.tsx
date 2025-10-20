import { useRouter } from "expo-router"; // ⬅️ aqui
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import api from "../src/api/api";

export default function NovaTarefa() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const router = useRouter();             // ⬅️ aqui

  async function salvar() {
    if (!titulo.trim()) {
      Alert.alert("Aviso", "Digite um título para a tarefa");
      return;
    }
    try {
      await api.post("/api/tasks", { titulo, descricao });
      Alert.alert("Sucesso", "Tarefa criada!");
      router.back();                      // ⬅️ troque por back() ou replace("/")
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.message ?? e?.message ?? "Erro ao salvar tarefa");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Nova Tarefa</Text>
      <TextInput
        style={styles.input}
        placeholder="Título"
        placeholderTextColor="#999"
        value={titulo}
        onChangeText={setTitulo}
      />
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Descrição"
        placeholderTextColor="#999"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />
      <Button title="Salvar" onPress={salvar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  titulo: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
});
