import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useChildStore } from '../../stores/child.store.js';
import { useSchedules, useCreateSchedule, useDeleteSchedule } from '../../hooks/use-schedules.js';
import { ChildSwitcherButton } from '../../components/ChildSwitcher.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';
import type { ScheduleOccurrence } from '../../types/api.types.js';

const CATEGORY_COLORS: Record<string, string> = {
  THERAPY: colors.primary,
  EDUCATION: '#7B9FD4',
  FREE_PLAY: '#E8A87C',
  MEAL: '#F2B880',
  SLEEP: '#9B8EC4',
  OTHER: '#94A3B4',
};

const CATEGORY_LABELS: Record<string, string> = {
  THERAPY: '치료',
  EDUCATION: '교육',
  FREE_PLAY: '자유놀이',
  MEAL: '식사',
  SLEEP: '수면',
  OTHER: '기타',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getWeekDates(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ScheduleScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const weekDates = getWeekDates(baseDate);
  const startDate = toDateStr(weekDates[0]);
  const endDate = toDateStr(weekDates[6]);

  const { data: schedules, isLoading, refetch } = useSchedules(selectedChildId, startDate, endDate);
  const deleteMutation = useDeleteSchedule();

  const daySchedules =
    schedules?.filter((s) => {
      const d = new Date(s.startTime).toDateString();
      return d === selectedDate.toDateString();
    }) ?? [];

  const prevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
  };
  const nextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
  };

  const handleDelete = (schedule: ScheduleOccurrence) => {
    const doDelete = async () => {
      try {
        await deleteMutation.mutateAsync(schedule.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '삭제 실패';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('오류', msg);
        }
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) doDelete();
    } else {
      Alert.alert('일정 삭제', `"${schedule.title}" 일정을 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (!selectedChildId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ChildSwitcherButton />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>아이를 선택해주세요</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevWeek} style={styles.weekNavBtn}>
          <Text style={styles.weekNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {weekDates[0].getMonth() + 1}월 {weekDates[0].getDate()}일 — {weekDates[6].getMonth() + 1}
          월 {weekDates[6].getDate()}일
        </Text>
        <TouchableOpacity onPress={nextWeek} style={styles.weekNavBtn}>
          <Text style={styles.weekNavText}>›</Text>
        </TouchableOpacity>
        <ChildSwitcherButton />
      </View>

      <View style={styles.weekStrip}>
        {weekDates.map((date, idx) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const hasSchedules = schedules?.some(
            (s) => new Date(s.startTime).toDateString() === date.toDateString(),
          );
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                {DAYS[date.getDay()]}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isToday && styles.dayNumToday,
                  isSelected && styles.dayNumSelected,
                ]}
              >
                {date.getDate()}
              </Text>
              {hasSchedules && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 (
            {DAYS[selectedDate.getDay()]})
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.addBtnText}>+ 추가</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : daySchedules.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyText}>이 날 일정이 없습니다</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(true)}>
              <Text style={styles.addEmptyText}>+ 일정 추가</Text>
            </TouchableOpacity>
          </View>
        ) : (
          daySchedules.map((s) => (
            <ScheduleCard key={s.id} schedule={s} onDelete={() => handleDelete(s)} />
          ))
        )}
      </ScrollView>

      <CreateScheduleModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        childId={selectedChildId}
        selectedDate={selectedDate}
        onCreated={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </View>
  );
}

function ScheduleCard({
  schedule,
  onDelete,
}: {
  schedule: ScheduleOccurrence;
  onDelete: () => void;
}) {
  const color = schedule.color || CATEGORY_COLORS[schedule.category] || CATEGORY_COLORS.OTHER;
  return (
    <View style={[styles.scheduleCard, { borderLeftColor: color }]}>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleTime}>
          {formatTime(schedule.startTime)} — {formatTime(schedule.endTime)}
        </Text>
        <Text style={styles.scheduleTitle}>{schedule.title}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.categoryText, { color }]}>
            {CATEGORY_LABELS[schedule.category] ?? schedule.category}
          </Text>
        </View>
        {schedule.location && <Text style={styles.scheduleLocation}>📍 {schedule.location}</Text>}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function CreateScheduleModal({
  visible,
  onClose,
  childId,
  selectedDate,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  childId: string;
  selectedDate: Date;
  onCreated: () => void;
}) {
  const createMutation = useCreateSchedule();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('THERAPY');
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('10');
  const [endMin, setEndMin] = useState('00');
  const [location, setLocation] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') {
        window.alert('제목을 입력해주세요');
      } else {
        Alert.alert('입력 오류', '제목을 입력해주세요');
      }
      return;
    }
    const dateStr = toDateStr(selectedDate);
    const startTime = new Date(`${dateStr}T${startHour}:${startMin}:00`).toISOString();
    const endTime = new Date(`${dateStr}T${endHour}:${endMin}:00`).toISOString();
    try {
      await createMutation.mutateAsync({
        childId,
        input: {
          title: title.trim(),
          category,
          startTime,
          endTime,
          location: location.trim() || undefined,
        },
      });
      setTitle('');
      setLocation('');
      setStartHour('09');
      setStartMin('00');
      setEndHour('10');
      setEndMin('00');
      onCreated();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error?.message || '일정 추가 실패';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalBox}>
          <Text style={styles.modalTitle}>일정 추가</Text>
          <Text style={styles.modalDate}>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 (
            {DAYS[selectedDate.getDay()]})
          </Text>

          <Text style={styles.inputLabel}>제목 *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="일정 제목"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>카테고리</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, category === cat && styles.catBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>시작 시간</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={startHour}
              onChangeText={setStartHour}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.timeSep}>:</Text>
            <TextInput
              style={styles.timeInput}
              value={startMin}
              onChangeText={setStartMin}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <Text style={styles.inputLabel}>종료 시간</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={endHour}
              onChangeText={setEndHour}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.timeSep}>:</Text>
            <TextInput
              style={styles.timeInput}
              value={endMin}
              onChangeText={setEndMin}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <Text style={styles.inputLabel}>장소 (선택)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="장소 입력"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, createMutation.isPending && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>추가</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.sm,
  },
  weekNavBtn: { padding: spacing.xs },
  weekNavText: { fontSize: fontSize.xl, color: colors.primary, fontWeight: '700' },
  weekLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 0 },
  dayCellSelected: { backgroundColor: colors.primaryLight },
  dayLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  dayLabelSelected: { color: colors.primary },
  dayNum: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  dayNumToday: { color: colors.primary },
  dayNumSelected: { color: colors.primary },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 },
  dotSelected: { backgroundColor: colors.primaryDark },
  body: { flex: 1 },
  bodyContent: { padding: spacing.md, gap: spacing.md },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayHeaderText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  addBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
  },
  addBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyDay: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  addEmptyText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  scheduleInfo: { flex: 1, gap: 4 },
  scheduleTime: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  scheduleTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: { fontSize: fontSize.xs, fontWeight: '600' },
  scheduleLocation: { fontSize: fontSize.xs, color: colors.textMuted },
  deleteBtn: { padding: spacing.xs },
  deleteBtnText: { fontSize: fontSize.md, color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalDate: { fontSize: fontSize.sm, color: colors.textSecondary },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    height: 48,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  catBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catBtnText: { fontSize: fontSize.xs, color: colors.textSecondary },
  catBtnTextActive: { color: '#fff', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    width: 60,
    textAlign: 'center',
  },
  timeSep: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.md, color: '#fff', fontWeight: '600' },
});
