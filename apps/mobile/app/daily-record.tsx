import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import {
  DAILY_RECORD_DOMAINS,
  useCreateDailyRecord,
  useDailyRecord,
  type CreateDailyRecordInput,
  type DailyRecordDomain,
} from '../hooks/use-daily-record.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';
import { runTour, takePendingTour } from '../lib/tour.js';

const SCORE_COLORS = [colors.score1, colors.score2, colors.score3, colors.score4, colors.score5];

const SESSION_TYPES = [
  { key: 'SPEECH', label: '언어치료' },
  { key: 'SPECIAL_PE', label: '특수체육' },
  { key: 'SENSORY', label: '감각통합' },
  { key: 'ABA', label: 'ABA' },
  { key: 'OCCUPATIONAL', label: '작업치료' },
  { key: 'PLAY', label: '놀이치료' },
  { key: 'OTHER', label: '기타' },
];

const BEHAVIOR_TAGS = ['멜트다운', '공격', '자해', '탈주', '상동행동', '발작', '기타'];

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(title, message);
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DailyRecordScreen() {
  const router = useRouter();
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const { data: today, isLoading } = useDailyRecord(selectedChildId);
  const createMutation = useCreateDailyRecord();

  const [scores, setScores] = useState<Partial<Record<DailyRecordDomain, number>>>({});
  const [note, setNote] = useState('');
  const [sessionOn, setSessionOn] = useState(false);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [therapistFeedback, setTherapistFeedback] = useState('');
  const [behaviorOn, setBehaviorOn] = useState(false);
  const [severity, setSeverity] = useState(3);
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);
  const [behaviorContent, setBehaviorContent] = useState('');

  const alreadyScored = !!today?.scores;

  // 따라하기 투어의 마지막 부분
  useEffect(() => {
    if (isLoading || !takePendingTour('record')) return;
    const timer = setTimeout(
      () =>
        runTour([
          {
            target: 'tour-scores',
            title: '아이가 오늘 어땠나요?',
            body: '5가지 영역을 1(힘들었어요)~5(아주 좋았어요)로 눌러요. 모르는 영역은 비워둬도 돼요.',
          },
          {
            target: 'tour-session',
            title: '수업 · 힘든 행동',
            body: '센터 수업이 있었거나 힘든 행동이 있었으면 스위치를 켜고 적어요. 다 적으면 저장하기!',
          },
          {
            title: '내일 아침엔 새 활동이 준비돼요 🌱',
            body: '오늘 기록을 보고 AI가 쉽게 또는 한 단계 높여 활동을 바꿔요. 아래 탭(오늘 · 커리큘럼 · 성장 · 논문 · 더보기) 화면마다 위쪽 "도움말"을 누르면 사용법을 안내해 드려요.',
          },
        ]),
      500,
    );
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleSave = async () => {
    if (!selectedChildId) return;
    if (sessionOn && !sessionType) {
      notify('입력 필요', '어떤 수업이었는지 골라주세요');
      return;
    }
    if (behaviorOn && !behaviorContent.trim()) {
      notify('입력 필요', '어떤 일이 있었는지 한 줄만 적어주세요');
      return;
    }

    const input: CreateDailyRecordInput = {
      scores,
      note: note.trim() || undefined,
      session:
        sessionOn && sessionType
          ? { sessionType, therapistFeedback: therapistFeedback.trim() || undefined }
          : undefined,
      behavior: behaviorOn
        ? { severity, tags: behaviorTags, content: behaviorContent.trim() }
        : undefined,
    };
    const hasContent =
      Object.keys(scores).length > 0 || !!input.note || !!input.session || !!input.behavior;
    if (!hasContent) {
      notify('입력 필요', '하나 이상 기록해주세요');
      return;
    }

    try {
      await createMutation.mutateAsync({ childId: selectedChildId, input });
      router.back();
    } catch (err: unknown) {
      notify('저장하지 못했어요', err instanceof Error ? err.message : '다시 시도해주세요');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card} nativeID="tour-scores">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>오늘 아이는 어땠나요?</Text>
            {!alreadyScored && <Text style={styles.hint}>1 힘들었어요 · 5 아주 좋았어요</Text>}
          </View>
          {alreadyScored ? (
            <View style={styles.scoredRow}>
              {DAILY_RECORD_DOMAINS.filter((d) => today?.scores?.[d.key] !== undefined).map((d) => (
                <Text key={d.key} style={styles.scoredChip}>
                  {d.label} {today?.scores?.[d.key]}
                </Text>
              ))}
              <Text style={styles.hint}>
                오늘 체크를 이미 했어요. 아래 내용만 더 적을 수 있어요.
              </Text>
            </View>
          ) : (
            DAILY_RECORD_DOMAINS.map((d) => (
              <View key={d.key} style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{d.label}</Text>
                <View style={styles.scoreButtons}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = scores[d.key] === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.scoreBtn,
                          active && {
                            backgroundColor: SCORE_COLORS[n - 1],
                            borderColor: colors.text,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() =>
                          setScores((prev) => {
                            const next = { ...prev };
                            if (next[d.key] === n) delete next[d.key];
                            else next[d.key] = n;
                            return next;
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${d.label} ${n}점`}
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.scoreText, active && styles.scoreTextActive]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>오늘 있었던 일 (선택)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={note}
            onChangeText={setNote}
            placeholder="예: 마트에서 '과자' 하고 처음으로 말했어요"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
          />
        </View>

        <View style={styles.card} nativeID="tour-session">
          <View style={styles.toggleRow}>
            <Text style={styles.cardTitle}>오늘 센터 수업이 있었나요?</Text>
            <Switch
              value={sessionOn}
              onValueChange={setSessionOn}
              trackColor={{ true: colors.primary, false: '#D9D4CC' }}
              accessibilityLabel="오늘 센터 수업 여부"
            />
          </View>
          {sessionOn && (
            <>
              <View style={styles.chips}>
                {SESSION_TYPES.map((t) => (
                  <Chip
                    key={t.key}
                    label={t.label}
                    active={sessionType === t.key}
                    onPress={() => setSessionType(t.key)}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabelSmall}>선생님이 해주신 말씀</Text>
              <TextInput
                style={styles.input}
                value={therapistFeedback}
                onChangeText={setTherapistFeedback}
                placeholder="예: 요구하기 2번 성공, 집에서 '더' 연습"
                placeholderTextColor={colors.textSecondary}
                maxLength={1000}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.cardTitle}>힘든 행동이 있었나요?</Text>
            <Switch
              value={behaviorOn}
              onValueChange={setBehaviorOn}
              trackColor={{ true: colors.primary, false: '#D9D4CC' }}
              accessibilityLabel="힘든 행동 여부"
            />
          </View>
          {behaviorOn && (
            <>
              <View style={styles.chips}>
                {BEHAVIOR_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    active={behaviorTags.includes(tag)}
                    onPress={() =>
                      setBehaviorTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                      )
                    }
                  />
                ))}
              </View>
              <Text style={styles.fieldLabelSmall}>얼마나 힘들었나요? (1 조금 · 5 매우)</Text>
              <View style={styles.scoreButtons}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip
                    key={n}
                    label={String(n)}
                    active={severity === n}
                    onPress={() => setSeverity(n)}
                  />
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={behaviorContent}
                onChangeText={setBehaviorContent}
                placeholder="예: 마트에서 20분 울었어요. 안아주니 진정했어요"
                placeholderTextColor={colors.textSecondary}
                maxLength={1000}
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, createMutation.isPending && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={createMutation.isPending}
          accessibilityRole="button"
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>저장하기</Text>
          )}
        </TouchableOpacity>
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
  content: { padding: spacing.md, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 10,
  },
  cardHeader: { gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLabel: { width: 64, fontSize: fontSize.sm, color: colors.text },
  scoreButtons: { flex: 1, flexDirection: 'row', gap: 6 },
  scoreBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontSize: fontSize.sm, color: colors.text },
  scoreTextActive: { fontWeight: '700' },
  scoredRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scoredChip: {
    fontSize: 13,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  fieldLabelSmall: { fontSize: 13, color: '#4A5A6A' },
  input: {
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.card,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { fontWeight: '700', color: colors.primaryDark },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  saveBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFFFFF' },
});
