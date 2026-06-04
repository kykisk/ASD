import { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import { useEmergencyGuide, useLogEmergencyEvent } from '../hooks/use-emergency.js';
import type { LogEmergencyEventInput } from '../hooks/use-emergency.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const GUIDE_TYPES = [
  { key: 'meltdown', label: '멜트다운' },
  { key: 'self-harm', label: '자해' },
  { key: 'aggression', label: '공격행동' },
  { key: 'elopement', label: '도주' },
  { key: 'other', label: '기타' },
];

const SEVERITY_OPTIONS: Array<{ label: string; value: LogEmergencyEventInput['severity'] }> = [
  { label: '경미', value: 'MILD' },
  { label: '보통', value: 'MODERATE' },
  { label: '심각', value: 'SEVERE' },
];

export default function EmergencyGuideScreen() {
  const childId = useChildStore((s) => s.selectedChildId);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { data: guide, isLoading } = useEmergencyGuide(selectedType);
  const logMutation = useLogEmergencyEvent();

  // Breathing guide state
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calm timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Event logging modal
  const [modalVisible, setModalVisible] = useState(false);
  const [severity, setSeverity] = useState<LogEmergencyEventInput['severity']>('MODERATE');
  const [trigger, setTrigger] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  // Breathing cycle
  useEffect(() => {
    if (!guide?.breathingGuide) return;

    const { inhale, hold, exhale } = guide.breathingGuide;
    const totalCycle = inhale + hold + exhale;

    if (breathIntervalRef.current) {
      clearInterval(breathIntervalRef.current);
    }

    let counter = 0;
    breathIntervalRef.current = setInterval(() => {
      counter = (counter + 1) % totalCycle;
      setBreathCount(counter);
      if (counter < inhale) {
        setBreathPhase('inhale');
      } else if (counter < inhale + hold) {
        setBreathPhase('hold');
      } else {
        setBreathPhase('exhale');
      }
    }, 1000);

    return () => {
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current);
      }
    };
  }, [guide?.breathingGuide]);

  // Calm timer
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning, timerSeconds]);

  const startTimer = useCallback(() => {
    if (guide?.calmTimerSec) {
      setTimerSeconds(guide.calmTimerSec);
      setTimerRunning(true);
    }
  }, [guide?.calmTimerSec]);

  const stopTimer = () => {
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    if (guide?.calmTimerSec) {
      setTimerSeconds(guide.calmTimerSec);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getBreathLabel = () => {
    switch (breathPhase) {
      case 'inhale':
        return '들이쉬기';
      case 'hold':
        return '참기';
      case 'exhale':
        return '내쉬기';
    }
  };

  const handleLogEvent = async () => {
    if (!childId || !selectedType) return;

    try {
      await logMutation.mutateAsync({
        childId,
        input: {
          type: selectedType,
          severity,
          ...(trigger.trim() ? { trigger: trigger.trim() } : {}),
          ...(eventNotes.trim() ? { notes: eventNotes.trim() } : {}),
        },
      });
      setModalVisible(false);
      setTrigger('');
      setEventNotes('');
      const msg = '상황이 기록되었습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('기록 완료', msg);
      }
    } catch {
      const msg = '기록 저장에 실패했습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '비상 가이드', headerShown: true }} />

      {/* Guide type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
        <View style={styles.typeRow}>
          {GUIDE_TYPES.map((gt) => (
            <TouchableOpacity
              key={gt.key}
              style={[styles.typeButton, selectedType === gt.key && styles.typeButtonActive]}
              onPress={() => setSelectedType(gt.key)}
            >
              <Text style={[styles.typeLabel, selectedType === gt.key && styles.typeLabelActive]}>
                {gt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {!selectedType && (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>위에서 상황 유형을 선택하세요</Text>
        </View>
      )}

      {selectedType && isLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      )}

      {selectedType && guide && (
        <>
          {/* Guide title */}
          <View style={styles.card}>
            <Text style={styles.guideTitle}>{guide.title}</Text>
          </View>

          {/* Steps */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>단계별 대응</Text>
            {guide.steps.map((step, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Breathing guide */}
          {guide.breathingGuide && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>호흡 가이드</Text>
              <View style={styles.breathingInfo}>
                <Text style={styles.breathingPhases}>
                  들이쉬기 {guide.breathingGuide.inhale}초 / 참기 {guide.breathingGuide.hold}초 /
                  내쉬기 {guide.breathingGuide.exhale}초
                </Text>
              </View>
              <View style={styles.breathingDisplay}>
                <Text style={styles.breathingCurrent}>{getBreathLabel()}</Text>
                <Text style={styles.breathingCounter}>{breathCount + 1}</Text>
              </View>
            </View>
          )}

          {/* Calm timer */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>진정 타이머</Text>
            <Text style={styles.timerDisplay}>{formatTime(timerSeconds)}</Text>
            <View style={styles.timerButtons}>
              <TouchableOpacity
                style={[styles.timerBtn, styles.timerBtnStart]}
                onPress={startTimer}
                disabled={timerRunning}
              >
                <Text style={styles.timerBtnText}>시작</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerBtn, styles.timerBtnStop]}
                onPress={stopTimer}
                disabled={!timerRunning}
              >
                <Text style={styles.timerBtnText}>정지</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerBtn, styles.timerBtnReset]}
                onPress={resetTimer}
              >
                <Text style={styles.timerBtnText}>초기화</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Log event button */}
          <TouchableOpacity style={styles.logButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.logButtonText}>📝 이 상황 기록하기</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Event logging modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>상황 기록</Text>

            <Text style={styles.modalFieldLabel}>유형</Text>
            <Text style={styles.modalFieldValue}>
              {GUIDE_TYPES.find((g) => g.key === selectedType)?.label ?? selectedType}
            </Text>

            <Text style={styles.modalFieldLabel}>심각도</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.severityBtn, severity === opt.value && styles.severityBtnActive]}
                  onPress={() => setSeverity(opt.value)}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      severity === opt.value && styles.severityBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalFieldLabel}>촉발 요인 (선택)</Text>
            <TextInput
              style={styles.modalInput}
              value={trigger}
              onChangeText={setTrigger}
              placeholder="무엇이 상황을 촉발했나요?"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalFieldLabel}>메모 (선택)</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              value={eventNotes}
              onChangeText={setEventNotes}
              placeholder="추가 메모..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, logMutation.isPending && { opacity: 0.6 }]}
                onPress={handleLogEvent}
                disabled={logMutation.isPending}
              >
                {logMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>기록</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  typeScroll: { marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  typeLabelActive: { color: colors.primary, fontWeight: '600' },
  placeholderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  placeholderText: { fontSize: fontSize.md, color: colors.textMuted },
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
  guideTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  stepText: { flex: 1, fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  breathingInfo: { marginBottom: spacing.sm },
  breathingPhases: { fontSize: fontSize.sm, color: colors.textSecondary },
  breathingDisplay: { alignItems: 'center', paddingVertical: spacing.md },
  breathingCurrent: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  breathingCounter: { fontSize: fontSize.lg, color: colors.textSecondary, marginTop: spacing.xs },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    paddingVertical: spacing.md,
  },
  timerButtons: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  timerBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  timerBtnStart: { backgroundColor: colors.success },
  timerBtnStop: { backgroundColor: colors.warning },
  timerBtnReset: { backgroundColor: colors.textMuted },
  timerBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  logButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    alignItems: 'center',
  },
  logButtonText: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalFieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalFieldValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  severityRow: { flexDirection: 'row', gap: spacing.sm },
  severityBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  severityBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  severityBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
  severityBtnTextActive: { color: colors.primary, fontWeight: '600' },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: fontSize.md, color: colors.textSecondary },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: fontSize.md, color: '#fff', fontWeight: '600' },
});
