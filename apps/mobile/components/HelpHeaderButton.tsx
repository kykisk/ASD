import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { hasSeenTour, runTour, tourSupported } from '../lib/tour.js';
import { TOUR_STEPS, tourForPath } from '../lib/tour-steps.js';
import { colors } from '../constants/theme.js';

/** 탭 화면 제목줄 오른쪽 도움말: 그 화면의 따라하기 투어, 없으면 사용 가이드 */
export function HelpHeaderButton() {
  const pathname = usePathname();
  const router = useRouter();
  const tourId = tourSupported ? tourForPath(pathname) : null;
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const update = () => setUnseen(!!tourId && !hasSeenTour(tourId));
    update();
    window.addEventListener('auticare-tour-seen', update);
    return () => window.removeEventListener('auticare-tour-seen', update);
  }, [tourId]);

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => (tourId ? runTour(TOUR_STEPS[tourId], { id: tourId }) : router.push('/guide'))}
      accessibilityRole="button"
      accessibilityLabel="도움말"
    >
      <Text style={styles.icon}>?</Text>
      <Text style={styles.text}>도움말</Text>
      {unseen && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginRight: 12,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    overflow: 'hidden',
  },
  text: { fontSize: 13, color: colors.text },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E8A87C',
    borderWidth: 2,
    borderColor: colors.card,
  },
});
