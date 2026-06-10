import { useState } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useChildStore } from '../stores/child.store.js';
import { useAssessments } from '../hooks/use-assessments.js';
import {
  useClinicalReports,
  useCreateClinicalReport,
  useDeleteClinicalReport,
  useExtractFromImage,
} from '../hooks/use-clinical-reports.js';
import type {
  ClinicalReport,
  CreateClinicalReportInput,
  ClinicalReportExtraction,
} from '../hooks/use-clinical-reports.js';
import type { Assessment } from '../types/api.types.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type TabKey = 'tools' | 'external' | 'timeline';

const LICENSED_TOOLS = [
  { id: 'M_CHAT_R_F', name: 'M-CHAT-R/F', desc: '18~24개월 자폐 조기 선별', available: true },
  { id: 'CARS_2', name: 'CARS-2', desc: '아동기 자폐 평가 척도 2판', available: true },
  { id: 'ABC', name: 'ABC', desc: '이상행동 체크리스트', available: true },
  { id: 'ADOS_2', name: 'ADOS-2', desc: '자폐 관찰 진단 스케줄', available: false },
  { id: 'SCQ', name: 'SCQ', desc: '사회적 의사소통 질문지', available: false },
];

function getSeverityLabel(tool: string, score: number): { label: string; color: string } {
  const t = tool.toUpperCase();
  if (t === 'M_CHAT_R_F') {
    if (score <= 2) return { label: '낮은 위험', color: colors.success };
    if (score <= 7) return { label: '중간 위험', color: colors.warning };
    return { label: '높은 위험', color: colors.error };
  }
  if (t === 'CARS_2') {
    if (score < 30) return { label: '비자폐 범위', color: colors.success };
    if (score < 37) return { label: '경증-중등도', color: colors.warning };
    return { label: '중증', color: colors.error };
  }
  if (t === 'ABC') {
    if (score > 0) return { label: '유의미', color: colors.warning };
    return { label: '정상 범위', color: colors.success };
  }
  return { label: `${score}점`, color: colors.textSecondary };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─────────────── Tab: 평가 실행 ───────────────
function ToolsTab({
  licensedAssessments,
  router,
}: {
  licensedAssessments: Assessment[];
  router: ReturnType<typeof useRouter>;
}) {
  const latestByTool = new Map<string, Assessment>();
  licensedAssessments.forEach((a) => {
    const tool = a.questionnaire?.licensedTool;
    if (!tool) return;
    const existing = latestByTool.get(tool);
    if (!existing || new Date(a.createdAt) > new Date(existing.createdAt)) {
      latestByTool.set(tool, a);
    }
  });

  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.sectionTitle}>평가 도구</Text>
      <View style={tabStyles.toolGrid}>
        {LICENSED_TOOLS.map((tool) => {
          const latest = latestByTool.get(tool.id);
          const severity =
            latest?.totalScore != null ? getSeverityLabel(tool.id, latest.totalScore) : null;

          return (
            <TouchableOpacity
              key={tool.id}
              style={[tabStyles.toolCard, !tool.available && tabStyles.toolCardDisabled]}
              disabled={!tool.available}
              onPress={() =>
                router.push({ pathname: '../licensed-assessment', params: { tool: tool.id } })
              }
            >
              <View style={tabStyles.toolHeader}>
                <Text style={tabStyles.toolName}>{tool.name}</Text>
                {!tool.available && (
                  <View style={tabStyles.comingSoonBadge}>
                    <Text style={tabStyles.comingSoonText}>준비중</Text>
                  </View>
                )}
              </View>
              <Text style={tabStyles.toolDesc} numberOfLines={2}>
                {tool.desc}
              </Text>
              {severity && (
                <View style={[tabStyles.scoreBadge, { backgroundColor: severity.color + '20' }]}>
                  <Text style={[tabStyles.scoreText, { color: severity.color }]}>
                    {latest!.totalScore}점 · {severity.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={tabStyles.warningBanner}>
        <Text style={tabStyles.warningIcon}>⚠️</Text>
        <Text style={tabStyles.warningText}>
          라이선스 도구는 저작권 보호 대상이며, 전문 자격이 있는 평가자가 실시해야 합니다.
        </Text>
      </View>

      {licensedAssessments.length > 0 && (
        <>
          <Text style={tabStyles.sectionTitle}>평가 결과 이력</Text>
          <View style={tabStyles.historyList}>
            {licensedAssessments.map((a) => {
              const tool = a.questionnaire?.licensedTool ?? '';
              const severity = a.totalScore != null ? getSeverityLabel(tool, a.totalScore) : null;
              const toolInfo = LICENSED_TOOLS.find((t) => t.id === tool);
              return (
                <View key={a.id} style={tabStyles.historyRow}>
                  <View style={tabStyles.historyLeft}>
                    <Text style={tabStyles.historyTool}>📊 {toolInfo?.name ?? tool}</Text>
                    <Text style={tabStyles.historyDate}>{formatDate(a.createdAt)}</Text>
                  </View>
                  {severity && (
                    <View
                      style={[tabStyles.historyBadge, { backgroundColor: severity.color + '20' }]}
                    >
                      <Text style={[tabStyles.historyScore, { color: severity.color }]}>
                        {a.totalScore}점
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

// ─────────────── Tab: 외부 보고서 ───────────────
function ExternalTab({
  childId,
  reports,
  isLoading,
}: {
  childId: string | null;
  reports: ClinicalReport[];
  isLoading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ClinicalReportExtraction | null>(null);
  const createReport = useCreateClinicalReport(childId);
  const deleteReport = useDeleteClinicalReport(childId);
  const extractFromImage = useExtractFromImage(childId);

  const [form, setForm] = useState<{
    assessmentTool: string;
    assessmentDate: string;
    evaluatorType: string;
    institution: string;
    totalScore: string;
    totalScoreUnit: string;
    clinicalFindings: string;
  }>({
    assessmentTool: '',
    assessmentDate: '',
    evaluatorType: '',
    institution: '',
    totalScore: '',
    totalScoreUnit: '점',
    clinicalFindings: '',
  });

  const resetForm = () => {
    setForm({
      assessmentTool: '',
      assessmentDate: '',
      evaluatorType: '',
      institution: '',
      totalScore: '',
      totalScoreUnit: '점',
      clinicalFindings: '',
    });
    setExtraction(null);
    setShowForm(false);
  };

  const handleImageUpload = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      if (Platform.OS === 'web') {
        window.alert('사진 접근 권한이 필요합니다.');
      } else {
        Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    const base64 = asset.base64 ?? '';
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setExtracting(true);
    try {
      const resp = await extractFromImage.mutateAsync([{ base64, mimeType }]);
      const ext = resp.extraction;
      setExtraction(ext);
      setForm({
        assessmentTool: ext.assessmentTool ?? '',
        assessmentDate: ext.assessmentDate ?? '',
        evaluatorType: ext.evaluatorType ?? '',
        institution: ext.institution ?? '',
        totalScore: ext.totalScore != null ? String(ext.totalScore) : '',
        totalScoreUnit: ext.totalScoreUnit ?? '점',
        clinicalFindings: ext.clinicalFindings ?? '',
      });
      setShowForm(true);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('이미지 분석에 실패했습니다. 수동으로 입력해주세요.');
      } else {
        Alert.alert('분석 실패', '이미지 분석에 실패했습니다. 수동으로 입력해주세요.');
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!form.assessmentTool.trim()) {
      if (Platform.OS === 'web') {
        window.alert('평가 도구명을 입력해주세요.');
      } else {
        Alert.alert('입력 필요', '평가 도구명을 입력해주세요.');
      }
      return;
    }

    const input: CreateClinicalReportInput = {
      assessmentTool: form.assessmentTool.trim(),
      assessmentDate: form.assessmentDate || null,
      evaluatorType: form.evaluatorType || null,
      institution: form.institution || null,
      totalScore: form.totalScore ? Number(form.totalScore) : null,
      totalScoreUnit: form.totalScoreUnit || null,
      clinicalFindings: form.clinicalFindings || null,
      sectionScores: extraction?.sectionScores ?? [],
      source: extraction ? 'IMAGE_IMPORT' : 'MANUAL',
    };

    await createReport.mutateAsync(input);
    resetForm();
  };

  const handleDelete = (reportId: string) => {
    const doDelete = () => deleteReport.mutate(reportId);
    if (Platform.OS === 'web') {
      if (window.confirm('이 보고서를 삭제하시겠습니까?')) doDelete();
    } else {
      Alert.alert('삭제 확인', '이 보고서를 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={tabStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.externalHeader}>
        <Text style={tabStyles.sectionTitle}>외부 평가 보고서</Text>
        <View style={tabStyles.buttonRow}>
          <TouchableOpacity
            style={tabStyles.addButton}
            onPress={handleImageUpload}
            disabled={extracting}
          >
            {extracting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={tabStyles.addButtonText}>📷 사진</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={tabStyles.addButton} onPress={() => setShowForm(!showForm)}>
            <Text style={tabStyles.addButtonText}>✏️ 수동</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showForm && (
        <View style={tabStyles.formCard}>
          {extraction && (
            <View style={tabStyles.extractionBanner}>
              <Text style={tabStyles.extractionText}>
                ✨ AI가 이미지에서 추출한 데이터입니다. 수정 후 저장하세요.
              </Text>
            </View>
          )}
          <TextInput
            style={tabStyles.input}
            placeholder="평가 도구명 (필수) - 예: PRES, K-WISC"
            placeholderTextColor={colors.textMuted}
            value={form.assessmentTool}
            onChangeText={(v) => setForm({ ...form, assessmentTool: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="평가일 (YYYY-MM-DD)"
            placeholderTextColor={colors.textMuted}
            value={form.assessmentDate}
            onChangeText={(v) => setForm({ ...form, assessmentDate: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="평가자 직종 - 예: 언어치료사"
            placeholderTextColor={colors.textMuted}
            value={form.evaluatorType}
            onChangeText={(v) => setForm({ ...form, evaluatorType: v })}
          />
          <TextInput
            style={tabStyles.input}
            placeholder="평가 기관 - 예: OO 발달센터"
            placeholderTextColor={colors.textMuted}
            value={form.institution}
            onChangeText={(v) => setForm({ ...form, institution: v })}
          />
          <View style={tabStyles.scoreRow}>
            <TextInput
              style={[tabStyles.input, { flex: 1 }]}
              placeholder="총점"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={form.totalScore}
              onChangeText={(v) => setForm({ ...form, totalScore: v })}
            />
            <TextInput
              style={[tabStyles.input, { width: 60 }]}
              placeholder="단위"
              placeholderTextColor={colors.textMuted}
              value={form.totalScoreUnit}
              onChangeText={(v) => setForm({ ...form, totalScoreUnit: v })}
            />
          </View>
          <TextInput
            style={[tabStyles.input, tabStyles.textArea]}
            placeholder="임상 소견 (선택)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={form.clinicalFindings}
            onChangeText={(v) => setForm({ ...form, clinicalFindings: v })}
          />
          {extraction && extraction.sectionScores.length > 0 && (
            <View style={tabStyles.sectionScoresPreview}>
              <Text style={tabStyles.sectionScoresLabel}>
                하위 섹션 ({extraction.sectionScores.length}개)
              </Text>
              {extraction.sectionScores.slice(0, 3).map((s, i) => (
                <Text key={i} style={tabStyles.sectionScoreItem}>
                  · {s.name}: {s.score}
                  {s.unit ?? ''}
                  {s.percentile != null ? ` (${s.percentile}%ile)` : ''}
                </Text>
              ))}
              {extraction.sectionScores.length > 3 && (
                <Text style={tabStyles.sectionScoreItem}>
                  +{extraction.sectionScores.length - 3}개 더
                </Text>
              )}
            </View>
          )}
          <View style={tabStyles.formActions}>
            <TouchableOpacity style={tabStyles.cancelBtn} onPress={resetForm}>
              <Text style={tabStyles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tabStyles.saveBtn, createReport.isPending && tabStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={createReport.isPending}
            >
              {createReport.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={tabStyles.saveBtnText}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {reports.length === 0 ? (
        <View style={tabStyles.emptyState}>
          <Text style={tabStyles.emptyIcon}>📄</Text>
          <Text style={tabStyles.emptyText}>외부 평가 보고서가 없습니다</Text>
          <Text style={tabStyles.emptyHint}>
            병원이나 치료센터에서 받은 평가 보고서를 사진으로 추가하거나 수동으로 입력하세요.
          </Text>
        </View>
      ) : (
        <View style={tabStyles.reportList}>
          {reports.map((r) => (
            <View key={r.id} style={tabStyles.reportCard}>
              <View style={tabStyles.reportHeader}>
                <Text style={tabStyles.reportTool}>{r.assessmentTool}</Text>
                <TouchableOpacity onPress={() => handleDelete(r.id)}>
                  <Text style={tabStyles.deleteBtn}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={tabStyles.reportMeta}>
                {[
                  r.assessmentDate ? formatDate(r.assessmentDate) : null,
                  r.evaluatorType,
                  r.institution,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {r.totalScore != null && (
                <Text style={tabStyles.reportScore}>
                  총점: {r.totalScore}
                  {r.totalScoreUnit ?? ''}
                </Text>
              )}
              {r.sectionScores && r.sectionScores.length > 0 && (
                <View style={tabStyles.sectionBadges}>
                  {r.sectionScores.slice(0, 3).map((s, i) => (
                    <View key={i} style={tabStyles.sectionBadge}>
                      <Text style={tabStyles.sectionBadgeText}>
                        {s.name} {s.score}
                        {s.percentile != null ? ` (${s.percentile}%ile)` : ''}
                      </Text>
                    </View>
                  ))}
                  {r.sectionScores.length > 3 && (
                    <View style={tabStyles.sectionBadge}>
                      <Text style={tabStyles.sectionBadgeText}>+{r.sectionScores.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}
              {r.clinicalFindings && (
                <Text style={tabStyles.reportFindings} numberOfLines={2}>
                  &ldquo;{r.clinicalFindings}&rdquo;
                </Text>
              )}
              {r.source === 'IMAGE_IMPORT' && (
                <View style={tabStyles.sourceBadge}>
                  <Text style={tabStyles.sourceBadgeText}>📷 이미지 추출</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────── Tab: 타임라인 ───────────────
interface TimelineEvent {
  id: string;
  kind: 'licensed' | 'external';
  date: string;
  title: string;
  score: number | null;
  tool: string;
}

function TimelineTab({
  licensedAssessments,
  reports,
}: {
  licensedAssessments: Assessment[];
  reports: ClinicalReport[];
}) {
  const events: TimelineEvent[] = [
    ...licensedAssessments.map((a) => ({
      id: a.id,
      kind: 'licensed' as const,
      date: a.createdAt,
      title:
        LICENSED_TOOLS.find((t) => t.id === a.questionnaire?.licensedTool)?.name ?? '라이선스 평가',
      score: a.totalScore,
      tool: a.questionnaire?.licensedTool ?? '',
    })),
    ...reports.map((r) => ({
      id: r.id,
      kind: 'external' as const,
      date: r.assessmentDate ?? r.createdAt,
      title: r.assessmentTool,
      score: r.totalScore,
      tool: '',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <View style={tabStyles.emptyState}>
        <Text style={tabStyles.emptyIcon}>📅</Text>
        <Text style={tabStyles.emptyText}>타임라인이 비어있습니다</Text>
        <Text style={tabStyles.emptyHint}>
          라이선스 도구 평가를 실행하거나 외부 보고서를 추가하면 여기에 표시됩니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.timeline}>
        {events.map((event, idx) => {
          const severity =
            event.kind === 'licensed' && event.score != null
              ? getSeverityLabel(event.tool, event.score)
              : null;

          return (
            <View key={event.id} style={tabStyles.timelineRow}>
              <View style={tabStyles.timelineLine}>
                <View
                  style={[
                    tabStyles.timelineDot,
                    {
                      backgroundColor: event.kind === 'licensed' ? colors.primary : colors.info,
                    },
                  ]}
                />
                {idx < events.length - 1 && <View style={tabStyles.timelineConnector} />}
              </View>
              <View style={tabStyles.timelineContent}>
                <Text style={tabStyles.timelineDate}>{formatDate(event.date)}</Text>
                <View style={tabStyles.timelineTitleRow}>
                  <Text style={tabStyles.timelineIcon}>
                    {event.kind === 'licensed' ? '📊' : '📄'}
                  </Text>
                  <Text style={tabStyles.timelineTitle}>{event.title}</Text>
                  {event.kind === 'external' && (
                    <View style={tabStyles.externalBadge}>
                      <Text style={tabStyles.externalBadgeText}>외부</Text>
                    </View>
                  )}
                </View>
                {event.score != null && (
                  <View style={tabStyles.timelineScoreRow}>
                    <Text style={tabStyles.timelineScore}>{event.score}점</Text>
                    {severity && (
                      <View
                        style={[
                          tabStyles.timelineSeverity,
                          { backgroundColor: severity.color + '20' },
                        ]}
                      >
                        <Text style={[tabStyles.timelineSeverityText, { color: severity.color }]}>
                          {severity.label}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────── Main Screen ───────────────
export default function ClinicalScreen() {
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('tools');

  const { data: assessments, isLoading: assessmentsLoading } = useAssessments(selectedChildId);
  const { data: reports, isLoading: reportsLoading } = useClinicalReports(selectedChildId);

  const licensedAssessments = (assessments ?? []).filter(
    (a) => a.questionnaire?.type === 'LICENSED',
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tools', label: '평가 실행' },
    { key: 'external', label: '외부 보고서' },
    { key: 'timeline', label: '타임라인' },
  ];

  if (!selectedChildId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '임상 평가', headerShown: true }} />
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
      <Stack.Screen options={{ title: '임상 평가', headerShown: true }} />

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
      {assessmentsLoading || reportsLoading ? (
        <View style={tabStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {activeTab === 'tools' && (
            <ToolsTab licensedAssessments={licensedAssessments} router={router} />
          )}
          {activeTab === 'external' && (
            <ExternalTab
              childId={selectedChildId}
              reports={reports ?? []}
              isLoading={reportsLoading}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab licensedAssessments={licensedAssessments} reports={reports ?? []} />
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

  // Section titles
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  // Tool cards
  toolGrid: { gap: spacing.sm },
  toolCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  toolCardDisabled: { opacity: 0.5 },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  toolName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  toolDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  comingSoonBadge: {
    backgroundColor: colors.textMuted + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  comingSoonText: { fontSize: fontSize.xs, color: colors.textMuted },
  scoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  scoreText: { fontSize: fontSize.sm, fontWeight: '600' },

  // Warning banner
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3CD',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#F0D78C',
    padding: spacing.sm,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  warningIcon: { fontSize: fontSize.md },
  warningText: { fontSize: fontSize.xs, color: '#856404', flex: 1, lineHeight: 18 },

  // History
  historyList: {
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
  historyLeft: { flex: 1 },
  historyTool: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  historyDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  historyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  historyScore: { fontSize: fontSize.sm, fontWeight: '600' },

  // External tab
  externalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
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
  extractionBanner: {
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  extractionText: { fontSize: fontSize.xs, color: colors.primaryDark },
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
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  scoreRow: { flexDirection: 'row', gap: spacing.sm },
  sectionScoresPreview: { paddingTop: spacing.xs },
  sectionScoresLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sectionScoreItem: { fontSize: fontSize.xs, color: colors.textSecondary, marginLeft: spacing.sm },
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

  // Report cards
  reportList: { gap: spacing.sm },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportTool: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  deleteBtn: { fontSize: fontSize.lg, padding: spacing.xs },
  reportMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  reportScore: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  sectionBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sectionBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sectionBadgeText: { fontSize: fontSize.xs, color: colors.primaryDark },
  reportFindings: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.info + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sourceBadgeText: { fontSize: fontSize.xs, color: colors.info },

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

  // Timeline
  timeline: { paddingLeft: spacing.sm },
  timelineRow: { flexDirection: 'row', minHeight: 72 },
  timelineLine: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  timelineDate: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  timelineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timelineIcon: { fontSize: fontSize.md },
  timelineTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, flex: 1 },
  externalBadge: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  externalBadgeText: { fontSize: fontSize.xs, color: colors.info },
  timelineScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  timelineScore: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  timelineSeverity: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  timelineSeverityText: { fontSize: fontSize.xs, fontWeight: '600' },
});
