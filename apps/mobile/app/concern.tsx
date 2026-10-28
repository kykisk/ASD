import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAddTeacherOpinion,
  useConcern,
  useDeleteConcern,
  useGeneratePerspectives,
  useStartTrial,
  useUpdateConcern,
  useUpdateTrial,
  type ConcernDetail,
} from '../hooks/use-concerns.js';
import { APPROACH_LABELS, EVIDENCE_LABELS, RATING_OPTIONS } from '../constants/find-way.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type Tab = 'views' | 'pattern' | 'trial' | 'teacher';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'views', label: '여러 관점' },
  { key: 'pattern', label: '언제 · 왜' },
  { key: 'trial', label: '2주 시도' },
  { key: 'teacher', label: '선생님' },
];

const SESSION_TYPES = [
  { key: 'SPEECH', label: '언어치료' },
  { key: 'SENSORY', label: '감각통합' },
  { key: 'ABA', label: 'ABA' },
  { key: 'OCCUPATIONAL', label: '작업치료' },
  { key: 'PLAY', label: '놀이치료' },
  { key: 'SPECIAL_PE', label: '특수체육' },
  { key: 'OTHER', label: '기타' },
];
const SESSION_LABEL = Object.fromEntries(SESSION_TYPES.map((s) => [s.key, s.label]));

function confirmAsk(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
  } else {
    Alert.alert('확인', message, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: onYes },
    ]);
  }
}

function apiErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message ?? fallback
  );
}

/** 맞는 방법 찾기: 고민 하나 자세히 */
export default function ConcernScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const router = useRouter();
  const { data, isLoading } = useConcern(id);
  const generate = useGeneratePerspectives();
  const [tab, setTab] = useState<Tab>('views');
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const runGenerate = async () => {
    if (!id) return;
    setError(null);
    try {
      await generate.mutateAsync(id);
    } catch (err) {
      setError(apiErrorMessage(err, '정리하지 못했어요. 잠시 뒤 다시 시도해주세요.'));
    }
  };

  // 막 만든 고민이면 관점 정리를 바로 시작
  useEffect(() => {
    if (fresh && data && !data.perspectives && !autoStarted.current) {
      autoStarted.current = true;
      runGenerate();
    }
  }, [fresh, data]);

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: data.concern.title }} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabOn]}
            onPress={() => setTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {data.safety && (
          <Text style={styles.safety}>
            다칠 수 있는 행동(자해 · 공격)이 기록돼 있어요. 여기 내용보다 먼저 담당 선생님이나
            전문가와 꼭 상의하세요.
          </Text>
        )}
        {tab === 'views' && (
          <ViewsTab
            data={data}
            generating={generate.isPending}
            error={error}
            onGenerate={runGenerate}
            onTrialStarted={() => setTab('trial')}
          />
        )}
        {tab === 'pattern' && <PatternTab data={data} />}
        {tab === 'trial' && <TrialTab data={data} onPickMethod={() => setTab('views')} />}
        {tab === 'teacher' && (
          <TeacherTab data={data} onShare={() => router.push(`/concern-share?id=${id}` as never)} />
        )}
        <ConcernActions data={data} onDeleted={() => router.back()} />
      </ScrollView>
    </View>
  );
}

