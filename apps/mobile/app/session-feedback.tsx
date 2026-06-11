import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import {
  useSessionFeedbacks,
  useCreateSessionFeedback,
  useDeleteSessionFeedback,
  useFeedbackDigests,
  useGenerateFeedbackDigest,
} from '../hooks/use-session-feedbacks.js';
import type {
  SessionFeedback,
  CreateSessionFeedbackInput,
  FeedbackDigest,
} from '../hooks/use-session-feedbacks.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type TabKey = 'recent' | 'all' | 'ai';

const SESSION_TYPES = [
  { key: 'ABA', label: 'ABA' },
  { key: 'SPEECH', label: '언어치료' },
  { key: 'SENSORY', label: '감각통합' },
  { key: 'OCCUPATIONAL', label: '작업치료' },
  { key: 'BEHAVIORAL', label: '행동치료' },
  { key: 'OTHER', label: '기타' },
];

function getSessionTypeLabel(key: string): string {
  return SESSION_TYPES.find((t) => t.key === key)?.label ?? key;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <View style={cardStyles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={cardStyles.star}>
          {i <= rating ? '⭐' : '☆'}
        </Text>
      ))}
    </View>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={cardStyles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)}>
          <Text style={formStyles.starInput}>{i <= value ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─────────────── Feedback Card ───────────────
function FeedbackCard({ feedback, onDelete }: { feedback: SessionFeedback; onDelete: () => void }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <View style={cardStyles.typeBadge}>
          <Text style={cardStyles.typeBadgeText}>{getSessionTypeLabel(feedback.sessionType)}</Text>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Text style={cardStyles.deleteBtn}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <RatingStars rating={feedback.rating} />
      <Text style={cardStyles.content} numberOfLines={3}>
        {feedback.content}
      </Text>
      <View style={cardStyles.metaRow}>
        <Text style={cardStyles.date}>{formatDate(feedback.sessionDate)}</Text>
        {feedback.therapistName && <Text style={cardStyles.meta}>· {feedback.therapistName}</Text>}
        {feedback.institution && <Text style={cardStyles.meta}>· {feedback.institution}</Text>}
      </View>
      {feedback.progress && (
        <Text style={cardStyles.detail} numberOfLines={2}>
          📈 {feedback.progress}
        </Text>
      )}
      {feedback.challenges && (
        <Text style={cardStyles.detail} numberOfLines={2}>
          ⚡ {feedback.challenges}
        </Text>
      )}
      {feedback.homeWork && (
        <Text style={cardStyles.detail} numberOfLines={2}>
          📝 {feedback.homeWork}
        </Text>
      )}
    </View>
  );
}

