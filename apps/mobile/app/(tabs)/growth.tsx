import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useChildStore } from '../../stores/child.store.js';
import { useGrowth } from '../../hooks/use-growth.js';
import { useAggregatedAssessment, useAssessments } from '../../hooks/use-assessments.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { AggregatedDomain, TimeSeriesPoint, Assessment } from '../../types/api.types.js';

const TOOL_LABELS: Record<string, string> = {
  M_CHAT_R_F: 'M-CHAT-R/F',
  CARS_2: 'CARS-2',
  ABC: 'ABC',
  ADOS_2: 'ADOS-2',
  SCQ: 'SCQ',
};

function getLicensedSeverity(tool: string, score: number): { label: string; color: string } {
  if (tool === 'CARS_2') {
    if (score < 30) return { label: '비자폐', color: '#5B8A72' };
    if (score < 37) return { label: '경증-중등도', color: '#D4A800' };
    return { label: '중증', color: '#E88B8B' };
  }
  if (tool === 'M_CHAT_R_F') {
    if (score <= 2) return { label: '낮은 위험', color: '#5B8A72' };
    if (score <= 7) return { label: '중간 위험', color: '#D4A800' };
    return { label: '높은 위험', color: '#E88B8B' };
  }
  if (tool === 'ABC') {
    return score > 0
      ? { label: '유의미', color: '#F0A86E' }
      : { label: '정상 범위', color: '#5B8A72' };
  }
  return { label: `${score}점`, color: '#94A3B8' };
}

const DOMAIN_COLORS: Record<string, string> = {
  COMMUNICATION: '#7B9FD4',
  SOCIAL: '#E8A87C',
  MOTOR: '#9B8EC4',
  COGNITIVE: '#7EC8C8',
  EMOTIONAL: '#F2B880',
  DAILY_LIVING: '#94B8A0',
};

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
};

function TrendLabel({ direction, label }: { direction: string; label: string }) {
  const color =
    direction === 'UP' ? colors.success : direction === 'DOWN' ? colors.warning : colors.textMuted;
  const arrow = direction === 'UP' ? '↑' : direction === 'DOWN' ? '↓' : '→';
  return (
    <Text style={[styles.trendText, { color }]}>
      {arrow} {label}
    </Text>
  );
}

function DomainProgressBar({ domain }: { domain: AggregatedDomain }) {
  const barColor = DOMAIN_COLORS[domain.domain] ?? colors.textMuted;
  const percentage = Math.min(domain.percentage, 100);

  return (
    <View style={styles.domainBarRow}>
      <View style={styles.domainBarLabelRow}>
        <View style={[styles.domainDot, { backgroundColor: barColor }]} />
        <Text style={styles.domainBarLabel}>
          {domain.label || DOMAIN_LABELS[domain.domain] || domain.domain}
        </Text>
        <Text style={styles.domainBarScore}>{domain.currentScore.toFixed(1)}/5</Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.domainBarFooter}>
        <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
        <TrendLabel direction={domain.trend.direction} label={domain.trend.label} />
      </View>
    </View>
  );
}

