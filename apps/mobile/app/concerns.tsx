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
import { useRouter } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import { useConcerns, useCreateConcern } from '../hooks/use-concerns.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const BEHAVIOR_TAGS = ['멜트다운', '공격', '자해', '탈주', '상동행동', '발작', '기타'];

/** 맞는 방법 찾기: 우리 아이 고민 목록 */
export default function ConcernsScreen() {
  const router = useRouter();
  const childId = useChildStore((s) => s.selectedChildId);
  const { data, isLoading } = useConcerns(childId);
  const create = useCreateConcern();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const open = (id: string) => router.push(`/concern?id=${id}` as never);

  const submit = async (t = title, matchTags = tags) => {
    if (!childId) return;
    setError(null);
    if (!t.trim()) return setError('어떤 행동이 고민인지 적어주세요');
    try {
      const created = await create.mutateAsync({ childId, title: t.trim(), matchTags });
      setAdding(false);
      setTitle('');
      setTags([]);
      router.push(`/concern?id=${created.id}&fresh=1` as never);
    } catch {
      setError('만들지 못했어요. 다시 시도해주세요.');
    }
  };

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const active = data.concerns.filter((c) => c.status === 'ACTIVE');
  const resolved = data.concerns.filter((c) => c.status === 'RESOLVED');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>
        자꾸 반복되는 행동 하나를 고르면 여러 전문 관점, 우리 아이 기록 패턴, 직접 해본 방법의 결과,
        선생님 의견을 한곳에 모아 볼 수 있어요. 정답을 정해주지 않고 비교를 도와드려요.
      </Text>

      {data.suggestions.length > 0 && (
        <View style={styles.suggest}>
          <Text style={styles.suggestTitle}>최근 30일 자주 기록된 행동</Text>
          {data.suggestions.map((s) => (
            <TouchableOpacity
              key={s.tag}
              style={styles.suggestRow}
              onPress={() => {
                setAdding(true);
                setTags([s.tag]);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.body}>
                {s.tag} · {s.count}번
              </Text>
              <Text style={styles.link}>고민으로 보기 ›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {active.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={styles.card}
          onPress={() => open(c.id)}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.count}>30일 {c.recordCount30d}번</Text>
          </View>
          {c.activeTrial ? (
            <Text style={styles.trial}>
              {c.activeTrial.ended
                ? `2주 시도 끝 · "${c.activeTrial.title}" 어땠는지 알려주세요`
                : `시도 중 · ${c.activeTrial.title} · ${c.activeTrial.day}일째 / 14일`}
            </Text>
          ) : (
            <Text style={styles.muted}>
              {c.hasPerspectives ? '방법을 골라 2주 해볼 수 있어요' : '관점 정리 전'}
            </Text>
          )}
        </TouchableOpacity>
      ))}

      {adding ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>어떤 행동이 고민이세요?</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 손으로 탁탁 치기, 기다릴 때 소리 지르기"
            placeholderTextColor={colors.textSecondary}
            maxLength={60}
            autoFocus
          />
          <Text style={styles.hint}>같이 볼 힘든 행동 기록 (선택)</Text>
          <View style={styles.chips}>
            {BEHAVIOR_TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() =>
                    setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setAdding(false)}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, create.isPending && styles.disabled]}
              onPress={() => submit()}
              disabled={create.isPending}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>만들기</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAdding(true)}
          accessibilityRole="button"
        >
          <Text style={styles.addText}>+ 고민 추가하기</Text>
        </TouchableOpacity>
      )}

      {resolved.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.hint}>나아진 고민</Text>
          {resolved.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, styles.resolved]}
              onPress={() => open(c.id)}
              accessibilityRole="button"
            >
              <Text style={styles.body}>{c.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  intro: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  suggest: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 6,
  },
  suggestTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  suggestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: 14,
    gap: 8,
  },
  resolved: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  count: { fontSize: 12, color: colors.textSecondary },
  trial: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  muted: { fontSize: 13, color: colors.textSecondary },
  body: { fontSize: fontSize.sm, color: colors.text },
  link: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  hint: { fontSize: 12, color: colors.textSecondary },
  input: {
    minHeight: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
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
  error: { color: '#B91C1C', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, color: '#4A5A6A' },
  disabled: { opacity: 0.6 },
  addBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
});