// ─────────────── Tab: 최근 ───────────────
function RecentTab({
  childId,
  feedbacks,
  isLoading,
}: {
  childId: string;
  feedbacks: SessionFeedback[];
  isLoading: boolean;
}) {
  const deleteMutation = useDeleteSessionFeedback(childId);

  const handleDelete = (id: string) => {
    const doDelete = () => deleteMutation.mutate(id);
    if (Platform.OS === 'web') {
      if (window.confirm('이 피드백을 삭제하시겠습니까?')) doDelete();
    } else {
      Alert.alert('삭제 확인', '이 피드백을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={tabStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Filter last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentFeedbacks = feedbacks.filter((f) => new Date(f.sessionDate) >= sevenDaysAgo);

  if (recentFeedbacks.length === 0) {
    return (
      <View style={tabStyles.emptyState}>
        <Text style={tabStyles.emptyIcon}>📝</Text>
        <Text style={tabStyles.emptyText}>최근 7일간 피드백이 없습니다</Text>
        <Text style={tabStyles.emptyHint}>수업 후 피드백을 작성하면 여기에 표시됩니다.</Text>
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.sectionTitle}>최근 7일 ({recentFeedbacks.length}건)</Text>
      <View style={tabStyles.list}>
        {recentFeedbacks.map((f) => (
          <FeedbackCard key={f.id} feedback={f} onDelete={() => handleDelete(f.id)} />
        ))}
      </View>
    </View>
  );
}

// ─────────────── Tab: 전체 ───────────────
function AllTab({
  childId,
  feedbacks,
  isLoading,
  selectedType,
  onTypeChange,
  onShowForm,
}: {
  childId: string;
  feedbacks: SessionFeedback[];
  isLoading: boolean;
  selectedType: string;
  onTypeChange: (type: string) => void;
  onShowForm: () => void;
}) {
  const deleteMutation = useDeleteSessionFeedback(childId);

  const handleDelete = (id: string) => {
    const doDelete = () => deleteMutation.mutate(id);
    if (Platform.OS === 'web') {
      if (window.confirm('이 피드백을 삭제하시겠습니까?')) doDelete();
    } else {
      Alert.alert('삭제 확인', '이 피드백을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={tabStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filtered = selectedType
    ? feedbacks.filter((f) => f.sessionType === selectedType)
    : feedbacks;

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.filterHeader}>
        <Text style={tabStyles.sectionTitle}>전체 피드백 ({filtered.length}건)</Text>
        <TouchableOpacity style={tabStyles.createBtn} onPress={onShowForm}>
          <Text style={tabStyles.createBtnText}>피드백 작성</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tabStyles.chipScroll}>
        <View style={tabStyles.chipRow}>
          <TouchableOpacity
            style={[tabStyles.chip, !selectedType && tabStyles.chipActive]}
            onPress={() => onTypeChange('')}
          >
            <Text style={[tabStyles.chipText, !selectedType && tabStyles.chipTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
          {SESSION_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[tabStyles.chip, selectedType === t.key && tabStyles.chipActive]}
              onPress={() => onTypeChange(t.key)}
            >
              <Text
                style={[tabStyles.chipText, selectedType === t.key && tabStyles.chipTextActive]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>📋</Text>
          <Text style={tabStyles.emptyText}>피드백이 없습니다</Text>
        </View>
      ) : (
        <View style={tabStyles.list}>
          {filtered.map((f) => (
            <FeedbackCard key={f.id} feedback={f} onDelete={() => handleDelete(f.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────── Tab: AI 요약 ───────────────
function AiTab({ childId }: { childId: string }) {
  const { data: digests, isLoading } = useFeedbackDigests(childId);
  const generateMutation = useGenerateFeedbackDigest(childId);

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={tabStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.filterHeader}>
        <Text style={tabStyles.sectionTitle}>AI 주간 요약</Text>
        <TouchableOpacity
          style={[
            tabStyles.generateBtn,
            generateMutation.isPending && tabStyles.generateBtnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={tabStyles.generateBtnText}>✨ AI 요약 생성</Text>
          )}
        </TouchableOpacity>
      </View>

      {!digests || digests.length === 0 ? (
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>🤖</Text>
          <Text style={tabStyles.emptyText}>AI 요약이 없습니다</Text>
          <Text style={tabStyles.emptyHint}>
            피드백을 여러 건 작성한 후 AI 요약을 생성해보세요.
          </Text>
        </View>
      ) : (
        <View style={tabStyles.list}>
          {digests.map((digest) => (
            <DigestCard key={digest.id} digest={digest} />
          ))}
        </View>
      )}
    </View>
  );
}

function DigestCard({ digest }: { digest: FeedbackDigest }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <Text style={cardStyles.digestWeek}>📅 {digest.weekKey}</Text>
        <Text style={cardStyles.digestCount}>{digest.feedbackCount}건 분석</Text>
      </View>
      <Text style={cardStyles.digestSummary}>{digest.summary}</Text>

      {digest.highlights.length > 0 && (
        <View style={cardStyles.digestSection}>
          <Text style={cardStyles.digestLabel}>✅ 하이라이트</Text>
          {digest.highlights.map((h, i) => (
            <Text key={i} style={cardStyles.digestItem}>
              • {h}
            </Text>
          ))}
        </View>
      )}

      {digest.concerns.length > 0 && (
        <View style={cardStyles.digestSection}>
          <Text style={cardStyles.digestLabel}>⚠️ 주의사항</Text>
          {digest.concerns.map((c, i) => (
            <Text key={i} style={cardStyles.digestItem}>
              • {c}
            </Text>
          ))}
        </View>
      )}

      {digest.homeWorkSummary && (
        <View style={cardStyles.digestSection}>
          <Text style={cardStyles.digestLabel}>📝 숙제 요약</Text>
          <Text style={cardStyles.digestItem}>{digest.homeWorkSummary}</Text>
        </View>
      )}

      <Text style={cardStyles.digestPeriod}>
        {formatDate(digest.periodStart)} ~ {formatDate(digest.periodEnd)}
      </Text>
    </View>
  );
}

// ─────────────── FeedbackType & BehaviorTags ───────────────
type FeedbackType = 'SESSION' | 'DAILY_LOG' | 'BEHAVIORAL_ISSUE';

const FEEDBACK_TYPES: { key: FeedbackType; label: string }[] = [
  { key: 'SESSION', label: '📚 수업' },
  { key: 'DAILY_LOG', label: '📝 일상' },
  { key: 'BEHAVIORAL_ISSUE', label: '⚠️ 문제행동' },
];

const BEHAVIOR_TAGS = ['발작', '자해', '공격', '탈주', '멜트다운', '상동행동', '기타'];

// ─────────────── Creation Form ───────────────
function CreationForm({ childId, onClose }: { childId: string; onClose: () => void }) {
  const createMutation = useCreateSessionFeedback(childId);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('SESSION');
  const [sessionType, setSessionType] = useState('ABA');
  const [rating, setRating] = useState(3);
  const [content, setContent] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [progress, setProgress] = useState('');
  const [challenges, setChallenges] = useState('');
  const [homeWork, setHomeWork] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [institution, setInstitution] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [severity, setSeverity] = useState<number | null>(null);
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);

  const toggleBehaviorTag = (tag: string) => {
    setBehaviorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const getContentPlaceholder = (): string => {
    if (feedbackType === 'BEHAVIORAL_ISSUE') return '어떤 문제행동이 있었나요?';
    if (feedbackType === 'DAILY_LOG') return '오늘 아이는 어땠나요?';
    return '선생님이 뭐라고 하셨나요?';
  };

  const handleSave = async () => {
    if (!content.trim()) {
      if (Platform.OS === 'web') {
        window.alert('피드백 내용을 입력해주세요.');
      } else {
        Alert.alert('입력 필요', '피드백 내용을 입력해주세요.');
      }
      return;
    }

    const input: CreateSessionFeedbackInput = {
      sessionDate: new Date().toISOString().split('T')[0],
      sessionType,
      rating,
      content: content.trim(),
      progress: progress.trim() || null,
      challenges: challenges.trim() || null,
      homeWork: homeWork.trim() || null,
      therapistName: therapistName.trim() || null,
      institution: institution.trim() || null,
      durationMin: durationMin ? Number(durationMin) : null,
      feedbackType,
      severity: feedbackType === 'BEHAVIORAL_ISSUE' ? severity : null,
      behaviorTags: feedbackType === 'BEHAVIORAL_ISSUE' ? behaviorTags : [],
    };

    try {
      await createMutation.mutateAsync(input);
      onClose();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('저장에 실패했습니다.');
      } else {
        Alert.alert('오류', '저장에 실패했습니다.');
      }
    }
  };

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>피드백 작성</Text>

      <Text style={formStyles.label}>유형</Text>
      <View style={formStyles.typeRow}>
        {FEEDBACK_TYPES.map((ft) => (
          <TouchableOpacity
            key={ft.key}
            style={[
              formStyles.feedbackTypeChip,
              feedbackType === ft.key && formStyles.feedbackTypeChipActive,
            ]}
            onPress={() => setFeedbackType(ft.key)}
          >
            <Text
              style={[
                formStyles.feedbackTypeChipText,
                feedbackType === ft.key && formStyles.feedbackTypeChipTextActive,
              ]}
            >
              {ft.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {feedbackType === 'SESSION' && (
        <>
          <Text style={formStyles.label}>수업 유형</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={formStyles.typeRow}>
              {SESSION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[formStyles.typeChip, sessionType === t.key && formStyles.typeChipActive]}
                  onPress={() => setSessionType(t.key)}
                >
                  <Text
                    style={[
                      formStyles.typeChipText,
                      sessionType === t.key && formStyles.typeChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {feedbackType === 'BEHAVIORAL_ISSUE' && (
        <>
          <Text style={formStyles.label}>심각도</Text>
          <View style={formStyles.severityRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[formStyles.severityBtn, severity === n && formStyles.severityBtnActive]}
                onPress={() => setSeverity(n)}
              >
                <Text
                  style={[
                    formStyles.severityBtnText,
                    severity === n && formStyles.severityBtnTextActive,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={formStyles.label}>행동 태그</Text>
          <View style={formStyles.tagsWrap}>
            {BEHAVIOR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[formStyles.tagChip, behaviorTags.includes(tag) && formStyles.tagChipActive]}
                onPress={() => toggleBehaviorTag(tag)}
              >
                <Text
                  style={[
                    formStyles.tagChipText,
                    behaviorTags.includes(tag) && formStyles.tagChipTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={formStyles.label}>평가</Text>
      <RatingInput value={rating} onChange={setRating} />

      <Text style={formStyles.label}>내용</Text>
      <TextInput
        style={[formStyles.input, formStyles.textArea]}
        placeholder={getContentPlaceholder()}
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        value={content}
        onChangeText={setContent}
      />

      <TouchableOpacity style={formStyles.moreToggle} onPress={() => setShowMore(!showMore)}>
        <Text style={formStyles.moreToggleText}>{showMore ? '▲ 접기' : '▼ 더 입력하기'}</Text>
      </TouchableOpacity>

      {showMore && (
        <View style={formStyles.moreSection}>
          <TextInput
            style={formStyles.input}
            placeholder="진전 사항"
            placeholderTextColor={colors.textMuted}
            value={progress}
            onChangeText={setProgress}
          />
          <TextInput
            style={formStyles.input}
            placeholder="어려운 점"
            placeholderTextColor={colors.textMuted}
            value={challenges}
            onChangeText={setChallenges}
          />
          <TextInput
            style={formStyles.input}
            placeholder="숙제 / 가정 연계"
            placeholderTextColor={colors.textMuted}
            value={homeWork}
            onChangeText={setHomeWork}
          />
          <TextInput
            style={formStyles.input}
            placeholder="치료사 이름"
            placeholderTextColor={colors.textMuted}
            value={therapistName}
            onChangeText={setTherapistName}
          />
          <TextInput
            style={formStyles.input}
            placeholder="기관명"
            placeholderTextColor={colors.textMuted}
            value={institution}
            onChangeText={setInstitution}
          />
          <TextInput
            style={formStyles.input}
            placeholder="수업 시간 (분)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={durationMin}
            onChangeText={setDurationMin}
          />
        </View>
      )}

      <View style={formStyles.actions}>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onClose}>
          <Text style={formStyles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[formStyles.saveBtn, createMutation.isPending && formStyles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={formStyles.saveBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────── Main Screen ───────────────
export default function SessionFeedbackScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const [activeTab, setActiveTab] = useState<TabKey>('recent');
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');

  const { data: feedbacks, isLoading } = useSessionFeedbacks(selectedChildId);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'recent', label: '최근' },
    { key: 'all', label: '전체' },
    { key: 'ai', label: 'AI 요약' },
  ];

  if (!selectedChildId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '수업 피드백', headerShown: true }} />
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>👶</Text>
          <Text style={tabStyles.emptyText}>아이를 선택해주세요</Text>
          <Text style={tabStyles.emptyHint}>
            더보기 탭에서 아이를 선택한 후 이용할 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '수업 피드백', headerShown: true }} />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inline Creation Form */}
      {showForm && <CreationForm childId={selectedChildId} onClose={() => setShowForm(false)} />}

      {/* Tab Content */}
      {activeTab === 'recent' && (
        <RecentTab childId={selectedChildId} feedbacks={feedbacks ?? []} isLoading={isLoading} />
      )}
      {activeTab === 'all' && (
        <AllTab
          childId={selectedChildId}
          feedbacks={feedbacks ?? []}
          isLoading={isLoading}
          selectedType={filterType}
          onTypeChange={setFilterType}
          onShowForm={() => setShowForm(true)}
        />
      )}
      {activeTab === 'ai' && <AiTab childId={selectedChildId} />}
    </ScrollView>
  );
}

// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

const tabStyles = StyleSheet.create({
  container: { gap: spacing.md },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  list: { gap: spacing.sm },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },
  generateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },
  chipScroll: { marginVertical: spacing.xs },
  chipRow: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primaryDark },
  deleteBtn: { fontSize: fontSize.lg, padding: spacing.xs },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: fontSize.sm },
  content: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary },
  detail: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
  digestWeek: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  digestCount: { fontSize: fontSize.xs, color: colors.textMuted },
  digestSummary: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  digestSection: { gap: 2, marginTop: spacing.xs },
  digestLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSecondary },
  digestItem: { fontSize: fontSize.xs, color: colors.textSecondary, paddingLeft: spacing.xs },
  digestPeriod: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
});

const formStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  typeRow: { flexDirection: 'row', gap: spacing.xs },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: { fontSize: fontSize.xs, color: colors.textSecondary },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  feedbackTypeChip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: '#f5f5f5',
  },
  feedbackTypeChipActive: {
    backgroundColor: colors.primary,
  },
  feedbackTypeChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  feedbackTypeChipTextActive: { color: '#fff', fontWeight: '600' },
  severityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  severityBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  severityBtnActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  severityBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  severityBtnTextActive: { color: '#fff' },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  tagChipActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  tagChipText: { fontSize: fontSize.xs, color: colors.textSecondary },
  tagChipTextActive: { color: '#fff', fontWeight: '600' },
  starInput: { fontSize: fontSize.xl },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  moreToggle: { alignSelf: 'center', paddingVertical: spacing.xs },
  moreToggleText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  moreSection: { gap: spacing.sm },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },
});
