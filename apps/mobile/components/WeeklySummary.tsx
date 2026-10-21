import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useWeeklyInsight } from '../hooks/use-dashboard.js';
import { useFeedbackDigests, useGenerateFeedbackDigest } from '../hooks/use-session-feedbacks.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{title}</Text>
      {items.map((it) => (
        <View key={it} style={styles.pointRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.body, { flex: 1 }]}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

/** 성장 › AI 주간 요약: 이번 주 발달 요약 + 수업·일상 기록 주간 요약 */
export function WeeklySummary({ childId }: { childId: string }) {
  const { data: insight, isLoading } = useWeeklyInsight(childId);
  const { data: digests } = useFeedbackDigests(childId);
  const generate = useGenerateFeedbackDigest(childId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>이번 주 이렇게 달라졌어요</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : insight?.summary ? (
          <>
            <Text style={styles.body}>{insight.summary}</Text>
            <List title="잘하고 있는 점" items={insight.highlights ?? []} />
            <List title="다음 주에 해볼 것" items={insight.recommendations ?? []} />
          </>
        ) : (
          <Text style={styles.muted}>기록이 쌓이면 AI가 이번 주 변화를 정리해 드려요</Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>주간 기록 요약</Text>
        <TouchableOpacity onPress={() => generate.mutate()} disabled={generate.isPending}>
          <Text style={styles.link}>
            {generate.isPending ? '만드는 중…' : '이번 주 요약 만들기'}
          </Text>
        </TouchableOpacity>
      </View>
      {(digests ?? []).length === 0 ? (
        <Text style={styles.muted}>
          매주 일요일 저녁에 수업·일상 기록을 모아 자동으로 요약해요 (한 주 3건 이상 기록했을 때)
        </Text>
      ) : (
        (digests ?? []).slice(0, 8).map((d) => (
          <View key={d.id} style={styles.card}>
            <Text style={styles.week}>
              {d.periodStart.slice(5, 10).replace('-', '/')} ~{' '}
              {d.periodEnd.slice(5, 10).replace('-', '/')} · 기록 {d.feedbackCount}건
            </Text>
            <Text style={styles.body}>{d.summary}</Text>
            <List title="좋았던 점" items={d.highlights ?? []} />
            <List title="신경 쓸 점" items={d.concerns ?? []} />
            <List title="힘든 행동 도움말" items={d.behaviorSuggestions ?? []} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: 12, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  week: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  label: { fontSize: 13, fontWeight: '700', color: '#4A5A6A' },
  pointRow: { flexDirection: 'row', gap: 6 },
  bullet: { fontSize: fontSize.sm, color: colors.primaryDark, lineHeight: 21 },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  link: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryDark },
});
