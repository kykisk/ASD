import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useChildStore } from '../../stores/child.store.js';
import {
  useTodayCurriculum,
  useConfirmCurriculum,
  useLogActivity,
} from '../../hooks/use-curricula.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { CurriculumActivity, LogActivityInput } from '../../types/api.types.js';

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

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: colors.success,
  MEDIUM: colors.warning,
  HARD: colors.error,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  GENERATED: '생성됨',
  CONFIRMED: '확인됨',
  COMPLETED: '완료',
  FAILED: '실패',
};

type ActivityResult = 'SUCCESS' | 'PARTIAL' | 'SKIPPED' | 'FAILED';

const RESULT_LABELS: Record<ActivityResult, string> = {
  SUCCESS: '성공',
  PARTIAL: '부분',
  SKIPPED: '건너뜀',
  FAILED: '실패',
};

const RESULT_COLORS: Record<ActivityResult, string> = {
  SUCCESS: colors.success,
  PARTIAL: colors.warning,
  SKIPPED: colors.textMuted,
  FAILED: colors.error,
};

export default function CurriculumScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const { data: curriculum, isLoading, error, refetch } = useTodayCurriculum(selectedChildId);
  const confirmMutation = useConfirmCurriculum();
  const logMutation = useLogActivity();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loggedActivities, setLoggedActivities] = useState<Record<number, ActivityResult>>({});

  const handleConfirm = async () => {
    if (!selectedChildId || !curriculum) return;
    try {
      await confirmMutation.mutateAsync({ childId: selectedChildId, curriculumId: curriculum.id });
      Alert.alert('확인 완료', '커리큘럼이 확인되었습니다');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '확인에 실패했습니다';
      Alert.alert('오류', message);
    }
  };

  const handleLogActivity = async (index: number, result: ActivityResult) => {
    if (!selectedChildId || !curriculum) return;

    const activity = curriculum.activities[index];
    const input: LogActivityInput = {
      result,
      activityTitle: activity.title,
      curriculumId: curriculum.id,
      activityIndex: index,
    };

    try {
      await logMutation.mutateAsync({
        childId: selectedChildId,
        curriculumId: curriculum.id,
        activityIndex: index,
        input,
      });
      setLoggedActivities((prev) => ({ ...prev, [index]: result }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '기록에 실패했습니다';
      Alert.alert('오류', message);
    }
  };

  if (!selectedChildId) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ChildSwitcherButton />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>아이를 선택해주세요</Text>
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
        <Text style={styles.errorText}>커리큘럼을 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!curriculum) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <ChildSwitcherButton />
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>오늘의 커리큘럼이 아직 없습니다</Text>
          <Text style={styles.emptySubtext}>AI가 맞춤 커리큘럼을 생성할 예정입니다</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.primary} />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.statusText}>
              {STATUS_LABELS[curriculum.status] ?? curriculum.status}
            </Text>
          </View>
          {curriculum.weeklyGoal && (
            <Text style={styles.weeklyGoal} numberOfLines={2}>
              {curriculum.weeklyGoal}
            </Text>
          )}
        </View>
        <ChildSwitcherButton />
      </View>

      {curriculum.status === 'GENERATED' && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={confirmMutation.isPending}
        >
          <Text style={styles.confirmButtonText}>
            {confirmMutation.isPending ? '처리 중...' : '커리큘럼 확인'}
          </Text>
        </TouchableOpacity>
      )}

      {curriculum.activities.map((activity, index) => (
        <ActivityCard
          key={index}
          activity={activity}
          index={index}
          isExpanded={expandedIndex === index}
          onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          loggedResult={loggedActivities[index]}
          onLogResult={(result) => handleLogActivity(index, result)}
          isLogging={logMutation.isPending}
        />
      ))}
    </ScrollView>
  );
}

function ActivityCard({
  activity,
  index,
  isExpanded,
  onToggle,
  loggedResult,
  onLogResult,
  isLogging,
}: {
  activity: CurriculumActivity;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  loggedResult: ActivityResult | undefined;
  onLogResult: (result: ActivityResult) => void;
  isLogging: boolean;
}) {
  const domainColor = DOMAIN_COLORS[activity.domain] ?? colors.textMuted;

  return (
    <View style={styles.activityCard}>
      <TouchableOpacity style={styles.activityHeader} onPress={onToggle}>
        <View style={styles.activityTitleRow}>
          <Text style={styles.activityIndex}>{index + 1}</Text>
          <View style={styles.activityTitleContainer}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.domainTag, { backgroundColor: domainColor + '22' }]}>
                <Text style={[styles.domainTagText, { color: domainColor }]}>
                  {DOMAIN_LABELS[activity.domain] ?? activity.domain}
                </Text>
              </View>
              <View
                style={[
                  styles.difficultyTag,
                  { backgroundColor: DIFFICULTY_COLORS[activity.difficultyLevel] + '22' },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyTagText,
                    { color: DIFFICULTY_COLORS[activity.difficultyLevel] },
                  ]}
                >
                  {DIFFICULTY_LABELS[activity.difficultyLevel]}
                </Text>
              </View>
              <Text style={styles.durationText}>{activity.durationMin}분</Text>
            </View>
          </View>
          <Text style={styles.expandArrow}>{isExpanded ? '▴' : '▾'}</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.activityDetails}>
          <Text style={styles.detailLabel}>설명</Text>
          <Text style={styles.detailText}>{activity.description}</Text>

          {activity.materials && activity.materials.length > 0 && (
            <>
              <Text style={styles.detailLabel}>준비물</Text>
              {activity.materials.map((m, i) => (
                <Text key={i} style={styles.materialItem}>
                  • {m}
                </Text>
              ))}
            </>
          )}

          <Text style={styles.detailLabel}>단계</Text>
          {activity.steps.map((step, i) => (
            <Text key={i} style={styles.stepItem}>
              {i + 1}. {step}
            </Text>
          ))}

          <Text style={styles.detailLabel}>성공 기준</Text>
          <Text style={styles.detailText}>{activity.successCriteria}</Text>
        </View>
      )}

      {loggedResult ? (
        <View style={[styles.resultBadge, { backgroundColor: RESULT_COLORS[loggedResult] + '22' }]}>
          <Text style={[styles.resultBadgeText, { color: RESULT_COLORS[loggedResult] }]}>
            {RESULT_LABELS[loggedResult]}
          </Text>
        </View>
      ) : (
        <View style={styles.logButtons}>
          {(['SUCCESS', 'PARTIAL', 'SKIPPED'] as const).map((result) => (
            <TouchableOpacity
              key={result}
              style={[styles.logButton, { borderColor: RESULT_COLORS[result] }]}
              onPress={() => onLogResult(result)}
              disabled={isLogging}
            >
              <Text style={[styles.logButtonText, { color: RESULT_COLORS[result] }]}>
                {RESULT_LABELS[result]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  weeklyGoal: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  activityTitleContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  domainTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  domainTagText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  difficultyTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  difficultyTagText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  durationText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  expandArrow: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  activityDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  materialItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  stepItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginBottom: 2,
    lineHeight: 20,
  },
  logButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  logButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  resultBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  resultBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
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
