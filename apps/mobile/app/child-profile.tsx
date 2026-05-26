import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const DOMAIN_LABELS: Record<string, string> = {
  language: '언어',
  cognitive: '인지',
  motor: '운동',
  selfCare: '자조',
  social: '사회성',
  overall: '전반적',
};

const GENDER_LABELS: Record<string, string> = {
  MALE: '남아',
  FEMALE: '여아',
  OTHER: '기타',
};

function ageFromBirthDate(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (years === 0) return `${remainMonths}개월`;
  if (remainMonths === 0) return `${years}세`;
  return `${years}세 ${remainMonths}개월`;
}

export default function ChildProfileScreen() {
  const { getSelectedChild, children, selectedChildId } = useChildStore();
  const child = getSelectedChild();

  if (!selectedChildId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '아이 프로필', headerShown: true }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>선택된 아이가 없습니다</Text>
        </View>
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '아이 프로필', headerShown: true }} />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  const devLevel = child.developmentalLevel as Record<string, string> | null;
  const centerInfo = child.centerInfo as Array<{
    name: string;
    type: string;
    frequency: string;
    currentGoal?: string;
  }> | null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '아이 프로필', headerShown: true }} />

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
        </View>
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childAge}>{ageFromBirthDate(child.birthDate)}</Text>
        {children.length > 1 && (
          <Text style={styles.childCount}>가족 내 아이 {children.length}명 등록됨</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>기본 정보</Text>
        <Row label="생년월일" value={child.birthDate} />
        <Row
          label="성별"
          value={child.gender ? (GENDER_LABELS[child.gender] ?? child.gender) : '미입력'}
        />
        {child.diagnosisName && <Row label="진단명" value={child.diagnosisName} />}
        {child.diagnosisDate && (
          <Row label="진단일" value={new Date(child.diagnosisDate).toLocaleDateString('ko-KR')} />
        )}
        {child.notes && <Row label="메모" value={child.notes} multiline />}
      </View>

      {devLevel && Object.keys(devLevel).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>발달 수준</Text>
          {Object.entries(devLevel).map(([key, value]) =>
            value ? (
              <Row key={key} label={DOMAIN_LABELS[key] ?? key} value={value} multiline />
            ) : null,
          )}
        </View>
      )}

      {centerInfo && centerInfo.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>치료 기관</Text>
          {centerInfo.map((center, idx) => (
            <View key={idx} style={styles.centerItem}>
              <Text style={styles.centerName}>{center.name}</Text>
              <Text style={styles.centerDetail}>
                {center.type} · {center.frequency}
              </Text>
              {center.currentGoal && <Text style={styles.centerGoal}>{center.currentGoal}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={[styles.row, multiline && styles.rowMultiline]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, multiline && styles.rowValueMultiline]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loader: { marginTop: spacing.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.primary },
  childName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  childAge: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
  childCount: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rowMultiline: { flexDirection: 'column', gap: 4 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  rowValue: { fontSize: fontSize.sm, color: colors.text, flexShrink: 1, textAlign: 'right' },
  rowValueMultiline: { textAlign: 'left' },
  centerItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  centerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  centerDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  centerGoal: { fontSize: fontSize.sm, color: colors.primary, marginTop: 4 },
});
