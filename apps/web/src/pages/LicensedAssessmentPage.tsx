import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMyFamily } from '../hooks/use-families';
import { useChildStore } from '../stores/child.store';
import { useCreateAssessment } from '../hooks/use-assessments';
import {
  useFamilyLicense,
  useToolConsentDocument,
  useToolConsentCheck,
  useRecordToolConsent,
  useToolQuestionnaire,
  useScoreAssessment,
  type ScoringResult,
  type LicensedQuestionnaireItem,
} from '../hooks/use-licensed-assessments';
import { PageHeader, LoadingSpinner } from '../components/ui';

type Step = 'checking' | 'no_license' | 'consent' | 'assessing' | 'scoring' | 'results';

const TOOL_NAMES: Record<string, string> = {
  M_CHAT_R_F: 'M-CHAT-R/F',
  CARS_2: 'CARS-2',
  ABC: 'ABC',
  ADOS_2: 'ADOS-2',
  SCQ: 'SCQ',
};

interface ScoreEntry {
  itemId: string;
  domain: string;
  score: number;
}

function getSeverityColor(severity: string): string {
  const lower = severity.toLowerCase();
  if (lower.includes('low') || lower.includes('normal') || lower.includes('minimal'))
    return 'bg-green-100 text-green-700';
  if (lower.includes('medium') || lower.includes('moderate') || lower.includes('mild'))
    return 'bg-amber-100 text-amber-700';
  if (lower.includes('high') || lower.includes('severe')) return 'bg-red-100 text-red-700';
  return 'bg-neutral-100 text-neutral-700';
}

