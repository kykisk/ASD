import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useChildStore } from '../stores/child.store.js';
import { useUpdateChild } from '../hooks/use-child-edit.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const DOMAIN_LABELS: Record<string, string> = {
  language: '언어',
  cognitive: '인지',
  motor: '운동',
  selfCare: '자조',
  social: '사회성',
  overall: '전반적',
};

const GENDER_OPTIONS = [
  { value: 'MALE', label: '남아' },
  { value: 'FEMALE', label: '여아' },
  { value: 'OTHER', label: '기타' },
] as const;

function ageFromBirthDate(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (years === 0) return `${remainMonths}개월`;
  if (remainMonths === 0) return `${years}세`;
  return `${years}세 ${remainMonths}개월`;
}

export default function ChildProfileScreen() {
  const { getSelectedChild, selectedChildId, familyId } = useChildStore();
  const child = getSelectedChild();
  const updateMutation = useUpdateChild(familyId);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingDev, setEditingDev] = useState(false);
  const [devValues, setDevValues] = useState<Record<string, string>>({});

  const handleSave = async () => {
    if (!selectedChildId || !editingField) return;
    try {
      await updateMutation.mutateAsync({
        childId: selectedChildId,
        input: { [editingField]: editValue.trim() || null },
      });
      setEditingField(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const handleSaveDev = async () => {
    if (!selectedChildId) return;
    const devLevel = Object.fromEntries(Object.entries(devValues).filter(([, v]) => v.trim()));
    try {
      await updateMutation.mutateAsync({
        childId: selectedChildId,
        input: { developmentalLevel: Object.keys(devLevel).length ? devLevel : null },
      });
      setEditingDev(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const openEdit = (field: string, current: string) => {
    setEditingField(field);
    setEditValue(current);
  };

  const openDevEdit = () => {
    const dev = (child?.developmentalLevel as Record<string, string> | null) ?? {};
    setDevValues({
      language: dev.language ?? '',
      cognitive: dev.cognitive ?? '',
      motor: dev.motor ?? '',
      selfCare: dev.selfCare ?? '',
      social: dev.social ?? '',
      overall: dev.overall ?? '',
    });
    setEditingDev(true);
  };

  if (!selectedChildId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '아이 프로필', headerShown: true }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>선택된 아이가 없습니다</Text>
        </View>
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '아이 프로필', headerShown: true }} />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  const devLevel = child.developmentalLevel as Record<string, string> | null;
  const childNotes = (child as any).notes as string | null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '아이 프로필', headerShown: true }} />

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
        </View>
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childAge}>{ageFromBirthDate(child.birthDate)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>기본 정보</Text>
        <EditableRow label="이름" value={child.name} onEdit={() => openEdit('name', child.name)} />
        <Row label="생년월일" value={child.birthDate} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>성별</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.genderBtn, child.gender === opt.value && styles.genderBtnActive]}
                onPress={() =>
                  updateMutation.mutate({ childId: selectedChildId, input: { gender: opt.value } })
                }
              >
                <Text
                  style={[
                    styles.genderBtnText,
                    child.gender === opt.value && styles.genderBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <EditableRow
          label="진단명"
          value={child.diagnosisName ?? '미입력'}
          onEdit={() => openEdit('diagnosisName', child.diagnosisName ?? '')}
        />
        <EditableRow
          label="메모"
          value={childNotes ?? '미입력'}
          onEdit={() => openEdit('notes', childNotes ?? '')}
          multiline
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>발달 수준</Text>
          <TouchableOpacity onPress={openDevEdit}>
            <Text style={styles.editLink}>편집</Text>
          </TouchableOpacity>
        </View>
        {devLevel &&
          Object.entries(devLevel).map(([key, value]) =>
            value ? (
              <View key={key} style={styles.devRow}>
                <Text style={styles.rowLabel}>{DOMAIN_LABELS[key] ?? key}</Text>
                <Text style={styles.devValue}>{value}</Text>
              </View>
            ) : null,
          )}
        {(!devLevel || Object.values(devLevel).every((v) => !v)) && (
          <Text style={styles.emptyText}>미입력</Text>
        )}
      </View>

      <Modal visible={!!editingField} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingField === 'name'
                ? '이름'
                : editingField === 'diagnosisName'
                  ? '진단명'
                  : '메모'}{' '}
              수정
            </Text>
            <TextInput
              style={[styles.modalInput, editingField === 'notes' && styles.modalInputMulti]}
              value={editValue}
              onChangeText={setEditValue}
              multiline={editingField === 'notes'}
              numberOfLines={editingField === 'notes' ? 4 : 1}
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingField(null)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editingDev} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalBox}>
            <Text style={styles.modalTitle}>발달 수준 편집</Text>
            {Object.keys(DOMAIN_LABELS).map((key) => (
              <View key={key} style={styles.devEditRow}>
                <Text style={styles.devEditLabel}>{DOMAIN_LABELS[key]}</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={devValues[key] ?? ''}
                  onChangeText={(v) => setDevValues((p) => ({ ...p, [key]: v }))}
                  placeholder={`${DOMAIN_LABELS[key]} 수준 입력`}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingDev(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                onPress={handleSaveDev}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function EditableRow({
  label,
  value,
  onEdit,
  multiline,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  multiline?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onEdit}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.editableRight}>
        <Text
          style={[styles.rowValue, multiline && { flexShrink: 1 }]}
          numberOfLines={multiline ? 2 : 1}
        >
          {value}
        </Text>
        <Text style={styles.editHint}>편집 ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loader: { marginTop: spacing.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.primary },
  childName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  childAge: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  editLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  rowValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    paddingLeft: spacing.sm,
  },
  editableRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  editHint: { fontSize: fontSize.xs, color: colors.primary },
  genderRow: { flexDirection: 'row', gap: spacing.xs },
  genderBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  genderBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderBtnText: { fontSize: fontSize.xs, color: colors.textSecondary },
  genderBtnTextActive: { color: '#fff', fontWeight: '600' },
  devRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  devValue: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  devEditRow: { marginBottom: spacing.sm },
  devEditLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 48,
  },
  modalInputMulti: { minHeight: 100, textAlignVertical: 'top' },
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
