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
  Platform,
} from 'react-native';
import { useChildStore } from '../../stores/child.store.js';
import {
  useTodayCurriculum,
  useConfirmCurriculum,
  useCompleteCurriculum,
  useLogActivity,
  useGenerateCurriculum,
  useCurriculumHistory,
} from '../../hooks/use-curricula.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { Curriculum, CurriculumActivity, LogActivityInput } from '../../types/api.types.js';

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
  const { data: history, isLoading: historyLoading } = useCurriculumHistory(selectedChildId, 30);
  const confirmMutation = useConfirmCurriculum();
  const completeMutation = useCompleteCurriculum();
  const logMutation = useLogActivity();
  const generateMutation = useGenerateCurriculum();
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loggedActivities, setLoggedActivities] = useState<Record<number, ActivityResult>>({});
  const [selectedHistoryCurriculum, setSelectedHistoryCurriculum] = useState<Curriculum | null>(
    null,
  );

  const allActivitiesLogged =
    curriculum &&
    curriculum.activities.length > 0 &&
    curriculum.activities.every((_, idx) => loggedActivities[idx] !== undefined);

  const handleGenerate = async () => {
    if (!selectedChildId) return;
    try {
      await generateMutation.mutateAsync(selectedChildId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '생성에 실패했습니다';
      Alert.alert('오류', message);
    }
  };

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

  const handleComplete = async () => {
    if (!selectedChildId || !curriculum) return;
    const confirm =
      Platform.OS === 'web'
        ? window.confirm('오늘의 커리큘럼을 완료하시겠습니까?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert('커리큘럼 완료', '오늘의 커리큘럼을 완료하시겠습니까?', [
              { text: '취소', style: 'cancel', onPress: () => resolve(false) },
              { text: '완료', onPress: () => resolve(true) },
            ]);
          });
    if (!confirm) return;
    try {
      await completeMutation.mutateAsync({ childId: selectedChildId, curriculumId: curriculum.id });
      Alert.alert('완료! 🎉', '오늘의 커리큘럼을 모두 마쳤습니다');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '완료 처리에 실패했습니다';
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
          <Text style={styles.emptyTitle}>오늘의 커리큘럼이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            AI가 아이의 평가 데이터를 분석해{'\n'}맞춤 커리큘럼을 생성합니다
          </Text>
          <TouchableOpacity
            style={[
              styles.generateButton,
              generateMutation.isPending && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.generateButtonText}>✨ AI 커리큘럼 생성하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>오늘</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            히스토리
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'history' ? (
        <HistoryView
          history={history ?? []}
          isLoading={historyLoading}
          selectedCurriculum={selectedHistoryCurriculum}
          onSelect={setSelectedHistoryCurriculum}
        />
      ) : (
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

          {curriculum.status !== 'COMPLETED' && (
            <TouchableOpacity
              style={[
                styles.completeButton,
                (!allActivitiesLogged || completeMutation.isPending) &&
                  styles.completeButtonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!allActivitiesLogged || completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.completeButtonText}>
                  {allActivitiesLogged
                    ? '✅ 오늘 커리큘럼 완료'
                    : `활동을 모두 기록하면 완료할 수 있어요`}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {curriculum.status === 'COMPLETED' && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedBannerText}>🎉 오늘 커리큘럼 완료!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function HistoryView({
  history,
  isLoading,
  selectedCurriculum,
  onSelect,
}: {
  history: Curriculum[];
  isLoading: boolean;
  selectedCurriculum: Curriculum | null;
  onSelect: (c: Curriculum | null) => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>아직 커리큘럼 기록이 없습니다</Text>
      </View>
    );
  }

  if (selectedCurriculum) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => onSelect(null)}>
          <Text style={styles.backButtonText}>← 목록으로</Text>
        </TouchableOpacity>
        <View style={styles.historyDetailCard}>
          <Text style={styles.historyDetailDate}>
            {new Date(selectedCurriculum.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.primaryLight, alignSelf: 'flex-start' },
            ]}
          >
            <Text style={styles.statusText}>
              {STATUS_LABELS[selectedCurriculum.status] ?? selectedCurriculum.status}
            </Text>
          </View>
          {selectedCurriculum.weeklyGoal && (
            <Text style={styles.weeklyGoal}>{selectedCurriculum.weeklyGoal}</Text>
          )}
          {selectedCurriculum.activities.map((act, idx) => (
            <View key={idx} style={styles.historyActivityItem}>
              <Text style={styles.historyActivityTitle}>{act.title}</Text>
              <Text style={styles.historyActivityMeta}>
                {act.domain} · {act.durationMin}분
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {history.map((item) => (
        <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => onSelect(item)}>
          <View style={styles.historyItemLeft}>
            <Text style={styles.historyItemDate}>
              {new Date(item.date).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </Text>
            <Text style={styles.historyItemCount}>활동 {item.activities.length}개</Text>
          </View>
          <View
            style={[
              styles.historyStatusBadge,
              item.status === 'COMPLETED' && styles.historyStatusCompleted,
            ]}
          >
            <Text
              style={[
                styles.historyStatusText,
                item.status === 'COMPLETED' && styles.historyStatusTextCompleted,
              ]}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </TouchableOpacity>
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
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  generateButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  completeButton: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: colors.cardBorder,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  completedBanner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#E8F5EE',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  completedBannerText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  historyItemLeft: { gap: 4 },
  historyItemDate: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  historyItemCount: { fontSize: fontSize.xs, color: colors.textSecondary },
  historyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBorder,
  },
  historyStatusCompleted: { backgroundColor: colors.primaryLight },
  historyStatusText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  historyStatusTextCompleted: { color: colors.primary },
  historyDetailCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  historyDetailDate: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  historyActivityItem: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  historyActivityTitle: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  historyActivityMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
});
