import { Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '../hooks/use-network-status.js';
import { colors, spacing, fontSize } from '../constants/theme.js';

export function OfflineBanner() {
  const { isOnline, isChecking } = useNetworkStatus();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isChecking) return;
    Animated.timing(opacity, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, isChecking]);

  if (isOnline || isChecking) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <Text style={styles.text}>오프라인 상태입니다 — 캐시된 데이터를 표시합니다</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.textSecondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
