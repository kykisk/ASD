import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import {
  useReports,
  useGenerateReport,
  getReportUrl,
  type ReportListItem,
} from '../hooks/use-reports.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const MONTH_NAMES = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

export default function ReportsScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const { data: reports, isLoading: reportsLoading, refetch } = useReports(selectedChildId);
  const generateMutation = useGenerateReport();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const availableYears = [now.getFullYear() - 1, now.getFullYear()].filter((y) => y >= 2024);

  const openReport = (reportId: string) => {
    if (Platform.OS !== 'web') return;
    const url = getReportUrl(reportId);
    const token = localStorage.getItem('auticare_access_token') ?? '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>보고서 로딩중...</title>
<script>
fetch('${url}', {headers: {'Authorization': 'Bearer ${token}'}})
  .then(r => r.text()).then(h => { document.open(); document.write(h); document.close(); })
  .catch(e => document.body.innerText = '보고서를 불러올 수 없습니다: ' + e.message);
</script></head><body>불러오는 중...</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  };

  const handleGenerate = async () => {
    if (!selectedChildId) {
      if (Platform.OS === 'web') {
        window.alert('먼저 아이를 선택해주세요');
      } else {
        Alert.alert('알림', '먼저 아이를 선택해주세요');
      }
      return;
    }

    const confirmGenerate =
      Platform.OS === 'web'
        ? window.confirm(`${selectedYear}년 ${selectedMonth}월 월간 보고서를 생성하시겠습니까?`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              '보고서 생성',
              `${selectedYear}년 ${selectedMonth}월 월간 보고서를 생성하시겠습니까?`,
              [
                { text: '취소', style: 'cancel', onPress: () => resolve(false) },
                { text: '생성', onPress: () => resolve(true) },
              ],
            );
          });

    if (!confirmGenerate) return;

    try {
      await generateMutation.mutateAsync({
        childId: selectedChildId,
        year: selectedYear,
        month: selectedMonth,
      });
      await refetch();
      const newReport = reports?.find((r) => r.year === selectedYear && r.month === selectedMonth);
      if (Platform.OS === 'web') {
        const view = window.confirm(
          `${selectedYear}년 ${selectedMonth}월 보고서가 생성되었습니다.\n지금 바로 보시겠습니까?`,
        );
        if (view && newReport) openReport(newReport.id);
      } else {
        Alert.alert('완료', `${selectedYear}년 ${selectedMonth}월 보고서가 생성되었습니다`);
      }
    } catch (err: unknown) {
      const apiMsg = (err as any)?.response?.data?.error?.message;
      const msg =
        apiMsg || '보고서 생성에 실패했습니다. 해당 기간에 충분한 데이터가 있는지 확인해주세요.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '보고서', headerShown: true }} />

      {!selectedChildId && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>아이를 선택하면 보고서를 생성할 수 있습니다</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>월간 보고서 생성</Text>
        <Text style={styles.cardDesc}>
          평가, 커리큘럼, 성장 데이터를 기반으로 월간 보고서를 생성합니다.
        </Text>

        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>연도</Text>
          <View style={styles.selectorOptions}>
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.selectorBtn, selectedYear === year && styles.selectorBtnActive]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.selectorBtnText,
                    selectedYear === year && styles.selectorBtnTextActive,
                  ]}
                >
                  {year}년
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>월</Text>
          <View style={styles.monthGrid}>
            {MONTH_NAMES.map((name, idx) => {
              const month = idx + 1;
              const isFuture = selectedYear === now.getFullYear() && month > now.getMonth() + 1;
              const isGenerated = reports?.some(
                (r) => r.year === selectedYear && r.month === month,
              );
              return (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.monthBtn,
                    selectedMonth === month && styles.monthBtnActive,
                    isFuture && styles.monthBtnDisabled,
                  ]}
                  onPress={() => !isFuture && setSelectedMonth(month)}
                  disabled={isFuture}
                >
                  <Text
                    style={[
                      styles.monthBtnText,
                      selectedMonth === month && styles.monthBtnTextActive,
                      isFuture && styles.monthBtnTextDisabled,
                    ]}
                  >
                    {name}
                  </Text>
                  {isGenerated && <View style={styles.generatedDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.generateBtn,
            (!selectedChildId || generateMutation.isPending) && styles.generateBtnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!selectedChildId || generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>
              {selectedYear}년 {selectedMonth}월 보고서 생성
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>생성된 보고서</Text>
        {reportsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : !reports || reports.length === 0 ? (
          <Text style={styles.emptyText}>아직 생성된 보고서가 없습니다</Text>
        ) : (
          reports.map((report) => (
            <ReportItem key={report.id} report={report} onOpen={openReport} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ReportItem({ report, onOpen }: { report: ReportListItem; onOpen: (id: string) => void }) {
  return (
    <View style={styles.reportItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.reportTitle}>
          {report.year}년 {report.month}월 월간 보고서
        </Text>
        <Text style={styles.reportDate}>
          {new Date(report.createdAt).toLocaleDateString('ko-KR')} 생성
        </Text>
      </View>
      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.viewBtn} onPress={() => onOpen(report.id)}>
          <Text style={styles.viewBtnText}>보기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  warningCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: spacing.md,
  },
  warningText: { fontSize: fontSize.sm, color: '#F57F17', textAlign: 'center' },
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
  cardDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  selector: { marginBottom: spacing.md },
  selectorLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  selectorOptions: { flexDirection: 'row', gap: spacing.sm },
  selectorBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  selectorBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectorBtnText: { fontSize: fontSize.sm, color: colors.text },
  selectorBtnTextActive: { color: '#fff', fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  monthBtn: {
    width: '22%',
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    position: 'relative',
  },
  monthBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthBtnDisabled: { opacity: 0.35 },
  monthBtnText: { fontSize: fontSize.sm, color: colors.text },
  monthBtnTextActive: { color: '#fff', fontWeight: '600' },
  monthBtnTextDisabled: { color: colors.textMuted },
  generatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    position: 'absolute',
    top: 3,
    right: 3,
  },
  generateBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  reportTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  reportDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  viewBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  viewBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
