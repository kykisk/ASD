import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  DAILY_RECORD_DOMAINS,
  useAnalyzeFreeform,
  useConfirmFreeform,
  type DailyRecordDomain,
  type FreeformDraft,
  type FreeformQuestion,
} from '../hooks/use-daily-record.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

export const SESSION_TYPES = [
  { key: 'SPEECH', label: '언어치료' },
  { key: 'SPECIAL_PE', label: '특수체육' },
  { key: 'SENSORY', label: '감각통합' },
  { key: 'ABA', label: 'ABA' },
  { key: 'OCCUPATIONAL', label: '작업치료' },
  { key: 'PLAY', label: '놀이치료' },
  { key: 'OTHER', label: '기타' },
];

export const BEHAVIOR_TAGS = ['멜트다운', '공격', '자해', '탈주', '상동행동', '발작', '기타'];

const SCORE_COLORS = [colors.score1, colors.score2, colors.score3, colors.score4, colors.score5];
/** 힘든 정도는 클수록 힘듦 → 색을 거꾸로 */
const SEVERITY_COLORS = [...SCORE_COLORS].reverse();
const EXAMPLES = ['수업에서 들은 말', '처음 해낸 것', '힘들었던 순간'];

type Step = 'write' | 'review' | 'questions' | 'failed';

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response
    ?.data?.error?.message;
  return message ?? fallback;
}

