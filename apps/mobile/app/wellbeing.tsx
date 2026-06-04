import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import {
  useWellbeingHistory,
  useWellbeingStats,
  useCreateWellbeing,
} from '../hooks/use-wellbeing.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const MOOD_OPTIONS = [
  { emoji: '😫', label: '1' },
  { emoji: '😕', label: '2' },
  { emoji: '😐', label: '3' },
  { emoji: '🙂', label: '4' },
  { emoji: '😊', label: '5' },
];

const STRESS_OPTIONS = [
  { label: '매우낮음', value: 1 },
  { label: '낮음', value: 2 },
  { label: '보통', value: 3 },
  { label: '높음', value: 4 },
  { label: '매우높음', value: 5 },
];

export default function WellbeingScreen() {
  const childId = useChildStore((s) => s.selectedChildId);
  const { data: history, isLoading: historyLoading } = useWellbeingHistory(childId);
  const { data: stats } = useWellbeingStats(childId);
  const createMutation = useCreateWellbeing();

  const [mood, setMood] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [lastAiMessage, setLastAiMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!childId || mood === null || stressLevel === null) {
      const msg = '기분과 스트레스 수준을 모두 선택해주세요';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('입력 필요', msg);
      }
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        childId,
        input: {
          mood,
          stressLevel,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      setLastAiMessage(result.aiMessage ?? null);
      setMood(null);
      setStressLevel(null);
      setNotes('');
    } catch {
      const msg = '저장에 실패했습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const getBurnoutColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return colors.success;
      case 'MEDIUM':
        return colors.warning;
      case 'HIGH':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getBurnoutLabel = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return '낮음';
      case 'MEDIUM':
        return '보통';
      case 'HIGH':
        return '높음';
      default:
        return risk;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '웰빙 체크인', headerShown: true }} />

      {/* Check-in form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 기분은 어떠세요?</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((opt, idx) => {
            const value = idx + 1;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.moodButton, mood === value && styles.moodButtonActive]}
                onPress={() => setMood(value)}
              >
                <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                <Text style={[styles.moodLabel, mood === value && styles.moodLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>스트레스 수준</Text>
        <View style={styles.stressRow}>
          {STRESS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.stressButton, stressLevel === opt.value && styles.stressButtonActive]}
              onPress={() => setStressLevel(opt.value)}
            >
              <Text
                style={[styles.stressLabel, stressLevel === opt.value && styles.stressLabelActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>메모 (선택)</Text>
        <TextInput
          style={styles.textInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="오늘의 상태나 특이사항을 적어주세요..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>저장</Text>
        )}
      </TouchableOpacity>

      {/* AI Message */}
      {lastAiMessage && (
        <View style={styles.aiCard}>
          <Text style={styles.aiCardTitle}>💚 AI 메시지</Text>
          <Text style={styles.aiCardText}>{lastAiMessage}</Text>
        </View>
      )}

      {/* Stats */}
      {stats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>통계</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgMood.toFixed(1)}</Text>
              <Text style={styles.statLabel}>평균 기분</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgStress.toFixed(1)}</Text>
              <Text style={styles.statLabel}>평균 스트레스</Text>
            </View>
            <View style={styles.statItem}>
              <View
                style={[
                  styles.burnoutBadge,
                  { backgroundColor: getBurnoutColor(stats.burnoutRisk) + '20' },
                ]}
              >
                <Text style={[styles.burnoutText, { color: getBurnoutColor(stats.burnoutRisk) }]}>
                  {getBurnoutLabel(stats.burnoutRisk)}
                </Text>
              </View>
              <Text style={styles.statLabel}>번아웃 위험</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent entries */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>최근 기록</Text>
        {historyLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : history && history.length > 0 ? (
          history.slice(0, 5).map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyMood}>
                  {MOOD_OPTIONS[(entry.mood || 1) - 1]?.emoji ?? '😐'}
                </Text>
                <View>
                  <Text style={styles.historyDate}>
                    {new Date(entry.createdAt).toLocaleDateString('ko-KR')}
                  </Text>
                  <Text style={styles.historyDetail}>스트레스 {entry.stressLevel}/5</Text>
                </View>
              </View>
              {entry.notes && (
                <Text style={styles.historyNotes} numberOfLines={1}>
                  {entry.notes}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>아직 기록이 없습니다</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
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
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  moodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  moodLabelActive: { color: colors.primary, fontWeight: '600' },
  stressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stressButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  stressButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  stressLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  stressLabelActive: { color: colors.primary, fontWeight: '600' },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  aiCard: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
    padding: spacing.md,
  },
  aiCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  aiCardText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  burnoutBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  burnoutText: { fontSize: fontSize.sm, fontWeight: '600' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyMood: { fontSize: 24 },
  historyDate: { fontSize: fontSize.sm, color: colors.text },
  historyDetail: { fontSize: fontSize.xs, color: colors.textSecondary },
  historyNotes: { fontSize: fontSize.xs, color: colors.textMuted, maxWidth: '40%' },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