function ViewsTab({
  data,
  generating,
  error,
  onGenerate,
  onTrialStarted,
}: {
  data: ConcernDetail;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  onTrialStarted: () => void;
}) {
  const startTrial = useStartTrial();
  const [openPaper, setOpenPaper] = useState<string | null>(null);
  const p = data.perspectives;
  const active = data.trials.find((t) => t.status === 'ACTIVE');

  const start = (approach: string, s: { title: string; how: string }) => {
    const go = async () => {
      try {
        await startTrial.mutateAsync({ id: data.concern.id, title: s.title, how: s.how, approach });
        onTrialStarted();
      } catch {
        // 화면에 그대로 둠
      }
    };
    if (active)
      confirmAsk(`지금 해보는 "${active.title}"을(를) 그만두고 이 방법으로 바꿀까요?`, go);
    else go();
  };

  if (generating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.body}>
          여러 관점과 관련 논문을 정리하는 중이에요… 30~40초쯤 걸려요.
        </Text>
      </View>
    );
  }
  if (!p) {
    return (
      <View style={styles.card}>
        <Text style={styles.body}>
          행동주의 · 발달 놀이 · 감각통합 · 신경다양성, 4가지 관점에서 이 행동을 어떻게 보고 집에서
          무엇을 권하는지 AI가 정리해요. 우리 아이 기록과 센터 피드백, 관련 논문도 함께 봐요.
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.primaryBtn} onPress={onGenerate} accessibilityRole="button">
          <Text style={styles.primaryText}>여러 관점 정리하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.body}>{p.summary}</Text>
      <Text style={styles.hint}>정답은 하나가 아니에요. 관점마다 이유와 방법이 달라요.</Text>

      {p.centerView && (
        <View style={styles.centerBox}>
          <Text style={styles.centerLabel}>우리 센터 선생님 의견 · {p.centerView.source}</Text>
          <Text style={styles.body}>"{p.centerView.text}"</Text>
          {APPROACH_LABELS[p.centerView.approach] && (
            <Text style={styles.centerHint}>
              → 아래 {APPROACH_LABELS[p.centerView.approach]} 관점에 가까운 방법이에요
            </Text>
          )}
        </View>
      )}

      {p.perspectives.map((v) => {
        const ev = EVIDENCE_LABELS[v.evidence];
        return (
          <View key={v.approach} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{APPROACH_LABELS[v.approach] ?? v.approach}</Text>
              {ev && (
                <Text style={[styles.evidence, ev.strong && styles.evidenceStrong]}>
                  {ev.label}
                </Text>
              )}
            </View>
            <Text style={styles.body}>
              <Text style={styles.bold}>왜? </Text>
              {v.why}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.bold}>집에서 </Text>
              {v.atHome}
            </Text>
            {v.caution ? <Text style={styles.caution}>{v.caution}</Text> : null}
            {v.strategies.map((s) => (
              <View key={s.title} style={styles.strategy}>
                <Text style={styles.strategyTitle}>{s.title}</Text>
                <Text style={styles.small}>{s.how}</Text>
                <TouchableOpacity
                  onPress={() => start(v.approach, s)}
                  disabled={startTrial.isPending}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>
                    {active?.title === s.title ? '지금 해보는 중' : '이 방법 2주 해보기 ›'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}

      {p.papers.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>관련 논문 · 한국어 요약</Text>
          {p.papers.map((paper) => (
            <View key={paper.id} style={{ gap: 4 }}>
              <TouchableOpacity
                onPress={() => setOpenPaper(openPaper === paper.id ? null : paper.id)}
                accessibilityRole="button"
              >
                <Text style={styles.paperTitle}>
                  {paper.year} · {paper.title}
                </Text>
              </TouchableOpacity>
              {openPaper === paper.id && (
                <>
                  <Text style={styles.small}>
                    {paper.koreanSummary ?? '요약을 아직 못 만들었어요'}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`https://pubmed.ncbi.nlm.nih.gov/${paper.pubmedId}/`)
                    }
                    accessibilityRole="link"
                  >
                    <Text style={styles.link}>원문 보기 (PubMed) ›</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        AI가 여러 자료를 정리한 내용이에요. 우리 아이에게 맞는지는 기록과 선생님 의견으로 확인해
        주세요.
      </Text>
      <TouchableOpacity onPress={onGenerate} accessibilityRole="button">
        <Text style={styles.link}>기록이 늘었으면 다시 정리하기 ›</Text>
      </TouchableOpacity>
    </>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${max ? Math.round((value / max) * 100) : 0}%` }]} />
    </View>
  );
}

function PatternTab({ data }: { data: ConcernDetail }) {
  const { pattern } = data;
  const maxWeek = Math.max(1, ...pattern.weeks.map((w) => w.count));
  const maxAnte = Math.max(1, ...pattern.byAntecedent.map((a) => a.count));
  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>최근 6주 기록</Text>
          <Text style={styles.hint}>모두 {pattern.total}번</Text>
        </View>
        <View style={styles.weeks}>
          {pattern.weeks.map((w) => (
            <View key={w.start} style={styles.week}>
              <Text style={styles.small}>{w.count || ''}</Text>
              <View style={[styles.weekBar, { height: Math.max(4, (w.count / maxWeek) * 80) }]} />
              <Text style={styles.weekLabel}>{w.start.slice(5).replace('-', '/')}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>바로 전에 무슨 일이 있었나</Text>
        {pattern.byAntecedent.length === 0 ? (
          <Text style={styles.small}>아직 기록이 없어요</Text>
        ) : (
          pattern.byAntecedent.map((a) => (
            <View key={a.label} style={styles.barRow}>
              <Text style={styles.barLabel}>{a.label}</Text>
              <Bar value={a.count} max={maxAnte} />
              <Text style={styles.barCount}>{a.count}번</Text>
            </View>
          ))
        )}
        <Text style={[styles.cardTitle, { marginTop: 6 }]}>어떻게 했을 때 금방 멈췄나</Text>
        {pattern.byResponse.length === 0 ? (
          <Text style={styles.small}>아직 기록이 없어요</Text>
        ) : (
          pattern.byResponse.map((r) => (
            <Text key={r.label} style={styles.body}>
              {r.label} ·{' '}
              <Text style={styles.bold}>
                {r.count}번 중 {r.quick}번
              </Text>{' '}
              금방 멈춤
            </Text>
          ))
        )}
      </View>

      {data.perspectives?.patternInsight && (
        <View style={styles.insight}>
          <Text style={styles.insightTitle}>AI가 본 가능성</Text>
          <Text style={styles.body}>{data.perspectives.patternInsight}</Text>
          <Text style={styles.small}>
            기록이 더 쌓이면 달라질 수 있어요 · 선생님께 같이 보여드리세요
          </Text>
        </View>
      )}

      <Text style={styles.hint}>
        언제 · 왜를 적은 기록 {pattern.withContext}번. 오늘 하루 기록에서 힘든 행동을 적을 때 "바로
        전에 / 어떻게 하셨어요"를 골라주시면 패턴이 더 정확해져요.
      </Text>
    </>
  );
}

function TrialTab({ data, onPickMethod }: { data: ConcernDetail; onPickMethod: () => void }) {
  const update = useUpdateTrial();
  const active = data.trials.find((t) => t.status === 'ACTIVE');
  const past = data.trials.filter((t) => t.status !== 'ACTIVE');
  const ratingLabel = Object.fromEntries(RATING_OPTIONS.map((r) => [r.key, r.label]));

  return (
    <>
      {active ? (
        <View style={[styles.card, styles.activeTrial]}>
          <Text style={styles.centerLabel}>
            {active.needsRating ? '2주가 끝났어요' : `지금 해보는 중 · ${active.day}일째 / 14일`}
          </Text>
          <Text style={styles.cardTitle}>{active.title}</Text>
          <Text style={styles.small}>
            {APPROACH_LABELS[active.approach] ?? ''} · {active.how}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.round((Math.min(14, active.day) / 14) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.body}>
            시작 전 2주 주당 <Text style={styles.bold}>{active.comparison.beforePerWeek}번</Text> →
            지금 주당 <Text style={styles.bold}>{active.comparison.duringPerWeek}번</Text>
            {active.comparison.duringDays < 7 ? ' (아직 며칠 안 돼서 참고만)' : ''}
          </Text>
          <Text style={styles.small}>오늘의 활동에 이 방법을 연습하는 활동이 하나씩 들어가요.</Text>
          {active.needsRating ? (
            <View style={styles.row}>
              {RATING_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={styles.rateBtn}
                  onPress={() =>
                    update.mutate({ trialId: active.id, status: 'DONE', rating: r.key })
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.rateText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() =>
                confirmAsk('이 방법을 그만둘까요? 지금까지 결과는 남아요.', () =>
                  update.mutate({ trialId: active.id, status: 'STOPPED' }),
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.linkMuted}>그만두기</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.body}>
            여러 관점에서 방법 하나를 골라 2주 해보면, 시작 전과 기록 횟수를 비교해 보여드려요.
            하나씩 바꿔 보며 우리 아이에게 맞는 방법을 찾아요.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onPickMethod}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>방법 고르러 가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {past.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>지금까지 해본 방법</Text>
          {past.map((t) => (
            <View key={t.id} style={{ gap: 2 }}>
              <Text style={styles.body}>
                {t.title} ·{' '}
                <Text style={styles.bold}>
                  {t.rating ? ratingLabel[t.rating] : '중간에 그만둠'}
                </Text>
              </Text>
              <Text style={styles.small}>
                {t.startDate.slice(5).replace('-', '/')} ~ {t.endDate.slice(5).replace('-', '/')} ·
                주당 {t.comparison.beforePerWeek} → {t.comparison.duringPerWeek}번
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function TeacherTab({ data, onShare }: { data: ConcernDetail; onShare: () => void }) {
  const add = useAddTeacherOpinion();
  const [sessionType, setSessionType] = useState('SENSORY');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!content.trim()) return;
    try {
      await add.mutateAsync({ id: data.concern.id, sessionType, content: content.trim() });
      setContent('');
      setSaved(true);
    } catch {
      // 그대로 둠
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.primaryBtn} onPress={onShare} accessibilityRole="button">
        <Text style={styles.primaryText}>선생님께 보여드릴 요약 보기</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>선생님 의견 적기</Text>
        <View style={styles.chips}>
          {SESSION_TYPES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, sessionType === s.key && styles.chipOn]}
              onPress={() => setSessionType(s.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: sessionType === s.key }}
            >
              <Text style={[styles.chipText, sessionType === s.key && styles.chipTextOn]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={content}
          onChangeText={(v) => {
            setContent(v);
            setSaved(false);
          }}
          placeholder="예: 따라 치기 좋아요. 다만 세 번 넘게 계속되면 북으로 옮겨 주세요."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
        />
        <Text style={styles.small}>선생님 의견은 AI가 다음 활동을 만들 때 가장 먼저 따라요.</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, (add.isPending || !content.trim()) && styles.disabled]}
          onPress={save}
          disabled={add.isPending || !content.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{saved ? '저장했어요' : '의견 저장'}</Text>
        </TouchableOpacity>
      </View>
      {data.teacherOpinions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>받은 의견</Text>
          {data.teacherOpinions.map((o) => (
            <View key={o.id} style={{ gap: 2 }}>
              <Text style={styles.small}>
                {o.date.slice(5).replace('-', '/')} ·{' '}
                {SESSION_LABEL[o.sessionType] ?? o.sessionType}
              </Text>
              <Text style={styles.body}>{o.content}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function ConcernActions({ data, onDeleted }: { data: ConcernDetail; onDeleted: () => void }) {
  const update = useUpdateConcern();
  const remove = useDeleteConcern();
  const resolved = data.concern.status === 'RESOLVED';
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        onPress={() =>
          update.mutate({ id: data.concern.id, status: resolved ? 'ACTIVE' : 'RESOLVED' })
        }
        accessibilityRole="button"
      >
        <Text style={styles.linkMuted}>
          {resolved ? '다시 고민 중으로' : '나아졌어요 (목록 아래로)'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          confirmAsk(
            '이 고민을 지울까요? 관점 정리와 시도 기록이 함께 지워져요. (하루 기록은 남아요)',
            async () => {
              await remove.mutateAsync(data.concern.id);
              onDeleted();
            },
          )
        }
        accessibilityRole="button"
      >
        <Text style={styles.linkMuted}>지우기</Text>
      </TouchableOpacity>
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
  content: { padding: spacing.md, gap: 12, paddingBottom: spacing.xl },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, color: '#4A5A6A' },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },
  loading: { alignItems: 'center', gap: 12, paddingVertical: spacing.xl },
  safety: {
    fontSize: 13,
    color: '#8A1C1C',
    backgroundColor: '#FDECEC',
    borderRadius: borderRadius.md,
    padding: 12,
    lineHeight: 19,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 8,
  },
  activeTrial: { borderWidth: 2, borderColor: colors.primary },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  bold: { fontWeight: '700' },
  small: { fontSize: 12, color: '#4A5A6A', lineHeight: 18 },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  error: { color: '#B91C1C', fontSize: 13 },
  link: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, paddingVertical: 4 },
  linkMuted: { fontSize: 13, color: colors.textSecondary, paddingVertical: 6 },
  centerBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: 12,
    gap: 4,
  },
  centerLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  centerHint: { fontSize: 12, color: colors.primaryDark },
  evidence: {
    fontSize: 11,
    color: '#4A5A6A',
    backgroundColor: '#F4F1EC',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  evidenceStrong: { color: '#1E4E8C', backgroundColor: '#E7F0FB' },
  caution: {
    fontSize: 12,
    color: '#8A4B14',
    backgroundColor: '#FDF0E6',
    borderRadius: 10,
    padding: 8,
    lineHeight: 18,
    overflow: 'hidden',
  },
  strategy: { backgroundColor: '#FDFBF7', borderRadius: 10, padding: 10, gap: 4 },
  strategyTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  paperTitle: { fontSize: 13, color: colors.text, lineHeight: 19, textDecorationLine: 'underline' },
  weeks: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 },
  week: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  weekLabel: { fontSize: 10, color: colors.textSecondary },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 110, fontSize: 13, color: colors.text },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F1EEE9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  barCount: { width: 34, textAlign: 'right', fontSize: 12, color: '#4A5A6A' },
  insight: { backgroundColor: '#E7F0FB', borderRadius: borderRadius.lg, padding: 12, gap: 4 },
  insightTitle: { fontSize: 13, fontWeight: '700', color: '#1E4E8C' },
  row: { flexDirection: 'row', gap: 6 },
  rateBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  rateText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  primaryBtn: {
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  chipOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, color: colors.text },
  chipTextOn: { fontWeight: '700', color: colors.primaryDark },
  input: {
    minHeight: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.background,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});
