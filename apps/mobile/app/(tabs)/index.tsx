import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useCallback } from 'react';
import { useAuthStore } from '../../stores/auth.store.js';
import { useChildStore } from '../../stores/child.store.js';
import { useDashboard } from '../../hooks/use-dashboard.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { TodaySchedule, DashboardDomainScore, DashboardAlert } from '../../types/api.types.js';

const CATEGORY_COLORS: Record<string, string> = {
  THERAPY: '#5B8A72',
  EDUCATION: '#7B9FD4',
  FREE_PLAY: '#E8A87C',
  MEAL: '#F2B880',
  SLEEP: '#9B8EC4',
  OTHER: '#94A3B4',
};

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
};

function TrendArrow({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' }) {
  if (trend === 'UP') return <Text style={styles.trendUp}>↑</Text>;
  if (trend === 'DOWN') return <Text style={styles.trendDown}>↓</Text>;
  return <Text style={styles.trendStable}>→</Text>;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const { data, isLoading, error, refetch } = useDashboard(selectedChildId);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (!selectedChildId) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ChildSwitcherButton />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>아이를 선택해주세요</Text>
          <Text style={styles.emptyText}>아이를 등록하면 맞춤 대시보드를 확인할 수 있습니다</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>데이터를 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>안녕하세요, {user?.name || '사용자'}님 👋</Text>
          {data && (
            <Text style={styles.greetingSubtext}>
              {data.child.name} · {Math.floor(data.child.ageMonths / 12)}세{' '}
              {data.child.ageMonths % 12}개월
            </Text>
          )}
        </View>
        <ChildSwitcherButton />
      </View>

      {data && data.alerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {data.alerts.map((alert, idx) => (
            <AlertBanner key={idx} alert={alert} />
          ))}
        </View>
      )}

      {data && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘의 일정</Text>
          <Text style={styles.progressLabel}>
            {data.today.completedCount}/{data.today.totalCount} 완료
          </Text>
          {data.today.schedules.length === 0 ? (
            <Text style={styles.cardEmpty}>등록된 일정이 없습니다</Text>
          ) : (
            data.today.schedules
              .slice(0, 3)
              .map((schedule) => <ScheduleItem key={schedule.id} schedule={schedule} />)
          )}
        </View>
      )}

      {data && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>주간 진행률</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(data.weeklyProgress.completionRate, 100)}%` },
              ]}
            />
          </View>
          <View style={styles.weeklyStatsRow}>
            <Text style={styles.statText}>
              완료율 {Math.round(data.weeklyProgress.completionRate)}%
            </Text>
            <Text style={styles.statText}>평가 {data.weeklyProgress.assessmentCount}회</Text>
            <Text style={styles.statText}>연속 {data.weeklyProgress.streak}일</Text>
          </View>
        </View>
      )}

      {data?.recentAssessment && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 평가</Text>
          <Text style={styles.assessmentDate}>{data.recentAssessment.date}</Text>
          <Text style={styles.overallScore}>
            종합 점수: {data.recentAssessment.overallScore.toFixed(1)}
          </Text>
          <View style={styles.domainScoresContainer}>
            {data.recentAssessment.domainScores.map((ds) => (
              <DomainScoreRow key={ds.domain} domainScore={ds} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function ScheduleItem({ schedule }: { schedule: TodaySchedule }) {
  const categoryColor = CATEGORY_COLORS[schedule.category] ?? CATEGORY_COLORS.OTHER;

  return (
    <View style={styles.scheduleItem}>
      <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
      <View style={styles.scheduleInfo}>
        <Text style={[styles.scheduleTitle, schedule.isCompleted && styles.completedText]}>
          {schedule.title}
        </Text>
        <Text style={styles.scheduleTime}>
          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
        </Text>
      </View>
      {schedule.isCompleted && <Text style={styles.checkBadge}>✓</Text>}
    </View>
  );
}

function DomainScoreRow({ domainScore }: { domainScore: DashboardDomainScore }) {
  return (
    <View style={styles.domainRow}>
      <Text style={styles.domainLabel}>
        {DOMAIN_LABELS[domainScore.domain] ?? domainScore.domain}
      </Text>
      <Text style={styles.domainScore}>{domainScore.score.toFixed(1)}</Text>
      <TrendArrow trend={domainScore.trend} />
    </View>
  );
}

function AlertBanner({ alert }: { alert: DashboardAlert }) {
  const isWarning = alert.severity === 'warning';
  return (
    <View style={[styles.alertBanner, isWarning ? styles.alertWarning : styles.alertInfo]}>
      <Text style={styles.alertText}>{alert.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  greetingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
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
  cardEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  scheduleTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkBadge: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  assessmentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  overallScore: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  domainScoresContainer: {
    gap: spacing.xs,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  domainLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  domainScore: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  trendUp: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '700',
  },
  trendDown: {
    fontSize: fontSize.md,
    color: colors.warning,
    fontWeight: '700',
  },
  trendStable: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: '700',
  },
  alertsContainer: {
    gap: spacing.xs,
  },
  alertBanner: {
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  alertInfo: {
    backgroundColor: '#EBF5FB',
  },
  alertWarning: {
    backgroundColor: '#FEF9E7',
  },
  alertText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
