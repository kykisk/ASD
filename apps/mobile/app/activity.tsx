import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import { useTodayCurriculum, useActivityLogs, useLogActivity } from '../hooks/use-curricula.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';
import type { LogActivityInput } from '../types/api.types.js';

type ActivityResult = LogActivityInput['result'];

const DOMAIN_LABELS: Record<string, string> = {
  DAILY_LIVING: '일상생활',
  COMMUNICATION: '의사소통',
  COGNITIVE: '인지',
  SOCIAL: '사회성',
  MOTOR: '운동',
  EMOTIONAL: '정서',
};

const DIFFICULTY_LABELS: Record<string, string> = { EASY: '쉬움', MEDIUM: '보통', HARD: '어려움' };

const RESULT_OPTIONS: Array<{ key: ActivityResult; label: string }> = [
  { key: 'SUCCESS', label: '잘했어요' },
  { key: 'PARTIAL', label: '조금 했어요' },
  { key: 'FAILED', label: '못 했어요' },
];

function showError(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('저장하지 못했어요', message);
}

export default function ActivityScreen() {
  const router = useRouter();
  const { index } = useLocalSearchParams<{ index: string }>();
  const activityIndex = Number(index ?? 0);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const { data: curriculum, isLoading } = useTodayCurriculum(selectedChildId);
  const { data: logs } = useActivityLogs(curriculum?.id);
  const logMutation = useLogActivity();

  const saved = logs?.find((l) => l.activityIndex === activityIndex);
  const [memo, setMemo] = useState('');
  useEffect(() => {
    setMemo(saved?.notes ?? '');
  }, [saved?.id, saved?.notes]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const activity = curriculum?.activities[activityIndex];
  if (!curriculum || !activity || !selectedChildId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>활동을 찾을 수 없어요</Text>
      </View>
    );
  }

  const save = async (result: ActivityResult) => {
    try {
      await logMutation.mutateAsync({
        childId: selectedChildId,
        curriculumId: curriculum.id,
        activityIndex,
        input: {
          curriculumId: curriculum.id,
          activityIndex,
          activityTitle: activity.title.slice(0, 100),
          result,
          notes: memo.trim() || undefined,
        },
      });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : '다시 시도해주세요');
    }
  };

  const memoChanged = !!saved && memo.trim() !== (saved.notes ?? '');
  const nextIndex = activityIndex + 1 < curriculum.activities.length ? activityIndex + 1 : null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.progress}>
          오늘의 활동 {activityIndex + 1} / {curriculum.activities.length}
        </Text>
        <View style={styles.tags}>
          <Text style={styles.tag}>
            {DOMAIN_LABELS[activity.domain.toUpperCase()] ?? activity.domain}
          </Text>
          <Text style={styles.tag}>{activity.durationMin}분</Text>
          <Text style={styles.tag}>{DIFFICULTY_LABELS[activity.difficultyLevel] ?? ''}</Text>
        </View>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.description}</Text>

        {activity.materials && activity.materials.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>준비물</Text>
            <Text style={styles.body}>{activity.materials.join(' · ')}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>이렇게 해요</Text>
          {activity.steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.body, styles.stepText]}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>이러면 성공이에요</Text>
          <Text style={styles.body}>{activity.successCriteria}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>어땠나요?</Text>
        <View style={styles.results}>
          {RESULT_OPTIONS.map((opt) => {
            const active = saved?.result === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.resultBtn, active && styles.resultBtnActive]}
                onPress={() => save(opt.key)}
                disabled={logMutation.isPending}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.resultText, active && styles.resultTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={styles.memo}
          value={memo}
          onChangeText={setMemo}
          placeholder="한 줄 메모 (선택) 예: 집게는 아파해서 종이 찢기만 했어요"
          placeholderTextColor={colors.textSecondary}
          maxLength={500}
        />
        <View style={styles.footerRow}>
          {memoChanged ? (
            <TouchableOpacity onPress={() => save(saved.result)} disabled={logMutation.isPending}>
              <Text style={styles.link}>메모 저장</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => save('SKIPPED')} disabled={logMutation.isPending}>
              <Text style={styles.linkMuted}>
                {saved?.result === 'SKIPPED' ? '오늘은 건너뛰었어요' : '오늘은 건너뛰기'}
              </Text>
            </TouchableOpacity>
          )}
          {saved && (
            <TouchableOpacity
              onPress={() =>
                nextIndex !== null
                  ? router.replace({ pathname: '/activity', params: { index: String(nextIndex) } })
                  : router.back()
              }
            >
              <Text style={styles.link}>
                {nextIndex !== null ? '다음 활동 →' : '오늘 화면으로'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm },
  content: { padding: spacing.md, gap: 14 },
  progress: { fontSize: fontSize.xs, color: colors.textSecondary },
  tags: { flexDirection: 'row', gap: 6 },
  tag: {
    fontSize: fontSize.xs,
    color: '#4A5A6A',
    backgroundColor: '#F2F0EC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  title: { fontSize: 21, fontWeight: '700', color: colors.text, lineHeight: 28 },
  description: { fontSize: fontSize.sm, color: '#4A5A6A', lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 8,
  },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primaryDark },
  stepText: { flex: 1 },
  footer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: spacing.md,
    gap: 10,
  },
  footerTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  results: { flexDirection: 'row', gap: 8 },
  resultBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBtnActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  resultText: { fontSize: 15, color: colors.text },
  resultTextActive: { fontWeight: '700', color: colors.primaryDark },
  memo: {
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 24 },
  link: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryDark },
  linkMuted: { fontSize: fontSize.sm, color: colors.textSecondary },
});
