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
import { runTour, setPendingTour, takePendingTour } from '../lib/tour.js';
import { APPROACH_LABELS, METHOD_LABELS } from '../constants/find-way.js';

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

  // 오늘 화면의 따라하기 투어에서 넘어왔으면 이어서 안내
  const ready = !isLoading && !!curriculum;
  useEffect(() => {
    if (!ready || !takePendingTour('activity')) return;
    const timer = setTimeout(
      () =>
        runTour(
          [
            {
              target: 'tour-steps',
              title: '하는 방법',
              body: '준비물과 단계, "이러면 성공이에요"를 보고 아이와 따라 해보세요.',
            },
            {
              target: 'tour-results',
              title: '해본 뒤 결과를 눌러요',
              body: '잘했어요 · 조금 했어요 · 못 했어요 중 하나를 누르면 바로 저장돼요. 한 줄 메모를 남기면 AI가 다음 활동을 만들 때 참고해요.',
            },
            {
              title: '이제 오늘 하루 기록을 볼까요?',
              body: '확인을 누르면 오늘 화면으로 돌아가요.',
            },
          ],
          {
            onComplete: () => {
              setPendingTour('today-record');
              router.back();
            },
          },
        ),
      500,
    );
    return () => clearTimeout(timer);
  }, [ready, router]);

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

        <View style={styles.card} nativeID="tour-steps">
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

        {(activity.rationale || (activity.methods?.length ?? 0) > 0) && (
          <View style={styles.whyCard}>
            <Text style={styles.whyTitle}>왜 이 활동이에요?</Text>
            {activity.rationale ? (
              <View style={{ gap: 2 }}>
                <Text style={styles.whyLabel}>이 기록을 보고 만들었어요</Text>
                <Text style={styles.body}>{activity.rationale}</Text>
              </View>
            ) : null}
            {(activity.methods?.length ?? 0) > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={styles.whyLabel}>쓰인 방법</Text>
                <View style={styles.methodRow}>
                  {activity.methods?.map((m) => (
                    <Text key={m} style={styles.method}>
                      {METHOD_LABELS[m]?.label ?? m}
                    </Text>
                  ))}
                </View>
                <Text style={styles.whyHint}>
                  {[
                    ...new Set(
                      (activity.methods ?? [])
                        .map((m) => METHOD_LABELS[m]?.approach)
                        .filter((a): a is string => !!a && a !== 'COMMON'),
                    ),
                  ]
                    .map((a) => APPROACH_LABELS[a])
                    .join(' · ') || '여러 관점에서 공통으로 쓰는 방법'}{' '}
                  에서 쓰는 방법이에요
                </Text>
              </View>
            )}
            {activity.caution ? <Text style={styles.caution}>{activity.caution}</Text> : null}
            <TouchableOpacity
              onPress={() =>
                activity.concernId
                  ? router.push(`/concern?id=${activity.concernId}` as never)
                  : router.push('/concerns' as never)
              }
              accessibilityRole="link"
            >
              <Text style={styles.link}>
                {activity.concernId
                  ? '지금 시도 중인 방법 보기 ›'
                  : '고민되는 행동의 다른 관점 보기 ›'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.disclaimer}>
          AI가 기록을 보고 제안하는 활동이에요. 치료 계획은 담당 선생님과 상의하세요.
        </Text>
      </ScrollView>

      <View style={styles.footer} nativeID="tour-results">
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
  whyCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 10,
  },
  whyTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  whyLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  whyHint: { fontSize: 12, color: '#4A5A6A', lineHeight: 18 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  method: {
    fontSize: 12,
    color: '#1E4E8C',
    backgroundColor: '#E7F0FB',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  caution: {
    fontSize: 12,
    color: '#8A4B14',
    backgroundColor: '#FDF0E6',
    borderRadius: 10,
    padding: 8,
    lineHeight: 18,
    overflow: 'hidden',
  },
  disclaimer: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
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
