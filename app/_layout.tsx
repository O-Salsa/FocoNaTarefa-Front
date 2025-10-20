// app/_layout.tsx
import { Redirect, Slot, useFocusEffect, usePathname } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();

  async function readToken() {
    try {
      const stored = await SecureStore.getItemAsync('accessToken');
      setToken(stored);
    } catch (e) {
      console.log('[RootLayout] erro lendo token', e);
    }
  }

  // 1) Leitura inicial
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => !cancelled && setLoading(false), 3000);

    (async () => {
      await readToken();
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // 2) Re-leia quando a tela ganhar foco (após login/logout)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => { await readToken(); })();
      return () => { active = false; };
    }, [])
  );

  if (loading) {
    return (
      <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // 3) Evitar redirect para a MESMA rota (loop)
  if (!token && pathname !== '/login') {
    return <Redirect href="/login" />;
  }

  if (token && pathname === '/login') {
    // já logado e caiu no login? manda pra home
    return <Redirect href="/" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
