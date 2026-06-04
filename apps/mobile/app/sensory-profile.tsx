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
import { useLatestSensoryProfile, useCreateSensoryProfile } from '../hooks/use-sensory.js';
import type { CreateSensoryProfileInput } from '../hooks/use-sensory.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const CHANNELS: Array<{ key: keyof CreateSensoryProfileInput; label: string }> = [
  { key: 'visual', label: '시각' },
  { key: 'auditory', label: '청각' },
  { key: 'tactile', label: '촉각' },
  { key: 'vestibular', label: '전정감각' },
  { key: 'proprioception', label: '고유감각' },
  { key: 'olfactory', label: '후각' },
];

const SCALE_LABELS = ['과민', '', '보통', '', '둔감'];

export default function SensoryProfileScreen() {
  const childId = useChildStore((s) => s.selectedChildId);
  const { data: latestProfile, isLoading } = useLatestSensoryProfile(childId);
  const createMutation = useCreateSensoryProfile();

  const [formValues, setFormValues] = useState<Record<string, number>>({
    visual: 3,
    auditory: 3,
    tactile: 3,
    vestibular: 3,
    proprioception: 3,
    olfactory: 3,
  });
  const [notes, setNotes] = useState('');

  const handleValueChange = (key: string, value: number) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!childId) return;

    try {
      await createMutation.mutateAsync({
        childId,
        input: {
          visual: formValues['visual'],
          auditory: formValues['auditory'],
          tactile: formValues['tactile'],
          vestibular: formValues['vestibular'],
          proprioception: formValues['proprioception'],
          olfactory: formValues['olfactory'],
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      setNotes('');
      const msg = '감각 프로파일이 저장되었습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('저장 완료', msg);
      }
    } catch {
      const msg = '저장에 실패했습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const getBarColor = (value: number) => {
    if (value <= 1) return colors.error;
    if (value <= 2) return colors.warning;
    if (value === 3) return colors.score3;
    if (value === 4) return colors.score4;
    return colors.success;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '감각 프로파일', headerShown: true }} />

      {/* Latest profile display */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : latestProfile ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>현재 프로파일</Text>
          <Text style={styles.profileDate}>
            {new Date(latestProfile.createdAt).toLocaleDateString('ko-KR')}
          </Text>

          {CHANNELS.map((ch) => {
            const value = latestProfile[ch.key] as number;
            return (
              <View key={ch.key} style={styles.barRow}>
                <Text style={styles.barLabel}>{ch.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(value / 5) * 100}%`,
                        backgroundColor: getBarColor(value),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{value}</Text>
              </View>
            );
          })}

          {latestProfile.aiRecommendations && (
            <View style={styles.aiSection}>
              <Text style={styles.aiTitle}>🎯 AI 추천</Text>
              <Text style={styles.aiText}>{latestProfile.aiRecommendations}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>아직 기록된 감각 프로파일이 없습니다</Text>
        </View>
      )}

      {/* New profile form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>새 프로파일 입력</Text>
        <Text style={styles.scaleHint}>1=과민 / 3=보통 / 5=둔감</Text>

        {CHANNELS.map((ch) => (
          <View key={ch.key} style={styles.channelRow}>
            <Text style={styles.channelLabel}>{ch.label}</Text>
            <View style={styles.scaleButtons}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scaleBtn, formValues[ch.key] === val && styles.scaleBtnActive]}
                  onPress={() => handleValueChange(ch.key, val)}
                >
                  <Text
                    style={[
                      styles.scaleBtnText,
                      formValues[ch.key] === val && styles.scaleBtnTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleEndLabel}>{SCALE_LABELS[formValues[ch.key] - 1]}</Text>
          </View>
        ))}

        <Text style={styles.fieldLabel}>메모 (선택)</Text>
        <TextInput
          style={styles.textInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="감각 관련 특이사항..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

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
    marginBottom: spacing.xs,
  },
  profileDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barLabel: {
    width: 60,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: colors.cardBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    width: 20,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  aiSection: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  aiTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  aiText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  scaleHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  channelRow: {
    marginBottom: spacing.md,
  },
  channelLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  scaleButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scaleBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  scaleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  scaleBtnText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scaleBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scaleEndLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
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
    marginTop: spacing.md,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
