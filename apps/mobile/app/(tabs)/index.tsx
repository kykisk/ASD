import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChildStore } from '../../stores/child.store.js';
import {
  useTodayCurriculum,
  useActivityLogs,
  useGenerateCurriculum,
} from '../../hooks/use-curricula.js';
import { useDailyRecord } from '../../hooks/use-daily-record.js';
import { useWeeklyInsight } from '../../hooks/use-dashboard.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { ActivityLog } from '../../types/api.types.js';

const DOMAIN_LABELS: Record<string, string> = {
  DAILY_LIVING: '일상생활',
  COMMUNICATION: '의사소통',
  COGNITIVE: '인지',
  SOCIAL: '사회성',
  MOTOR: '운동',
  EMOTIONAL: '정서',
};

const RESULT_LABELS: Record<ActivityLog['result'], string> = {
  SUCCESS: '잘했어요',
  PARTIAL: '조금 했어요',
  FAILED: '못 했어요',
  SKIPPED: '건너뛰었어요',
};

const RESULT_DOT: Record<ActivityLog['result'], string> = {
  SUCCESS: colors.primary,
  PARTIAL: colors.score3,
  FAILED: colors.score2,
  SKIPPED: '#D9D4CC',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

export default function TodayScreen() {
  const router = useRouter();
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const {
    data: curriculum,
    isLoading: curriculumLoading,
    refetch: refetchCurriculum,
  } = useTodayCurriculum(selectedChildId);
  const { data: logs, refetch: refetchLogs } = useActivityLogs(curriculum?.id);
  const { data: record, refetch: refetchRecord } = useDailyRecord(selectedChildId);
  const { data: insight } = useWeeklyInsight(selectedChildId);
  const generateMutation = useGenerateCurriculum();

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchCurriculum(), refetchLogs(), refetchRecord()]);
  }, [refetchCurriculum, refetchLogs, refetchRecord]);

  const handleGenerate = async () => {
    if (!selectedChildId) return;
    try {
      await generateMutation.mutateAsync(selectedChildId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '잠시 후 다시 시도해주세요';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('활동을 만들지 못했어요', message);
    }
  };

  if (!selectedChildId) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>아이를 먼저 등록해주세요</Text>
          <Text style={styles.emptyText}>
            아이에 대해 알려주시면 오늘 집에서 할 활동을 만들어 드려요
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/add-child')}>
            <Text style={styles.primaryBtnText}>아이 등록하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activities = curriculum?.activities ?? [];
  const logByIndex = new Map((logs ?? []).map((l) => [l.activityIndex, l]));
  const doneCount = activities.filter((_, i) => logByIndex.has(i)).length;
  const recorded = !!record && (!!record.scores || record.feedbacks.length > 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={styles.date}>{todayLabel()}</Text>
          <Text style={styles.greeting}>오늘도 함께해요</Text>
        </View>
        <ChildSwitcherButton />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>오늘 집에서 할 활동</Text>
          {activities.length > 0 && (
            <Text style={styles.progressText}>
              {doneCount} / {activities.length} 완료
            </Text>
          )}
        </View>

        {curriculumLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
        ) : activities.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.muted}>
              아직 오늘 활동이 없어요. 아이 정보와 지난 기록을 바탕으로 만들어 드릴게요.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, generateMutation.isPending && { opacity: 0.6 }]}
              onPress={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>오늘 활동 만들기</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.bar}>
              <View
                style={[styles.barFill, { width: `${(doneCount / activities.length) * 100}%` }]}
              />
            </View>
            {activities.map((activity, i) => {
              const log = logByIndex.get(i);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.activityRow}
                  onPress={() =>
                    router.push({ pathname: '/activity', params: { index: String(i) } })
                  }
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.dot,
                      log ? { backgroundColor: RESULT_DOT[log.result], borderWidth: 0 } : null,
                    ]}
                  >
                    {log?.result === 'SUCCESS' && <Text style={styles.dotCheck}>✓</Text>}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.activityTitle, log && styles.activityTitleDone]}>
                      {activity.title}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {DOMAIN_LABELS[activity.domain.toUpperCase()] ?? activity.domain} ·{' '}
                      {activity.durationMin}분{log ? ` · ${RESULT_LABELS[log.result]}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.recordCta, recorded && styles.recordCtaDone]}
        onPress={() => router.push('/daily-record')}
        accessibilityRole="button"
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.recordTitle, recorded && styles.recordTitleDone]}>
            {recorded ? '오늘 기록 완료' : '오늘 하루 기록하기'}
          </Text>
          <Text style={[styles.recordSub, recorded && styles.recordSubDone]}>
            {recorded ? '더 적을 일이 있으면 눌러주세요' : '1분이면 돼요 · 수업 피드백도 여기서'}
          </Text>
        </View>
        <Text style={[styles.chevron, !recorded && { color: '#FFFFFF' }]}>›</Text>
      </TouchableOpacity>

      {insight?.summary ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>이번 주 이렇게 달라졌어요</Text>
          <Text style={styles.body}>{insight.summary}</Text>
          {insight.recommendations[0] ? (
            <Text style={styles.body}>다음엔: {insight.recommendations[0]}</Text>
          ) : null}
          <Text style={styles.muted}>AI가 이번 주 기록을 바탕으로 정리했어요</Text>
        </View>
      ) : null}

      <View style={styles.linkRow}>
        <TouchableOpacity onPress={() => router.push('/guide')}>
          <Text style={styles.link}>처음이세요? 사용 가이드</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/dashboard')}>
          <Text style={styles.link}>자세한 대시보드 보기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: 14, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 13, color: colors.textSecondary },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  progressText: { fontSize: 13, fontWeight: '500', color: colors.primaryDark },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
    minHeight: 52,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C9C3BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCheck: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  activityTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  activityTitleDone: { color: colors.textSecondary },
  activityMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  chevron: { fontSize: 22, color: colors.textSecondary },
  recordCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryDark,
  },
  recordCtaDone: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  recordTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#FFFFFF' },
  recordTitleDone: { color: colors.primaryDark },
  recordSub: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  recordSubDone: { color: colors.primaryDark, opacity: 1 },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  muted: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
  primaryBtn: {
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 12,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  link: { fontSize: fontSize.sm, color: colors.primaryDark, textDecorationLine: 'underline' },
});
