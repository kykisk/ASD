import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DAILY_RECORD_DOMAINS, useDailyTimeline } from '../hooks/use-daily-record.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const RANGES = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '3개월' },
];

const SESSION_LABELS: Record<string, string> = {
  ABA: 'ABA',
  SPEECH: '언어치료',
  SENSORY: '감각통합',
  OCCUPATIONAL: '작업치료',
  BEHAVIORAL: '행동치료',
  SPECIAL_PE: '특수체육',
  PLAY: '놀이치료',
  OTHER: '기타',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function tagFor(
  feedbackType: string,
  sessionType: string,
): { label: string; bg: string; fg: string } {
  if (feedbackType === 'BEHAVIORAL_ISSUE')
    return { label: '힘든 행동', bg: '#FFF1E6', fg: '#8A4A12' };
  if (feedbackType === 'DAILY_LOG')
    return { label: '일상', bg: colors.primaryLight, fg: colors.primaryDark };
  return { label: SESSION_LABELS[sessionType] ?? sessionType, bg: '#EAF0FA', fg: '#2F4E7E' };
}

/** 성장 › 기록 모아보기: 날짜별로 점수·메모·수업·힘든 행동·활동 완료를 한 카드에 */
/** 쭉 적기로 쓴 원문: 'AI 정리' 표시 + 눌러서 펼쳐 보기 */
function RawTexts({ entries }: { entries: Array<{ id: string; rawText: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <TouchableOpacity
        style={styles.rawToggle}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.aiBadge}>AI 정리</Text>
        <Text style={styles.rawLink}>{open ? '원문 닫기' : '내가 쓴 원문 보기'}</Text>
      </TouchableOpacity>
      {open &&
        entries.map((e) => (
          <Text key={e.id} style={styles.raw}>
            {e.rawText}
          </Text>
        ))}
    </View>
  );
}

export function RecordsTimeline({ childId }: { childId: string }) {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const { data, isLoading } = useDailyTimeline(childId, days);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ranges} nativeID="tour-growth-ranges">
        {RANGES.map((r) => {
          const active = r.days === days;
          return (
            <TouchableOpacity
              key={r.days}
              style={[styles.range, active && styles.rangeActive]}
              onPress={() => setDays(r.days)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : !data || data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>이 기간에 남긴 기록이 없어요</Text>
          <TouchableOpacity onPress={() => router.push('/daily-record')}>
            <Text style={styles.link}>오늘 하루 기록하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        data.map((day, i) => {
          const scoreText = day.scores
            ? DAILY_RECORD_DOMAINS.filter((d) => day.scores?.[d.key] !== undefined)
                .map((d) => `${d.label} ${day.scores?.[d.key]}`)
                .join(' · ')
            : null;
          return (
            <View
              key={day.date}
              style={styles.card}
              nativeID={i === 0 ? 'tour-growth-day' : undefined}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.date}>{dayLabel(day.date)}</Text>
                {day.activities && day.activities.total > 0 && (
                  <Text style={styles.done}>
                    활동 {day.activities.done} / {day.activities.total}
                  </Text>
                )}
              </View>
              {scoreText ? <Text style={styles.scores}>{scoreText}</Text> : null}
              {day.note ? <Text style={styles.body}>{day.note}</Text> : null}
              {day.feedbacks.map((f) => {
                const tag = tagFor(f.feedbackType, f.sessionType);
                return (
                  <View key={f.id} style={styles.feedbackRow}>
                    <Text style={[styles.tag, { backgroundColor: tag.bg, color: tag.fg }]}>
                      {tag.label}
                    </Text>
                    <Text style={[styles.body, { flex: 1 }]}>{f.content}</Text>
                  </View>
                );
              })}
              {(day.freeform ?? []).length > 0 && <RawTexts entries={day.freeform} />}
              {!scoreText && !day.note && day.feedbacks.length === 0 ? (
                <Text style={styles.muted}>오늘 하루 기록은 없어요</Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: 12, paddingBottom: spacing.xl },
  ranges: { flexDirection: 'row', gap: 6 },
  range: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  rangeActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rangeText: { fontSize: 13, color: colors.text },
  rangeTextActive: { fontWeight: '700', color: colors.primaryDark },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  date: { fontSize: 15, fontWeight: '700', color: colors.text },
  done: { fontSize: fontSize.xs, color: colors.primaryDark },
  scores: { fontSize: fontSize.xs, color: '#4A5A6A' },
  feedbackRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tag: {
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 2,
  },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  muted: { fontSize: fontSize.xs, color: colors.textSecondary },
  empty: { alignItems: 'center', gap: 8, paddingVertical: spacing.xl },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary },
  link: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryDark },
  rawToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  aiBadge: {
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: 'hidden',
  },
  rawLink: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  raw: {
    fontSize: 13,
    color: '#4A5A6A',
    backgroundColor: '#F4F1EC',
    borderRadius: borderRadius.md,
    padding: 10,
    lineHeight: 20,
    overflow: 'hidden',
  },
});