function OverallTimeline({ points }: { points: TimeSeriesPoint[] }) {
  const lastPoints = points.slice(-7);

  if (lastPoints.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <Text style={styles.emptyText}>데이터가 아직 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineContainer}>
      {lastPoints.map((point, idx) => (
        <View key={idx} style={styles.timelineRow}>
          <Text style={styles.timelineDate}>
            {new Date(point.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </Text>
          <View style={styles.timelineBarOuter}>
            <View
              style={[
                styles.timelineBarInner,
                { width: `${Math.min((point.score / 5) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.timelineScore}>{point.score.toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function GrowthScreen() {
  const router = useRouter();
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const {
    data: growth,
    isLoading: loadingGrowth,
    error: growthError,
    refetch: refetchGrowth,
  } = useGrowth(selectedChildId, 30);
  const {
    data: aggregated,
    isLoading: loadingAgg,
    error: aggError,
    refetch: refetchAgg,
  } = useAggregatedAssessment(selectedChildId);
  const { data: allAssessments } = useAssessments(selectedChildId);

  const licensedAssessments = (allAssessments ?? []).filter(
    (a: Assessment) => a.questionnaire?.type === 'LICENSED' && a.totalScore !== null,
  );

  const isLoading = loadingGrowth || loadingAgg;
  const error = growthError || aggError;

  const handleRefresh = () => {
    refetchGrowth();
    refetchAgg();
  };

  if (!selectedChildId) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ChildSwitcherButton />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>아이를 선택해주세요</Text>
          <Text style={styles.emptyText}>평가 데이터가 쌓이면 성장 기록을 확인할 수 있습니다</Text>
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
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
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
        <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>성장 기록</Text>
        <ChildSwitcherButton />
      </View>

      {aggregated && (
        <View style={styles.card}>
          <View style={styles.overallHeader}>
            <Text style={styles.cardTitle}>종합 점수</Text>
            <View style={styles.overallScoreBadge}>
              <Text style={styles.overallScoreText}>{aggregated.overallScore.toFixed(1)}</Text>
              <Text style={styles.overallScoreMax}>/5</Text>
            </View>
          </View>
          <Text style={styles.assessmentCountText}>총 {aggregated.assessmentCount}회 평가</Text>
        </View>
      )}

      {aggregated && aggregated.domains.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>영역별 발달 현황</Text>
          <View style={styles.domainsContainer}>
            {aggregated.domains.map((domain) => (
              <DomainProgressBar key={domain.domain} domain={domain} />
            ))}
          </View>
        </View>
      )}

      {growth && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 종합 점수 추이</Text>
          <Text style={styles.dateRangeText}>
            {growth.dateRange.from} ~ {growth.dateRange.to}
          </Text>
          <OverallTimeline points={growth.overall} />
        </View>
      )}

      {growth && growth.domains.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>영역별 최근 점수</Text>
          {growth.domains.map((ds) => {
            const lastPoint = ds.data[ds.data.length - 1];
            return (
              <View key={ds.domain} style={styles.domainGrowthRow}>
                <View
                  style={[
                    styles.domainDot,
                    { backgroundColor: ds.color || DOMAIN_COLORS[ds.domain] || colors.textMuted },
                  ]}
                />
                <Text style={styles.domainGrowthLabel}>
                  {ds.label || DOMAIN_LABELS[ds.domain] || ds.domain}
                </Text>
                <Text style={styles.domainGrowthScore}>
                  {lastPoint ? lastPoint.score.toFixed(1) : '-'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 임상 평가 기록 */}
      <View style={styles.card}>
        <View style={styles.clinicalHeader}>
          <View>
            <Text style={styles.cardTitle}>임상 평가 기록</Text>
            <Text style={styles.clinicalSubtitle}>CARS-2 · M-CHAT-R/F · ABC</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('../licensed-assessment')}>
            <Text style={styles.clinicalLink}>+ 새 평가</Text>
          </TouchableOpacity>
        </View>

        {licensedAssessments.length === 0 ? (
          <View style={styles.clinicalEmpty}>
            <Text style={styles.clinicalEmptyIcon}>🏥</Text>
            <Text style={styles.clinicalEmptyTitle}>임상 평가 기록이 없습니다</Text>
            <Text style={styles.clinicalEmptyText}>라이선스 도구에서 평가를 시작해보세요</Text>
          </View>
        ) : (
          licensedAssessments.map((a: Assessment) => {
            const tool = a.questionnaire?.licensedTool ?? '';
            const sev = getLicensedSeverity(tool, a.totalScore ?? 0);
            const date = new Date(a.createdAt);
            const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
            return (
              <View key={a.id} style={styles.clinicalRow}>
                <View style={styles.clinicalIcon}>
                  <Text style={{ fontSize: 16 }}>🏥</Text>
                </View>
                <View style={styles.clinicalInfo}>
                  <Text style={styles.clinicalTool}>{TOOL_LABELS[tool] ?? tool}</Text>
                  <Text style={styles.clinicalDate}>
                    {dateStr} · 총점 {a.totalScore}점
                  </Text>
                </View>
                <View style={[styles.clinicalBadge, { borderColor: sev.color + '40' }]}>
                  <Text style={[styles.clinicalBadgeText, { color: sev.color }]}>{sev.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
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
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
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
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallScoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overallScoreText: {
    fontSize: fontSize.heading,
    fontWeight: '700',
    color: colors.primary,
  },
  overallScoreMax: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  assessmentCountText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  domainsContainer: {
    gap: spacing.md,
  },
  domainBarRow: {
    gap: spacing.xs,
  },
  domainBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  domainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  domainBarLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  domainBarScore: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  barContainer: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  domainBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  percentageText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  dateRangeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  timelineContainer: {
    gap: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    width: 50,
  },
  timelineBarOuter: {
    flex: 1,
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  timelineBarInner: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  timelineScore: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
    width: 28,
    textAlign: 'right',
  },
  timelineEmpty: {
    padding: spacing.md,
    alignItems: 'center',
  },
  domainGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  domainGrowthLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  domainGrowthScore: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.md,
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
  clinicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  clinicalSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  clinicalLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  clinicalEmpty: { alignItems: 'center', paddingVertical: spacing.xl },
  clinicalEmptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  clinicalEmptyTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  clinicalEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  clinicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  clinicalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#9B8EC420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicalInfo: { flex: 1 },
  clinicalTool: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  clinicalDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  clinicalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  clinicalBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
});
