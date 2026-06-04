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
import { useGenerateReport } from '../hooks/use-reports.js';
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

interface ReportSummary {
  year: number;
  month: number;
  html: string;
  generatedAt: Date;
}

export default function ReportsScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const generateMutation = useGenerateReport();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [generatedReports, setGeneratedReports] = useState<ReportSummary[]>([]);

  const availableYears = [now.getFullYear() - 1, now.getFullYear()].filter((y) => y >= 2024);

  const openHtmlInNewTab = (html: string, year: number, month: number) => {
    if (Platform.OS !== 'web') return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.document.title = `AutiCare ${year}년 ${month}월 보고서`;
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
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
      const result = await generateMutation.mutateAsync({
        childId: selectedChildId,
        year: selectedYear,
        month: selectedMonth,
      });
      const entry: ReportSummary = {
        year: selectedYear,
        month: selectedMonth,
        html: result.html,
        generatedAt: new Date(),
      };
      setGeneratedReports((prev) => [
        entry,
        ...prev.filter((r) => !(r.year === selectedYear && r.month === selectedMonth)),
      ]);

      if (Platform.OS === 'web') {
        const view = window.confirm(
          `${selectedYear}년 ${selectedMonth}월 보고서가 생성되었습니다.\n지금 바로 보시겠습니까?`,
        );
        if (view) openHtmlInNewTab(result.html, selectedYear, selectedMonth);
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
          선택한 기간의 평가, 커리큘럼, 성장 데이터를 기반으로 월간 보고서를 생성합니다.
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

      {generatedReports.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>생성된 보고서 (이 세션)</Text>
          {generatedReports.map((report) => (
            <View key={`${report.year}-${report.month}`} style={styles.reportItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportTitle}>
                  {report.year}년 {report.month}월 월간 보고서
                </Text>
                <Text style={styles.reportDate}>
                  {report.generatedAt.toLocaleDateString('ko-KR')} 생성
                </Text>
              </View>
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => openHtmlInNewTab(report.html, report.year, report.month)}
                >
                  <Text style={styles.viewBtnText}>보기</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Text style={styles.sessionNote}>※ 보고서는 세션 내에서만 유지됩니다</Text>
        </View>
      )}
    </ScrollView>
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
  },
  monthBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthBtnDisabled: { opacity: 0.35 },
  monthBtnText: { fontSize: fontSize.sm, color: colors.text },
  monthBtnTextActive: { color: '#fff', fontWeight: '600' },
  monthBtnTextDisabled: { color: colors.textMuted },
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
  sessionNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
