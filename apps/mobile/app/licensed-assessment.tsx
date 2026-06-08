import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import { useCreateAssessment } from '../hooks/use-assessments.js';
import {
  useFamilyLicense,
  useToolConsentDocument,
  useToolConsentCheck,
  useRecordToolConsent,
  useToolQuestionnaire,
  useScoreAssessment,
} from '../hooks/use-licensed-assessments.js';
import type { ScoringResult } from '../hooks/use-licensed-assessments.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type Step = 'pick' | 'checking' | 'no_license' | 'consent' | 'assessing' | 'scoring' | 'results';

const TOOL_OPTIONS = [
  { id: 'M_CHAT_R_F', name: 'M-CHAT-R/F', description: '18~24개월 자폐 조기 선별' },
  { id: 'CARS_2', name: 'CARS-2', description: '아동기 자폐 평가 척도' },
  { id: 'ABC', name: 'ABC', description: '이상행동 체크리스트' },
];

function getSeverityColor(severity: string): string {
  const s = severity.toUpperCase();
  if (s === 'LOW_RISK' || s === 'NON_AUTISTIC') return colors.success;
  if (s === 'MEDIUM_RISK' || s === 'MILD_MODERATE') return colors.warning;
  if (s === 'HIGH_RISK' || s === 'SEVERE') return colors.error;
  return colors.textMuted;
}

