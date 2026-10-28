import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConcern, type ConcernDetail } from '../hooks/use-concerns.js';
import { APPROACH_LABELS, RATING_OPTIONS } from '../constants/find-way.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const RATING = Object.fromEntries(RATING_OPTIONS.map((r) => [r.key, r.label]));
const md = (d: string) => d.slice(5).replace('-', '/');

/** 선생님께 보여드릴 한 달 요약 (아이 이름 없이) */
function buildSummary(data: ConcernDetail, question: string) {
  const { pattern, trials } = data;
  const recentWeeks = pattern.weeks.slice(-2).reduce((n, w) => n + w.count, 0) / 2;
  const olderWeeks = pattern.weeks.slice(0, 4).reduce((n, w) => n + w.count, 0) / 4;
  const rows: Array<{ label: string; text: string }> = [
    {
      label: '얼마나',
      text: `최근 6주 ${pattern.total}번 · 주 평균 ${Math.round(olderWeeks * 10) / 10}번 → 최근 2주 ${Math.round(recentWeeks * 10) / 10}번`,
    },
  ];
  if (pattern.byAntecedent.length) {
    rows.push({
      label: '주로 언제',
      text: pattern.byAntecedent
        .slice(0, 3)
        .map((a) => `${a.label} (${a.count})`)
        .join(' · '),
    });
  }
  if (pattern.byResponse.length) {
    rows.push({
      label: '어떻게 했을 때 금방 멈췄나',
      text: pattern.byResponse.map((r) => `${r.label} ${r.quick}/${r.count}`).join(' · '),
    });
  }
  if (trials.length) {
    rows.push({
      label: '집에서 해본 방법',
      text: trials
        .slice()
        .reverse()
        .map(
          (t, i) =>
            `${i + 1}) ${t.title} (${APPROACH_LABELS[t.approach] ?? ''}, ${md(t.startDate)}~, ${
              t.status === 'ACTIVE'
                ? `진행 중 ${t.day}일째`
                : t.rating
                  ? RATING[t.rating]
                  : '중간에 그만둠'
            } · 주당 ${t.comparison.beforePerWeek} → ${t.comparison.duringPerWeek}번)`,
        )
        .join('\n'),
    });
  }
  const text = [
    `[집에서 본 "${data.concern.title}"]`,
    ...rows.map((r) => `· ${r.label}: ${r.text}`),
    question.trim() ? `· 여쭤보고 싶은 것: ${question.trim()}` : '',
    '(AutiCare 기록 요약)',
  ]
    .filter(Boolean)
    .join('\n');
  return { rows, text };
}

export default function ConcernShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useConcern(id);
  const [question, setQuestion] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const { rows, text } = buildSummary(data, question);

  const share = async () => {
    setNotice(null);
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
        if (nav.share) await nav.share({ text });
        else {
          await navigator.clipboard.writeText(text);
          setNotice('복사했어요. 문자나 카톡에 붙여 넣어 보내세요.');
        }
      } else {
        await Share.share({ message: text });
      }
    } catch {
      // 사용자가 공유 창을 닫은 경우
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.hint}>
        수업 때 이 화면을 보여드리거나, 아래 버튼으로 문자 · 카톡으로 보내세요. 아이 이름은 들어가지
        않아요.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>집에서 본 "{data.concern.title}"</Text>
        {rows.map((r) => (
          <View key={r.label} style={{ gap: 2 }}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.body}>{r.text}</Text>
          </View>
        ))}
        <View style={{ gap: 4 }}>
          <Text style={styles.label}>여쭤보고 싶은 것 (선택)</Text>
          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="예: 집에서 따라 치는 방법을 계속해도 될까요?"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={300}
          />
        </View>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={share} accessibilityRole="button">
        <Text style={styles.primaryText}>문자 · 카톡으로 보내기</Text>
      </TouchableOpacity>
      {notice && <Text style={styles.notice}>{notice}</Text>}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>선생님 의견 적으러 가기</Text>
      </TouchableOpacity>
    </ScrollView>
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
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  input: {
    minHeight: 60,
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
  primaryBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  secondaryText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  notice: { fontSize: 13, color: colors.primaryDark },
});
