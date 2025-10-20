import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import api from "../src/api/api";



export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const router = useRouter();

  async function entrar() {
    try {
      const { data } = await api.post("/auth/login", { usuario, senha });
      // backend retorna { token: "..." }
      await SecureStore.setItemAsync("accessToken", data.token);
      Alert.alert("OK", "Login efetuado");
      router.replace("/"); // volta pra Home
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.Erro ?? "Falha no login");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar</Text>
      <TextInput
        placeholder="Usuário"
        autoCapitalize="none"
        value={usuario}
        onChangeText={setUsuario}
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        style={styles.input}
        placeholderTextColor="#888"
      />
      <Button title="Entrar" onPress={entrar} />
      <Button
        title="Limpar Token (logout)"
        color="#ff5555"
        onPress={async () => {
          await SecureStore.deleteItemAsync('accessToken');
          Alert.alert('Token apagado', 'Agora o app vai abrir direto no login.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20, gap: 12 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
  },
});
