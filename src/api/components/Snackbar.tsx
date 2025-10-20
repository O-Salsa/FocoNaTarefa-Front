// src/api/components/Snackbar.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

export type SnackbarProps = {
  visible: boolean;
  text: string;
  onDismiss: () => void;
  duration?: number;          // ms (padrão 2500)
  actionLabel?: string;       // opcional: texto do botão de ação
  onActionPress?: () => void; // opcional: callback do botão de ação
};

export function Snackbar({
  visible,
  text,
  onDismiss,
  duration = 2500,
  actionLabel,
  onActionPress,
}: SnackbarProps) {
  const translateY = useRef(new Animated.Value(80)).current; // entra de baixo
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      const t = setTimeout(() => onDismiss(), duration);
      return () => clearTimeout(t);
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[S.wrapper, { transform: [{ translateY }], opacity }]}>
      <Pressable onPress={onDismiss} style={S.card}>
        <Text style={S.text}>{text}</Text>
        {!!actionLabel && (
          <Pressable onPress={onActionPress} style={S.action}>
            <Text style={S.actionTxt}>{actionLabel}</Text>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 999,
  },
  card: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: { color: '#fff', flex: 1, fontWeight: '500' },
  action: { marginLeft: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#444' },
  actionTxt: { color: '#fff', fontWeight: '700' },
});

// exportações (suporta default e nomeada)
export default Snackbar;