export function LicensedAssessmentPage() {
  const { tool } = useParams<{ tool: string }>();
  const navigate = useNavigate();
  const { data: family } = useMyFamily();
  const selectedChildId = useChildStore((s) => s.selectedChildId);

  const [step, setStep] = useState<Step>('checking');
  const [consentChecked, setConsentChecked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  const familyId = family?.id ?? null;
  const toolId = tool ?? '';
  const toolName = TOOL_NAMES[toolId] ?? toolId;

  // Data fetching hooks
  const licenseQuery = useFamilyLicense(familyId, toolId);
  const consentCheckQuery = useToolConsentCheck(step === 'checking' ? toolId : null);
  const consentDocQuery = useToolConsentDocument(step === 'consent' ? toolId : null);
  const questionnaireQuery = useToolQuestionnaire(familyId, step === 'assessing' ? toolId : null);

  // Mutations
  const recordConsent = useRecordToolConsent();
  const createAssessment = useCreateAssessment();
  const scoreAssessment = useScoreAssessment();

  // Step transition logic
  useEffect(() => {
    if (step !== 'checking') return;
    if (licenseQuery.isLoading || consentCheckQuery.isLoading) return;

    if (licenseQuery.isError || !licenseQuery.data?.hasLicense) {
      setStep('no_license');
      return;
    }

    if (consentCheckQuery.data?.consented) {
      setStep('assessing');
    } else {
      setStep('consent');
    }
  }, [
    step,
    licenseQuery.isLoading,
    licenseQuery.isError,
    licenseQuery.data,
    consentCheckQuery.isLoading,
    consentCheckQuery.data,
  ]);

  // Score buttons config per tool
  const getScoreButtons = useCallback((): Array<{ label: string; value: number }> => {
    switch (toolId) {
      case 'M_CHAT_R_F':
        return [
          { label: '예 (통과)', value: 2 },
          { label: '아니오 (실패)', value: 4 },
        ];
      case 'CARS_2':
        return [
          { label: '1 정상', value: 1 },
          { label: '2 경미', value: 2 },
          { label: '3 중등도', value: 3 },
          { label: '4 심각', value: 4 },
        ];
      case 'ABC':
        return [
          { label: '0 없음', value: 1 },
          { label: '1 경미', value: 2 },
          { label: '2 중등도', value: 3 },
          { label: '3 심각', value: 4 },
        ];
      default:
        return [
          { label: '1', value: 1 },
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
        ];
    }
  }, [toolId]);

  const items: LicensedQuestionnaireItem[] = questionnaireQuery.data?.items ?? [];
  const currentItem = items[currentIndex] ?? null;

  const handleScore = (value: number) => {
    if (!currentItem) return;
    const newScores = [...scores];
    const existingIdx = newScores.findIndex((s) => s.itemId === currentItem.id);
    const entry: ScoreEntry = { itemId: currentItem.id, domain: currentItem.domain, score: value };
    if (existingIdx >= 0) {
      newScores[existingIdx] = entry;
    } else {
      newScores.push(entry);
    }
    setScores(newScores);

    const isLast = currentIndex === items.length - 1;
    const nowAllAnswered = items.every((item) =>
      item.id === currentItem.id ? true : newScores.some((s) => s.itemId === item.id),
    );

    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
    } else if (nowAllAnswered) {
      handleSubmitWithScores(newScores);
    }
  };

  const handleSubmitWithScores = async (finalScores: ScoreEntry[]) => {
    if (!selectedChildId || !questionnaireQuery.data) return;
    setStep('scoring');
    try {
      const assessment = await createAssessment.mutateAsync({
        childId: selectedChildId,
        input: {
          questionnaireId: questionnaireQuery.data.id,
          scores: finalScores.map((s) => ({ itemId: s.itemId, domain: s.domain, score: s.score })),
        },
      });
      const result = await scoreAssessment.mutateAsync(assessment.id);
      setScoringResult(result);
      setStep('results');
    } catch {
      setStep('assessing');
    }
  };

  const handleConsent = async () => {
    if (!tool) return;
    await recordConsent.mutateAsync(tool);
    setStep('assessing');
  };

  const handleSubmit = async () => {
    await handleSubmitWithScores(scores);
  };

  const currentScore = currentItem
    ? (scores.find((s) => s.itemId === currentItem.id)?.score ?? null)
    : null;

  // --- Render ---

  if (step === 'checking') {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title={toolName} backTo="/questionnaires" />
        <LoadingSpinner />
        <p className="text-center text-sm text-neutral-500 mt-2">라이선스를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (step === 'no_license') {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title={toolName} backTo="/questionnaires" />
        <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sage-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">
            이 도구의 라이선스가 없습니다
          </h2>
          <p className="text-sm text-neutral-500 mb-6">관리자에게 문의하세요.</p>
          <button
            onClick={() => navigate('/questionnaires')}
            className="h-[48px] px-6 rounded-xl bg-primary-500 text-white text-[15px] font-semibold shadow-sage hover:bg-primary-600 transition-all"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  if (step === 'consent') {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title={toolName} backTo="/questionnaires" />
        {/* Modal overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-800">{toolName} 사용 동의</h2>
              {consentDocQuery.data && (
                <p className="text-xs text-neutral-400 mt-1">버전 {consentDocQuery.data.version}</p>
              )}
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {consentDocQuery.isLoading ? (
                <LoadingSpinner size="sm" />
              ) : consentDocQuery.data ? (
                <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {consentDocQuery.data.content}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">동의서를 불러올 수 없습니다.</p>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-100 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">위 내용을 읽고 동의합니다</span>
              </label>
              <button
                onClick={handleConsent}
                disabled={!consentChecked || recordConsent.isPending}
                className="w-full h-[48px] rounded-xl bg-primary-500 text-white text-[15px] font-semibold shadow-sage hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {recordConsent.isPending ? '처리 중...' : '동의 후 시작'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'assessing') {
    if (questionnaireQuery.isLoading || !questionnaireQuery.data) {
      return (
        <div className="max-w-3xl mx-auto">
          <PageHeader title={toolName} backTo="/questionnaires" />
          <LoadingSpinner />
          <p className="text-center text-sm text-neutral-500 mt-2">문항을 불러오고 있습니다...</p>
        </div>
      );
    }

    const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;
    const isLastItem = currentIndex === items.length - 1;
    const allAnswered = items.every((item) => scores.some((s) => s.itemId === item.id));

    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title={toolName}
          subtitle={questionnaireQuery.data.name}
          backTo="/questionnaires"
        />

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
            <span>
              {currentIndex + 1} / {items.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        {currentItem && (
          <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sage-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#7B9FD4]/10 text-[#7B9FD4]">
                {currentItem.domain}
              </span>
              <span className="text-xs text-neutral-400">문항 {currentIndex + 1}</span>
            </div>
            <p className="text-base text-neutral-800 font-medium leading-relaxed mb-6">
              {currentItem.text}
            </p>

            {/* Score buttons */}
            <div
              className={`grid gap-3 ${toolId === 'M_CHAT_R_F' ? 'grid-cols-2' : 'grid-cols-4'}`}
            >
              {getScoreButtons().map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => handleScore(btn.value)}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                    currentScore === btn.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-200 hover:bg-primary-50/50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="h-[44px] px-5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            이전
          </button>

          {isLastItem && allAnswered ? (
            <button
              onClick={handleSubmit}
              disabled={createAssessment.isPending}
              className="h-[44px] px-6 rounded-xl bg-primary-500 text-white text-sm font-semibold shadow-sage hover:bg-primary-600 disabled:opacity-50 transition-all"
            >
              제출하기
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
              disabled={currentIndex === items.length - 1}
              className="h-[44px] px-5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              다음
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'scoring') {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title={toolName} backTo="/questionnaires" />
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" />
          <p className="text-base text-neutral-600 font-medium mt-4">AI가 채점 중입니다...</p>
          <p className="text-sm text-neutral-400 mt-1">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (step === 'results' && scoringResult) {
    const scorePercent =
      scoringResult.maxPossibleScore > 0
        ? (scoringResult.totalScore / scoringResult.maxPossibleScore) * 100
        : 0;

    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title={`${toolName} 결과`} backTo="/questionnaires" />

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sage-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">{toolName}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${getSeverityColor(scoringResult.severity)}`}
            >
              {scoringResult.severity}
            </span>
          </div>

          {/* Score display */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-neutral-600 font-medium">총점</span>
              <span className="text-neutral-800 font-semibold">
                {scoringResult.totalScore} / {scoringResult.maxPossibleScore}
              </span>
            </div>
            <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>

          {/* Interpretation */}
          <div className="bg-primary-50/50 rounded-xl p-4 mb-4">
            <p className="text-sm text-neutral-700 leading-relaxed">
              {scoringResult.interpretation}
            </p>
          </div>

          {/* Clinical description */}
          {scoringResult.clinicalDescription && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">임상적 설명</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {scoringResult.clinicalDescription}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {scoringResult.recommendations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">권장 사항</h3>
              <ul className="space-y-1.5">
                {scoringResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600">
                    <svg
                      className="w-4 h-4 text-primary-500 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Subscale scores */}
        {scoringResult.subscaleScores.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sage-sm p-6 mb-5">
            <h3 className="text-sm font-semibold text-neutral-700 mb-4">하위 척도 점수</h3>
            <div className="space-y-3">
              {scoringResult.subscaleScores.map((sub) => {
                const subPercent = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0;
                return (
                  <div key={sub.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-600 font-medium">{sub.name}</span>
                      <span className="text-neutral-500">
                        {sub.score}/{sub.maxScore}
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7EC8C8] rounded-full transition-all"
                        style={{ width: `${subPercent}%` }}
                      />
                    </div>
                    {sub.interpretation && (
                      <p className="text-xs text-neutral-400 mt-0.5">{sub.interpretation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep('assessing');
              setScores([]);
              setCurrentIndex(0);
              setScoringResult(null);
            }}
            className="flex-1 h-[48px] rounded-xl border-[1.5px] border-primary-500 text-primary-600 text-[15px] font-semibold hover:bg-primary-50 transition-colors"
          >
            다시 평가하기
          </button>
          <button
            onClick={() => navigate('/assessment/history')}
            className="flex-1 h-[48px] rounded-xl bg-primary-500 text-white text-[15px] font-semibold shadow-sage hover:bg-primary-600 transition-all"
          >
            평가 기록 보기
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={toolName} backTo="/questionnaires" />
      <LoadingSpinner />
    </div>
  );
}
