// app/_layout.tsx
import { Redirect, Slot, useFocusEffect, usePathname } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/** ========= Utils simples para JWT ========= */
function base64UrlToJson(b64url: string): any | null {
  try {
    // JWT usa base64url ( - _ ), convertemos para base64 ( + / )
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    // padding
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    // atob pode não existir em alguns ambientes RN → tentamos com globalThis.atob
    const atobFn: any = (globalThis as any).atob;
    if (!atobFn) return null;
    const jsonStr = atobFn(padded);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function parseJwt(token?: string | null): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  return base64UrlToJson(parts[1]);
}

function isTokenExpired(token?: string | null): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  // Se o token não tiver exp, consideramos como válido (ou ajuste para true se preferir forçar login)
  if (!payload?.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  // margem de 30s para evitar drift de relógio
  return payload.exp < (nowSec + 30);
}
/** ========================================= */

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();

  async function readToken() {
    try {
      const stored = await SecureStore.getItemAsync('accessToken');

      // Se existir, mas estiver expirado → apaga e trata como deslogado
      if (stored && isTokenExpired(stored)) {
        await SecureStore.deleteItemAsync('accessToken');
        setToken(null);
        return;
      }

      setToken(stored ?? null);
    } catch (e) {
      console.log('[RootLayout] erro lendo token', e);
      setToken(null);
    }
  }

  // 1) Leitura inicial (com safety timeout)
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => !cancelled && setLoading(false), 3000);

    (async () => {
      await readToken();
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // 2) Re-leitura quando a tela ganhar foco (após login/logout)
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

  // 3) Rotas com redirecionamento seguro (evita loop)
  // - Se NÃO tem token e NÃO está em /login → manda para /login
  if (!token && pathname !== '/login') {
    return <Redirect href="/login" />;
  }

  // - Se TEM token e está em /login → manda para home
  if (token && pathname === '/login') {
    return <Redirect href="/" />;
  }

  // Render das rotas
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