interface Props {
  childId: string;
  /** AI 를 지금 못 쓰면 이유 (그래도 적으면 메모로 저장됨) */
  unavailableReason?: string;
  onDone: () => void;
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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

function ScoreButtons({
  label,
  value,
  onChange,
  severity = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  severity?: boolean;
}) {
  const palette = severity ? SEVERITY_COLORS : SCORE_COLORS;
  return (
    <View style={styles.scoreButtons}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[
              styles.scoreBtn,
              active && {
                backgroundColor: palette[n - 1],
                borderColor: colors.text,
                borderWidth: 2,
              },
            ]}
            onPress={() => onChange(active ? undefined : n)}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${n}`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.scoreText, active && { fontWeight: '700' }]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * 쭉 적기: 하루를 자유롭게 적으면 AI 가 정리 → 부모가 확인 · 수정 → 빠진 것만 짧게 질문 → 저장.
 * AI 를 못 쓰면 서버가 원문을 일상 메모로 저장한다.
 */
export function FreeformRecord({ childId, unavailableReason, onDone }: Props) {
  const analyze = useAnalyzeFreeform();
  const confirm = useConfirmFreeform();

  const [step, setStep] = useState<Step>('write');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failedReason, setFailedReason] = useState('');
  const [entryId, setEntryId] = useState('');
  const [reasons, setReasons] = useState<FreeformDraft['scores']>({});
  const [questions, setQuestions] = useState<FreeformQuestion[]>([]);
  const [showRaw, setShowRaw] = useState(false);

  // 부모가 고칠 수 있는 정리 결과
  const [scores, setScores] = useState<Partial<Record<DailyRecordDomain, number>>>({});
  const [note, setNote] = useState('');
  const [sessions, setSessions] = useState<FreeformDraft['sessions']>([]);
  const [behaviors, setBehaviors] = useState<FreeformDraft['behaviors']>([]);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});

  const handleAnalyze = async () => {
    setError(null);
    if (text.trim().length < 5) {
      setError('조금만 더 적어주세요');
      return;
    }
    try {
      const result = await analyze.mutateAsync({ childId, text: text.trim() });
      if (result.status === 'FAILED') {
        setFailedReason(result.reason);
        setStep('failed');
        return;
      }
      setEntryId(result.entryId);
      setReasons(result.draft.scores);
      setScores(
        Object.fromEntries(
          Object.entries(result.draft.scores).map(([k, v]) => [k, v?.score]),
        ) as Partial<Record<DailyRecordDomain, number>>,
      );
      setNote(result.draft.note ?? '');
      setSessions(result.draft.sessions);
      setBehaviors(result.draft.behaviors);
      setQuestions(result.questions);
      setAnswers({});
      setStep('review');
    } catch (err) {
      setError(apiErrorMessage(err, '정리하지 못했어요. 다시 시도해주세요.'));
    }
  };

  const handleSave = async (withAnswers: boolean) => {
    setError(null);
    try {
      await confirm.mutateAsync({
        childId,
        entryId,
        input: {
          scores,
          note: note.trim() || undefined,
          sessions: sessions.map((s) => ({
            sessionType: s.sessionType,
            therapistFeedback: s.therapistFeedback?.trim() || undefined,
          })),
          behaviors: behaviors.filter((b) => b.content.trim()),
          answers: withAnswers
            ? Object.entries(answers)
                .filter(([, v]) => v !== '' && v !== undefined)
                .map(([index, value]) => ({
                  index: Number(index),
                  value: typeof value === 'string' ? value.trim() : value,
                }))
                .filter((a) => a.value !== '')
            : [],
        },
      });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err, '저장하지 못했어요. 다시 시도해주세요.'));
    }
  };

  if (step === 'failed') {
    return (
      <View style={styles.doneBox}>
        <Text style={styles.title}>적어주신 내용은 저장했어요</Text>
        <Text style={styles.body}>
          {failedReason}. 오늘 있었던 일은 일상 메모로 남겼고, 영역 점수는 밤사이 AI가 다시
          정리해요.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onDone} accessibilityRole="button">
          <Text style={styles.primaryText}>확인</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'write') {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4 }}>
            <Text style={styles.title}>오늘 하루를 편하게 적어주세요</Text>
            <Text style={styles.body}>
              순서도 형식도 상관없어요. AI가 영역별로 정리하고, 저장하기 전에 보여드려요.
            </Text>
          </View>
          {unavailableReason ? (
            <Text style={styles.notice}>
              {unavailableReason}. 지금 적으면 일상 메모로 저장되고, AI 정리는 나중에 해요.
            </Text>
          ) : null}
          <TextInput
            style={[styles.input, styles.bigInput]}
            value={text}
            onChangeText={setText}
            placeholder="예: 언어치료에서 처음으로 '물 주세요' 했대요. 저녁엔 마트에서 10분쯤 울었어요."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={3000}
            accessibilityLabel="오늘 있었던 일"
          />
          <Text style={styles.hintBox}>🎤 말로 해도 돼요 — 키보드의 마이크 버튼을 누르세요</Text>
          <View style={styles.chips}>
            <Text style={styles.hint}>이런 것도 좋아요</Text>
            {EXAMPLES.map((e) => (
              <Text key={e} style={styles.example}>
                {e}
              </Text>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, analyze.isPending && styles.disabled]}
            onPress={handleAnalyze}
            disabled={analyze.isPending}
            accessibilityRole="button"
          >
            {analyze.isPending ? (
              <View style={styles.row}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.primaryText}>정리하는 중… 잠시만요</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>✨ AI로 정리하기</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.footHint}>정리가 안 되어도 적은 내용은 그대로 저장돼요</Text>
        </View>
      </View>
    );
  }

  if (step === 'review') {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>이렇게 정리했어요</Text>
          <Text style={styles.body}>틀린 곳은 눌러서 고쳐주세요. 확인하신 뒤에 저장돼요.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>오늘 아이는</Text>
            {DAILY_RECORD_DOMAINS.map((d) => (
              <View key={d.key} style={{ gap: 4 }}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>{d.label}</Text>
                  <ScoreButtons
                    label={d.label}
                    value={scores[d.key]}
                    onChange={(n) => setScores((prev) => ({ ...prev, [d.key]: n }))}
                  />
                </View>
                <Text style={styles.reason}>
                  {scores[d.key] === undefined
                    ? '오늘 글에는 없었어요'
                    : reasons[d.key]?.reason || ''}
                </Text>
              </View>
            ))}
          </View>

          {sessions.map((s, i) => (
            <View key={`s${i}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>센터 수업</Text>
                <TouchableOpacity
                  onPress={() => setSessions((prev) => prev.filter((_, j) => j !== i))}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>빼기</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chips}>
                {SESSION_TYPES.map((t) => (
                  <Chip
                    key={t.key}
                    label={t.label}
                    active={s.sessionType === t.key}
                    onPress={() =>
                      setSessions((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, sessionType: t.key } : x)),
                      )
                    }
                  />
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={s.therapistFeedback ?? ''}
                onChangeText={(v) =>
                  setSessions((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, therapistFeedback: v } : x)),
                  )
                }
                placeholder="선생님이 해주신 말씀"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={1000}
              />
            </View>
          ))}

          {behaviors.map((b, i) => (
            <View key={`b${i}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>힘든 행동</Text>
                <TouchableOpacity
                  onPress={() => setBehaviors((prev) => prev.filter((_, j) => j !== i))}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>빼기</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chips}>
                {BEHAVIOR_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    active={b.tags.includes(tag)}
                    onPress={() =>
                      setBehaviors((prev) =>
                        prev.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                tags: x.tags.includes(tag)
                                  ? x.tags.filter((t) => t !== tag)
                                  : [...x.tags, tag],
                              }
                            : x,
                        ),
                      )
                    }
                  />
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={b.content}
                onChangeText={(v) =>
                  setBehaviors((prev) => prev.map((x, j) => (j === i ? { ...x, content: v } : x)))
                }
                multiline
                maxLength={1000}
              />
              {b.severity !== null && (
                <>
                  <Text style={styles.hint}>
                    얼마나 힘들었나요? (1 금방 진정 · 5 아주 힘들었어요)
                  </Text>
                  <ScoreButtons
                    label="힘든 정도"
                    severity
                    value={b.severity}
                    onChange={(n) =>
                      setBehaviors((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, severity: n ?? null } : x)),
                      )
                    }
                  />
                </>
              )}
            </View>
          ))}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>그 밖의 일상</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="없으면 비워두세요"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
            />
          </View>

          <TouchableOpacity onPress={() => setShowRaw((v) => !v)} accessibilityRole="button">
            <Text style={styles.link}>
              {showRaw ? '원문 닫기' : '내가 쓴 원문 보기 (그대로 보관돼요)'}
            </Text>
          </TouchableOpacity>
          {showRaw && <Text style={styles.raw}>{text}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
        <View style={styles.footer}>
          {questions.length > 0 ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setStep('questions')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>맞아요, 다음</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, confirm.isPending && styles.disabled]}
              onPress={() => handleSave(false)}
              disabled={confirm.isPending}
              accessibilityRole="button"
            >
              {confirm.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>저장하기</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>몇 가지만 더 여쭤볼게요</Text>
        <Text style={styles.body}>
          답하기 어려우면 건너뛰어도 괜찮아요. 오늘 기록은 이미 충분해요.
        </Text>
        {questions.map((q, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.qIndex}>
              {i + 1} / {questions.length}
            </Text>
            <Text style={styles.cardTitle}>{q.question}</Text>
            {q.answer === 'scale' ? (
              <>
                <ScoreButtons
                  label={q.question}
                  severity={q.kind === 'BEHAVIOR_SEVERITY'}
                  value={typeof answers[i] === 'number' ? (answers[i] as number) : undefined}
                  onChange={(n) =>
                    setAnswers((prev) => {
                      const next = { ...prev };
                      if (n === undefined) delete next[i];
                      else next[i] = n;
                      return next;
                    })
                  }
                />
                {q.kind === 'BEHAVIOR_SEVERITY' && (
                  <View style={styles.scaleEnds}>
                    <Text style={styles.hint}>금방 진정</Text>
                    <Text style={styles.hint}>아주 힘들었어요</Text>
                  </View>
                )}
              </>
            ) : (
              <TextInput
                style={styles.input}
                value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                onChangeText={(v) => setAnswers((prev) => ({ ...prev, [i]: v }))}
                placeholder="없으면 비워두세요"
                placeholderTextColor={colors.textSecondary}
                maxLength={500}
              />
            )}
          </View>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={[styles.footer, styles.footerRow]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, confirm.isPending && styles.disabled]}
          onPress={() => handleSave(false)}
          disabled={confirm.isPending}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>건너뛰기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.flex, confirm.isPending && styles.disabled]}
          onPress={() => handleSave(true)}
          disabled={confirm.isPending}
          accessibilityRole="button"
        >
          {confirm.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>저장하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  notice: {
    fontSize: 13,
    color: '#8A4B14',
    backgroundColor: '#FDF0E6',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    lineHeight: 19,
  },
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
    textAlignVertical: 'top',
  },
  bigInput: {
    minHeight: 220,
    borderWidth: 2,
    borderColor: colors.primary,
    fontSize: 15,
    lineHeight: 24,
  },
  hintBox: {
    fontSize: 13,
    color: '#4A5A6A',
    backgroundColor: '#F4F1EC',
    borderRadius: borderRadius.md,
    padding: 10,
    overflow: 'hidden',
  },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary },
  example: {
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  error: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    fontSize: fontSize.sm,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 22 },
  qIndex: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  link: { fontSize: 13, color: colors.primaryDark, fontWeight: '600', paddingVertical: 6 },
  raw: {
    fontSize: 13,
    color: '#4A5A6A',
    backgroundColor: '#F4F1EC',
    borderRadius: borderRadius.md,
    padding: 12,
    lineHeight: 20,
    overflow: 'hidden',
  },
  reason: { fontSize: 12, color: colors.textSecondary, marginLeft: 72 },
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
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
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
    gap: 8,
  },
  footerRow: { flexDirection: 'row', gap: 8 },
  footHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  secondaryText: { fontSize: 15, color: '#4A5A6A' },
  disabled: { opacity: 0.6 },
  doneBox: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
});