export default function LicensedAssessmentScreen() {
  const params = useLocalSearchParams<{ tool?: string }>();
  const router = useRouter();
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const familyId = useChildStore((s) => s.familyId);

  const [tool, setTool] = useState<string | null>(params.tool ?? null);
  const [step, setStep] = useState<Step>(params.tool ? 'checking' : 'pick');
  const [consentChecked, setConsentChecked] = useState(false);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [scores, setScores] = useState<Array<{ itemId: string; domain: string; score: number }>>(
    [],
  );
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  const { data: licenseData } = useFamilyLicense(familyId, tool);
  const { data: consentDocument } = useToolConsentDocument(tool);
  const { data: consentData } = useToolConsentCheck(tool);
  const recordConsent = useRecordToolConsent();
  const { data: questionnaire } = useToolQuestionnaire(familyId, tool);
  const createAssessment = useCreateAssessment();
  const scoreAssessment = useScoreAssessment();

  useEffect(() => {
    if (!tool || !familyId) return;
    if (step !== 'checking') return;
    if (!licenseData) return;
    if (!licenseData.hasLicense) {
      setStep('no_license');
      return;
    }
    if (!consentData) return;
    if (!consentData.consented) {
      setStep('consent');
      return;
    }
    setStep('assessing');
  }, [tool, familyId, licenseData, consentData, step]);

  const handleToolSelect = (toolId: string) => {
    setTool(toolId);
    setStep('checking');
  };

  const handleConsent = async () => {
    if (!tool) return;
    await recordConsent.mutateAsync(tool);
    setStep('assessing');
  };

  const handleScoreSelect = (score: number) => {
    setCurrentScore(score);
  };

  const handleNext = () => {
    if (currentScore === null || !questionnaire) return;
    const item = questionnaire.items[currentItemIdx];
    const newScores = [...scores, { itemId: item.id, domain: item.domain, score: currentScore }];
    setScores(newScores);
    setCurrentScore(null);

    if (currentItemIdx < questionnaire.items.length - 1) {
      setCurrentItemIdx(currentItemIdx + 1);
    } else {
      handleSubmit(newScores);
    }
  };

  const handleSubmit = async (
    finalScores: Array<{ itemId: string; domain: string; score: number }>,
  ) => {
    if (!selectedChildId || !questionnaire) return;
    setStep('scoring');
    try {
      const assessment = await createAssessment.mutateAsync({
        childId: selectedChildId,
        input: { questionnaireId: questionnaire.id, scores: finalScores },
      });
      const result = await scoreAssessment.mutateAsync(assessment.id);
      setScoringResult(result);
      setStep('results');
    } catch {
      setStep('assessing');
    }
  };

  const handleReset = () => {
    setTool(null);
    setStep('pick');
    setConsentChecked(false);
    setCurrentItemIdx(0);
    setScores([]);
    setCurrentScore(null);
    setScoringResult(null);
  };

  const renderScoreButtons = () => {
    if (!tool) return null;

    if (tool === 'M_CHAT_R_F') {
      return (
        <View style={styles.scoreRow}>
          <TouchableOpacity
            style={[styles.scoreBtnLarge, currentScore === 2 && styles.scoreBtnActive]}
            onPress={() => handleScoreSelect(2)}
          >
            <Text style={[styles.scoreBtnLabel, currentScore === 2 && styles.scoreBtnLabelActive]}>
              예
            </Text>
            <Text style={[styles.scoreBtnSub, currentScore === 2 && styles.scoreBtnSubActive]}>
              정상
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scoreBtnLarge, currentScore === 4 && styles.scoreBtnActive]}
            onPress={() => handleScoreSelect(4)}
          >
            <Text style={[styles.scoreBtnLabel, currentScore === 4 && styles.scoreBtnLabelActive]}>
              아니오
            </Text>
            <Text style={[styles.scoreBtnSub, currentScore === 4 && styles.scoreBtnSubActive]}>
              이상
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tool === 'CARS_2') {
      const options = [
        { score: 1, label: '1', sub: '정상' },
        { score: 2, label: '2', sub: '경미' },
        { score: 3, label: '3', sub: '중등' },
        { score: 4, label: '4', sub: '심각' },
      ];
      return (
        <View style={styles.scoreRow}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.score}
              style={[styles.scoreBtn, currentScore === opt.score && styles.scoreBtnActive]}
              onPress={() => handleScoreSelect(opt.score)}
            >
              <Text
                style={[
                  styles.scoreBtnLabel,
                  currentScore === opt.score && styles.scoreBtnLabelActive,
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[styles.scoreBtnSub, currentScore === opt.score && styles.scoreBtnSubActive]}
              >
                {opt.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // ABC
    const options = [
      { score: 1, label: '0', sub: '없음' },
      { score: 2, label: '1', sub: '경미' },
      { score: 3, label: '2', sub: '중등' },
      { score: 4, label: '3', sub: '심각' },
    ];
    return (
      <View style={styles.scoreRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.score}
            style={[styles.scoreBtn, currentScore === opt.score && styles.scoreBtnActive]}
            onPress={() => handleScoreSelect(opt.score)}
          >
            <Text
              style={[
                styles.scoreBtnLabel,
                currentScore === opt.score && styles.scoreBtnLabelActive,
              ]}
            >
              {opt.label}
            </Text>
            <Text
              style={[styles.scoreBtnSub, currentScore === opt.score && styles.scoreBtnSubActive]}
            >
              {opt.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPick = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>평가 도구 선택</Text>
      <Text style={styles.stepDesc}>사용할 라이선스 평가 도구를 선택하세요</Text>
      {TOOL_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.id}
          style={styles.toolCard}
          onPress={() => handleToolSelect(opt.id)}
        >
          <Text style={styles.toolName}>{opt.name}</Text>
          <Text style={styles.toolDesc}>{opt.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderChecking = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>라이선스 확인 중...</Text>
    </View>
  );

  const renderNoLicense = () => (
    <View style={styles.centerContainer}>
      <View style={styles.noLicenseCard}>
        <Text style={styles.noLicenseIcon}>⚠️</Text>
        <Text style={styles.noLicenseTitle}>이 도구의 라이선스가 없습니다</Text>
        <Text style={styles.noLicenseDesc}>
          이 평가 도구를 사용하려면 관리자에게 라이선스를 요청하세요.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConsent = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{consentDocument?.title ?? '동의서'}</Text>
      <ScrollView style={styles.consentBox} nestedScrollEnabled>
        <Text style={styles.consentText}>
          {consentDocument?.content ?? '내용을 불러오는 중...'}
        </Text>
      </ScrollView>
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setConsentChecked(!consentChecked)}
      >
        <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
          {consentChecked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>위 내용을 읽고 동의합니다</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.primaryButton, !consentChecked && styles.buttonDisabled]}
        onPress={handleConsent}
        disabled={!consentChecked || recordConsent.isPending}
      >
        {recordConsent.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>동의 후 시작</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAssessing = () => {
    if (!questionnaire || questionnaire.items.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>문항 로딩 중...</Text>
        </View>
      );
    }

    const item = questionnaire.items[currentItemIdx];
    const total = questionnaire.items.length;
    const progress = (currentItemIdx / total) * 100;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.progressText}>
          {currentItemIdx + 1} / {total}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.domainBadge}>
          <Text style={styles.domainBadgeText}>{item.domain}</Text>
        </View>

        <Text style={styles.itemText}>{item.text}</Text>
        {item.description && <Text style={styles.itemDescription}>{item.description}</Text>}

        {renderScoreButtons()}

        <TouchableOpacity
          style={[styles.primaryButton, currentScore === null && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={currentScore === null}
        >
          <Text style={styles.primaryButtonText}>
            {currentItemIdx < total - 1 ? '다음' : '제출'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderScoring = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>채점 중...</Text>
    </View>
  );

  const renderResults = () => {
    if (!scoringResult) return null;
    const severityColor = getSeverityColor(scoringResult.severity);
    const subscaleEntries = Object.entries(scoringResult.subscaleScores);
    const maxSubscale = Math.max(...Object.values(scoringResult.subscaleScores), 1);

    return (
      <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultToolName}>
            {TOOL_OPTIONS.find((t) => t.id === tool)?.name ?? tool}
          </Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>
              {scoringResult.totalScore} / {scoringResult.maxPossibleScore}
            </Text>
          </View>
        </View>

        <View style={[styles.severityTag, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>
            {scoringResult.severity.replace(/_/g, ' ')}
          </Text>
        </View>

        <Text style={styles.interpretationText}>{scoringResult.interpretation}</Text>
        <Text style={styles.clinicalText}>{scoringResult.clinicalDescription}</Text>

        {scoringResult.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>권고사항</Text>
            {scoringResult.recommendations.map((rec, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {subscaleEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>하위척도</Text>
            {subscaleEntries.map(([name, score]) => (
              <View key={name} style={styles.subscaleRow}>
                <Text style={styles.subscaleLabel}>{name}</Text>
                <View style={styles.subscaleTrack}>
                  <View
                    style={[styles.subscaleFill, { width: `${(score / maxSubscale) * 100}%` }]}
                  />
                </View>
                <Text style={styles.subscaleValue}>{score}</Text>
              </View>
            ))}
            {Object.entries(scoringResult.subscaleInterpretations).map(([name, interp]) => (
              <Text key={name} style={styles.subscaleInterp}>
                {name}: {interp}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>다시 시작</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/assessment')}
          >
            <Text style={styles.primaryButtonText}>평가 기록 보기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'pick':
        return renderPick();
      case 'checking':
        return renderChecking();
      case 'no_license':
        return renderNoLicense();
      case 'consent':
        return renderConsent();
      case 'assessing':
        return renderAssessing();
      case 'scoring':
        return renderScoring();
      case 'results':
        return renderResults();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '라이선스 평가', headerShown: true }} />
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stepContainer: { flex: 1, padding: spacing.md, gap: spacing.md },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.textSecondary },

  // Pick step
  stepTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  stepDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  toolCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  toolName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  toolDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  // No license
  noLicenseCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  noLicenseIcon: { fontSize: 48, marginBottom: spacing.md },
  noLicenseTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  noLicenseDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Consent
  consentBox: {
    backgroundColor: colors.cardBorder + '40',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    maxHeight: 300,
  },
  consentText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkmark: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  checkboxLabel: { fontSize: fontSize.md, color: colors.text },

  // Assessing
  progressText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  progressTrack: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  domainBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  domainBadgeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primaryDark },
  itemText: { fontSize: fontSize.lg, fontWeight: '500', color: colors.text, lineHeight: 28 },
  itemDescription: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  scoreRow: { flexDirection: 'row', gap: spacing.sm },
  scoreBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  scoreBtnLarge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  scoreBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  scoreBtnLabel: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  scoreBtnLabelActive: { color: colors.primary },
  scoreBtnSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  scoreBtnSubActive: { color: colors.primaryDark },

  // Results
  resultsScroll: { flex: 1 },
  resultsContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultToolName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  scoreBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scoreBadgeText: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  severityTag: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  severityText: { fontSize: fontSize.sm, fontWeight: '600' },
  interpretationText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 26,
  },
  clinicalText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 24 },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: fontSize.md, color: colors.primary, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  subscaleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subscaleLabel: { width: 80, fontSize: fontSize.xs, color: colors.text },
  subscaleTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.cardBorder,
    borderRadius: 5,
    overflow: 'hidden',
  },
  subscaleFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  subscaleValue: {
    width: 28,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  subscaleInterp: { fontSize: fontSize.xs, color: colors.textSecondary, fontStyle: 'italic' },
  resultActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryButtonText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});
