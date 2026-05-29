import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useChildStore } from '../../stores/child.store.js';
import {
  useQuestionnaires,
  useQuestionnaireDetail,
  useCreateAssessment,
  useAssessments,
} from '../../hooks/use-assessments.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { QuestionnaireItem, Questionnaire } from '../../types/api.types.js';

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

const SCORE_COLORS = [colors.score1, colors.score2, colors.score3, colors.score4, colors.score5];

export default function AssessmentScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const familyId = useChildStore((s) => s.familyId);
  const { data: questionnaires, isLoading: loadingQ } = useQuestionnaires(familyId);
  const { data: assessments, refetch: refetchAssessments } = useAssessments(selectedChildId);
  const createMutation = useCreateAssessment();

  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  const { data: questionnaire, isLoading: loadingDetail } =
    useQuestionnaireDetail(selectedQuestionnaireId);

  const handleSelectQuestionnaire = (q: Questionnaire) => {
    setSelectedQuestionnaireId(q.id);
    setShowSelector(false);
    setScores({});
    setNotes('');
  };

  const handleScoreChange = (itemId: string, score: number) => {
    setScores((prev) => ({ ...prev, [itemId]: score }));
  };

  const handleSubmit = async () => {
    if (!selectedChildId || !questionnaire || !selectedQuestionnaireId) return;

    const allItems = questionnaire.items;
    const unanswered = allItems.filter((item) => !scores[item.id]);
    if (unanswered.length > 0) {
      Alert.alert('미완료', `${unanswered.length}개 문항이 아직 응답되지 않았습니다`);
      return;
    }

    const scoreEntries = allItems.map((item) => ({
      itemId: item.id,
      domain: item.domain,
      score: scores[item.id],
    }));

    try {
      await createMutation.mutateAsync({
        childId: selectedChildId,
        input: {
          questionnaireId: selectedQuestionnaireId,
          frequency: 'DAILY',
          notes: notes || undefined,
          scores: scoreEntries,
        },
      });
      Alert.alert('완료', '평가가 저장되었습니다');
      setSelectedQuestionnaireId(null);
      setScores({});
      setNotes('');
      refetchAssessments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '평가 저장에 실패했습니다';
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

  const groupedItems = questionnaire?.items.reduce<Record<string, QuestionnaireItem[]>>(
    (acc, item) => {
      if (!acc[item.domain]) acc[item.domain] = [];
      acc[item.domain].push(item);
      return acc;
    },
    {},
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => refetchAssessments()}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>평가하기</Text>
        <ChildSwitcherButton />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>질문지 선택</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowSelector(!showSelector)}
        >
          <Text style={styles.selectorText}>{questionnaire?.name ?? '질문지를 선택하세요'}</Text>
          <Text style={styles.selectorArrow}>{showSelector ? '▴' : '▾'}</Text>
        </TouchableOpacity>

        {showSelector && (
          <View style={styles.selectorDropdown}>
            {loadingQ ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              questionnaires?.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={styles.selectorItem}
                  onPress={() => handleSelectQuestionnaire(q)}
                >
                  <Text style={styles.selectorItemText}>{q.name}</Text>
                  <Text style={styles.selectorItemSub}>
                    {q.domains.map((d) => DOMAIN_LABELS[d] ?? d).join(', ')}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {loadingDetail && selectedQuestionnaireId && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
      )}

      {groupedItems &&
        Object.entries(groupedItems).map(([domain, items]) => (
          <View key={domain} style={styles.domainSection}>
            <View style={styles.domainHeader}>
              <View
                style={[
                  styles.domainDot,
                  { backgroundColor: DOMAIN_COLORS[domain] ?? colors.textMuted },
                ]}
              />
              <Text style={styles.domainTitle}>{DOMAIN_LABELS[domain] ?? domain}</Text>
            </View>
            {items
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((item) => (
                <View key={item.id} style={styles.questionItem}>
                  <Text style={styles.questionText}>{item.text}</Text>
                  <View style={styles.scoreRow}>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <TouchableOpacity
                        key={score}
                        style={[
                          styles.scoreCircle,
                          scores[item.id] === score && {
                            backgroundColor: SCORE_COLORS[score - 1],
                            borderColor: SCORE_COLORS[score - 1],
                          },
                        ]}
                        onPress={() => handleScoreChange(item.id, score)}
                      >
                        <Text
                          style={[
                            styles.scoreNumber,
                            scores[item.id] === score && styles.scoreNumberActive,
                          ]}
                        >
                          {score}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
          </View>
        ))}

      {questionnaire && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>메모 (선택)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="추가 메모를 입력하세요"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {createMutation.isPending ? '저장 중...' : '평가 제출'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {assessments && assessments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 평가</Text>
          {assessments.slice(0, 5).map((assessment) => (
            <View key={assessment.id} style={styles.recentItem}>
              <Text style={styles.recentDate}>
                {new Date(assessment.createdAt).toLocaleDateString('ko-KR')}
              </Text>
              <Text style={styles.recentScore}>
                {assessment.totalScore !== null ? `${assessment.totalScore.toFixed(1)}점` : '-'}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  selectorText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  selectorArrow: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  selectorDropdown: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  selectorItem: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorItemText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  selectorItemSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  domainSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  domainDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  domainTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  questionItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  questionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scoreNumberActive: {
    color: '#FFFFFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  recentDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  recentScore: {
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
  },
});
