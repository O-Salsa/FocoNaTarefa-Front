// app/profile.tsx
import { theme } from "@/src/api/styles/theme"; // usa seu tema existente
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Profile() {
  const router = useRouter();

  return (
    <View style={S.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
          <Text style={S.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Perfil</Text>
        {/* Espaço vazio pra balancear o layout */}
        <View style={{ width: 32 }} />
      </View>

      {/* Corpo do perfil */}
      <View style={S.content}>
        <View style={S.avatar}>
          <Text style={S.avatarTxt}>S</Text>
        </View>
        <Text style={S.title}>Seu perfil</Text>
        <Text style={S.sub}>Em breve: alterar foto, nome e opções de conta.</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.lilacSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backTxt: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.accentDark,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },

  content: { alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.lilacSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarTxt: { fontSize: 34, color: theme.colors.accentDark, fontWeight: "800" },
  title: { marginTop: 16, fontSize: 22, fontWeight: "700", color: theme.colors.textPrimary },
  sub: { marginTop: 6, color: theme.colors.textSecondary, textAlign: "center" },
});
