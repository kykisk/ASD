import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import {
  useMedications,
  useMedicationLogs,
  useCreateMedication,
  useDeleteMedication,
  useUpsertMedicationLog,
} from '../hooks/use-medications.js';
import type { Medication, MedicationLog, CreateMedicationInput } from '../hooks/use-medications.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type TabKey = 'today' | 'history' | 'manage';

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function get30DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
}

// ─────────────── Tab: 오늘 ───────────────
function TodayTab({
  childId,
  medications,
  logs,
}: {
  childId: string;
  medications: Medication[];
  logs: MedicationLog[];
}) {
  const upsertLog = useUpsertMedicationLog(childId);
  const today = getToday();

  const todayLogMap = useMemo(() => {
    const map = new Map<string, MedicationLog>();
    logs.forEach((log) => {
      if (log.logDate === today || log.logDate.startsWith(today)) {
        map.set(log.medicationId, log);
      }
    });
    return map;
  }, [logs, today]);

  const activeMeds = medications.filter((m) => m.isActive);

  const handleToggle = (med: Medication) => {
    const existing = todayLogMap.get(med.id);
    const newTaken = !existing?.taken;
    upsertLog.mutate({
      medicationId: med.id,
      input: {
        logDate: today,
        taken: newTaken,
        takenAt: newTaken ? new Date().toISOString() : null,
      },
    });
  };

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.disclaimerBanner}>
        <Text style={tabStyles.disclaimerIcon}>⚠️</Text>
        <Text style={tabStyles.disclaimerText}>
          의사가 처방한 약물 복용을 기록하는 보조 도구입니다
        </Text>
      </View>

      {activeMeds.length === 0 ? (
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>💊</Text>
          <Text style={tabStyles.emptyText}>등록된 약물이 없습니다</Text>
          <Text style={tabStyles.emptyHint}>
            &apos;약물 관리&apos; 탭에서 복용 중인 약물을 추가해주세요.
          </Text>
        </View>
      ) : (
        <View style={tabStyles.medList}>
          {activeMeds.map((med) => {
            const log = todayLogMap.get(med.id);
            const status = log ? (log.taken ? 'taken' : 'skipped') : 'none';
            const statusIcon = status === 'taken' ? '✓' : status === 'skipped' ? '✗' : '○';
            const statusColor =
              status === 'taken'
                ? colors.success
                : status === 'skipped'
                  ? colors.error
                  : colors.textMuted;

            return (
              <TouchableOpacity
                key={med.id}
                style={[tabStyles.todayCard, status === 'taken' && tabStyles.todayCardTaken]}
                onPress={() => handleToggle(med)}
                disabled={upsertLog.isPending}
              >
                <View style={tabStyles.todayCardLeft}>
                  <Text style={tabStyles.todayMedName}>{med.name}</Text>
                  {med.dosage && <Text style={tabStyles.todayMedDosage}>{med.dosage}</Text>}
                  {med.frequency && <Text style={tabStyles.todayMedFreq}>{med.frequency}</Text>}
                </View>
                <View style={[tabStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[tabStyles.statusIcon, { color: statusColor }]}>{statusIcon}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={tabStyles.hintText}>탭하여 복용 상태를 전환합니다 (복용 ✓ ↔ 미복용 ✗)</Text>
    </View>
  );
}

// ─────────────── Tab: 기록 ───────────────
function HistoryTab({ logs }: { logs: MedicationLog[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, MedicationLog[]>();
    const sorted = [...logs].sort(
      (a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime(),
    );
    sorted.forEach((log) => {
      const dateKey = log.logDate.substring(0, 10);
      const group = map.get(dateKey);
      if (group) {
        group.push(log);
      } else {
        map.set(dateKey, [log]);
      }
    });
    return map;
  }, [logs]);

  if (logs.length === 0) {
    return (
      <View style={tabStyles.emptyState}>
        <Text style={tabStyles.emptyIcon}>📋</Text>
        <Text style={tabStyles.emptyText}>복약 기록이 없습니다</Text>
        <Text style={tabStyles.emptyHint}>오늘 탭에서 약물 복용을 기록하면 여기에 표시됩니다.</Text>
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      {Array.from(grouped.entries()).map(([dateKey, dateLogs]) => (
        <View key={dateKey} style={tabStyles.historyGroup}>
          <Text style={tabStyles.historyDate}>{formatShortDate(dateKey)}</Text>
          <View style={tabStyles.historyCard}>
            {dateLogs.map((log) => (
              <View key={log.id} style={tabStyles.historyRow}>
                <View style={tabStyles.historyRowLeft}>
                  <Text style={tabStyles.historyMedName}>{log.medication.name}</Text>
                  {log.medication.dosage && (
                    <Text style={tabStyles.historyMedDosage}>{log.medication.dosage}</Text>
                  )}
                </View>
                <View
                  style={[
                    tabStyles.historyStatusBadge,
                    { backgroundColor: (log.taken ? colors.success : colors.error) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      tabStyles.historyStatusText,
                      { color: log.taken ? colors.success : colors.error },
                    ]}
                  >
                    {log.taken ? '복용' : '미복용'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─────────────── Tab: 약물 관리 ───────────────
function ManageTab({ childId, medications }: { childId: string; medications: Medication[] }) {
  const [showForm, setShowForm] = useState(false);
  const createMed = useCreateMedication(childId);
  const deleteMed = useDeleteMedication(childId);

  const [form, setForm] = useState<CreateMedicationInput>({
    name: '',
    dosage: '',
    prescribedBy: '',
    startDate: '',
    frequency: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({ name: '', dosage: '', prescribedBy: '', startDate: '', frequency: '', notes: '' });
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      if (Platform.OS === 'web') {
        window.alert('약물명을 입력해주세요.');
      } else {
        Alert.alert('입력 필요', '약물명을 입력해주세요.');
      }
      return;
    }

    await createMed.mutateAsync({
      name: form.name.trim(),
      dosage: form.dosage || null,
      prescribedBy: form.prescribedBy || null,
      startDate: form.startDate || null,
      frequency: form.frequency || null,
      notes: form.notes || null,
    });
    resetForm();
  };

  const handleDeactivate = (med: Medication) => {
    const doDeactivate = () => deleteMed.mutate(med.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`'${med.name}' 복용을 종료하시겠습니까?`)) doDeactivate();
    } else {
      Alert.alert('복용 종료', `'${med.name}' 복용을 종료하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: doDeactivate },
      ]);
    }
  };

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.manageHeader}>
        <Text style={tabStyles.sectionTitle}>전체 약물 목록</Text>
        <TouchableOpacity style={tabStyles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={tabStyles.addButtonText}>{showForm ? '닫기' : '약물 추가'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={tabStyles.formCard}>
          <TextInput
            style={tabStyles.input}
            placeholder="약물명 (필수)"
            placeholderTextColor={colors.textMuted}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="용량 - 예: 5mg 1일 2회"
            placeholderTextColor={colors.textMuted}
            value={form.dosage ?? ''}
            onChangeText={(v) => setForm({ ...form, dosage: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="처방의사/병원 - 예: OO병원 김OO 선생님"
            placeholderTextColor={colors.textMuted}
            value={form.prescribedBy ?? ''}
            onChangeText={(v) => setForm({ ...form, prescribedBy: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="시작일 (YYYY-MM-DD)"
            placeholderTextColor={colors.textMuted}
            value={form.startDate ?? ''}
            onChangeText={(v) => setForm({ ...form, startDate: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="복약주기 - 예: 매일 아침/저녁"
            placeholderTextColor={colors.textMuted}
            value={form.frequency ?? ''}
            onChangeText={(v) => setForm({ ...form, frequency: v })}
          />
          <TextInput
            style={[tabStyles.input, tabStyles.textArea]}
            placeholder="메모 (선택)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            value={form.notes ?? ''}
            onChangeText={(v) => setForm({ ...form, notes: v })}
          />
          <View style={tabStyles.formActions}>
            <TouchableOpacity style={tabStyles.cancelBtn} onPress={resetForm}>
              <Text style={tabStyles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tabStyles.saveBtn, createMed.isPending && tabStyles.saveBtnDisabled]}
              onPress={handleAdd}
              disabled={createMed.isPending}
            >
              {createMed.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={tabStyles.saveBtnText}>추가</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {medications.length === 0 ? (
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>💊</Text>
          <Text style={tabStyles.emptyText}>등록된 약물이 없습니다</Text>
          <Text style={tabStyles.emptyHint}>
            위 &apos;약물 추가&apos; 버튼을 눌러 복용 중인 약물을 등록하세요.
          </Text>
        </View>
      ) : (
        <View style={tabStyles.medList}>
          {medications.map((med) => (
            <View key={med.id} style={tabStyles.manageCard}>
              <View style={tabStyles.manageCardHeader}>
                <View style={tabStyles.manageCardLeft}>
                  <Text style={tabStyles.manageMedName}>{med.name}</Text>
                  <View
                    style={[
                      tabStyles.activeBadge,
                      {
                        backgroundColor: (med.isActive ? colors.success : colors.textMuted) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        tabStyles.activeBadgeText,
                        { color: med.isActive ? colors.success : colors.textMuted },
                      ]}
                    >
                      {med.isActive ? '복용중' : '종료'}
                    </Text>
                  </View>
                </View>
                {med.isActive && (
                  <TouchableOpacity
                    style={tabStyles.deactivateBtn}
                    onPress={() => handleDeactivate(med)}
                    disabled={deleteMed.isPending}
                  >
                    <Text style={tabStyles.deactivateBtnText}>복용종료</Text>
                  </TouchableOpacity>
                )}
              </View>
              {med.dosage && <Text style={tabStyles.manageDetail}>💊 {med.dosage}</Text>}
              {med.prescribedBy && (
                <Text style={tabStyles.manageDetail}>🏥 {med.prescribedBy}</Text>
              )}
              {med.startDate && (
                <Text style={tabStyles.manageDetail}>📅 {formatDate(med.startDate)}</Text>
              )}
              {med.frequency && <Text style={tabStyles.manageDetail}>🔄 {med.frequency}</Text>}
              {med.notes && <Text style={tabStyles.manageNotes}>{med.notes}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────── Main Screen ───────────────
export default function MedicationScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const [activeTab, setActiveTab] = useState<TabKey>('today');

  const today = getToday();
  const thirtyDaysAgo = get30DaysAgo();

  const { data: allMedications, isLoading: medsLoading } = useMedications(selectedChildId);
  const { data: logs, isLoading: logsLoading } = useMedicationLogs(
    selectedChildId,
    thirtyDaysAgo,
    today,
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'today', label: '오늘' },
    { key: 'history', label: '기록' },
    { key: 'manage', label: '약물 관리' },
  ];

  if (!selectedChildId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '복약 관리', headerShown: true }} />
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>👶</Text>
          <Text style={tabStyles.emptyText}>아이를 선택해주세요</Text>
          <Text style={tabStyles.emptyHint}>
            더보기 탭에서 아이를 선택한 후 이용할 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '복약 관리', headerShown: true }} />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {medsLoading || logsLoading ? (
        <View style={tabStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {activeTab === 'today' && (
            <TodayTab
              childId={selectedChildId}
              medications={allMedications ?? []}
              logs={logs ?? []}
            />
          )}
          {activeTab === 'history' && <HistoryTab logs={logs ?? []} />}
          {activeTab === 'manage' && (
            <ManageTab childId={selectedChildId} medications={allMedications ?? []} />
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

const tabStyles = StyleSheet.create({
  container: { gap: spacing.md },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },

  // Disclaimer
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3CD',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#F0D78C',
    padding: spacing.sm,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  disclaimerIcon: { fontSize: fontSize.md },
  disclaimerText: { fontSize: fontSize.xs, color: '#856404', flex: 1, lineHeight: 18 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Today tab
  medList: { gap: spacing.sm },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayCardTaken: {
    borderColor: colors.success + '60',
    backgroundColor: colors.success + '08',
  },
  todayCardLeft: { flex: 1 },
  todayMedName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  todayMedDosage: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  todayMedFreq: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: { fontSize: fontSize.xl, fontWeight: '700' },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // History tab
  historyGroup: { gap: spacing.xs },
  historyDate: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  historyRowLeft: { flex: 1 },
  historyMedName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  historyMedDosage: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  historyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  historyStatusText: { fontSize: fontSize.xs, fontWeight: '600' },

  // Manage tab
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },

  // Form
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  textArea: { minHeight: 56, textAlignVertical: 'top' },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },

  // Manage cards
  manageCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  manageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  manageMedName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  activeBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  deactivateBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  deactivateBtnText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '500' },
  manageDetail: { fontSize: fontSize.sm, color: colors.textSecondary },
  manageNotes: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
