import { useState, useEffect } from 'react';
import { useChildStore } from '../stores/child.store';
import { useChildren } from '../hooks/use-children';
import { useMyFamily } from '../hooks/use-families';
import {
  useTodayCurriculum,
  useGenerateCurriculum,
  useLogActivity,
  useConfirmCurriculum,
  useRegenerateCurriculum,
  useDeleteCurriculum,
  useCurriculumActivities,
  getAiErrorMessage,
} from '../hooks/use-curriculum';
import { CurriculumGenerateModal } from '../components/curriculum/CurriculumGenerateModal';
import type { GenerateCurriculumInput } from '../hooks/use-curriculum';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { CurriculumHistoryPanel } from '../components/curriculum/CurriculumHistoryPanel';
import type {
  CurriculumActivity,
  DifficultyLevel,
  ActivityResult,
  ActivityLog,
} from '../types/curriculum';
import { DOMAIN_LABELS, DOMAIN_COLORS, DIFFICULTY_LABELS } from '../types/curriculum';
import './curriculum-page.css';

const PROGRESS_STEPS = [
  { label: '아이 발달 데이터 분석 중', duration: 3000 },
  { label: 'AI 커리큘럼 설계 중', duration: 8000 },
  { label: '활동 생성 및 검증 중', duration: 6000 },
  { label: '최적화 및 저장 중', duration: 3000 },
];

function GeneratingProgress({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = PROGRESS_STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 200;
      const pct = Math.min((elapsed / totalDuration) * 95, 95);
      setProgress(pct);

      let cumulative = 0;
      for (let i = 0; i < PROGRESS_STEPS.length; i++) {
        cumulative += PROGRESS_STEPS[i].duration;
        if (elapsed < cumulative) {
          setStep(i);
          break;
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 bg-white rounded-2xl border border-[#E8E4DF] p-6 shadow-[0_4px_16px_rgba(91,138,114,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-[#2C3E50]">🤖 AI 커리큘럼 생성 중</span>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E4DF] text-[#6B7B8D] hover:bg-neutral-50 transition-colors"
        >
          중지
        </button>
      </div>

      <div className="w-full h-2 bg-[#E8E4DF] rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-[#5B8A72] to-[#7EC8C8] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin text-[#5B8A72]" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-[#6B7B8D]">
            {PROGRESS_STEPS[step]?.label ?? '처리 중...'}
          </span>
        </div>
        <span className="text-xs text-[#94A3B4]">{Math.round(progress)}%</span>
      </div>

      <div className="mt-4 flex gap-1">
        {PROGRESS_STEPS.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full h-1 rounded-full ${i <= step ? 'bg-[#5B8A72]' : 'bg-[#E8E4DF]'}`}
            />
            <span className={`text-[10px] ${i <= step ? 'text-[#5B8A72]' : 'text-[#94A3B4]'}`}>
              {i + 1}단계
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ActivityCardProps {
  activity: CurriculumActivity;
  index: number;
  curriculumId: string;
  existingLog?: ActivityLog;
}

function ActivityCard({ activity, index, curriculumId, existingLog }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [selectedResult, setSelectedResult] = useState<ActivityResult | null>(
    existingLog?.result ?? null,
  );
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(!!existingLog);

  const logActivity = useLogActivity();

  const domainColor = DOMAIN_COLORS[activity.domain];

  const difficultyStyles: Record<DifficultyLevel, string> = {
    EASY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HARD: 'bg-red-50 text-red-700 border-red-200',
  };

  const resultButtons: {
    result: ActivityResult;
    label: string;
    icon: string;
    activeClass: string;
  }[] = [
    {
      result: 'SUCCESS',
      label: '완료',
      icon: '✓',
      activeClass: 'bg-primary-500 text-white border-primary-500',
    },
    {
      result: 'PARTIAL',
      label: '부분완료',
      icon: '◐',
      activeClass: 'bg-amber-500 text-white border-amber-500',
    },
    {
      result: 'SKIPPED',
      label: '건너뛰기',
      icon: '→',
      activeClass: 'bg-neutral-400 text-white border-neutral-400',
    },
  ];

  function handleResultClick(result: ActivityResult) {
    if (saved) return;
    setSelectedResult(result);
    setShowNotes(true);
  }

  async function handleSave() {
    if (!selectedResult) return;
    try {
      await logActivity.mutateAsync({
        curriculumId,
        activityIndex: index,
        activityTitle: activity.title,
        result: selectedResult,
        notes: notes.trim() || undefined,
      });
      setSaved(true);
      setShowNotes(false);
    } catch (err) {
      console.error('활동 저장 실패:', err);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  }

  const cardTintClass = saved
    ? selectedResult === 'SUCCESS'
      ? 'border-l-4 border-l-primary-400'
      : selectedResult === 'PARTIAL'
        ? 'border-l-4 border-l-amber-400'
        : 'border-l-4 border-l-neutral-300'
    : '';

  return (
    <div
      className={`bg-white rounded-xl border border-neutral-200 shadow-sage-sm overflow-hidden transition-all duration-200 ${cardTintClass}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <span className="text-lg font-semibold text-neutral-300 tabular-nums w-6 shrink-0">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
              style={{
                backgroundColor: `${domainColor}15`,
                color: domainColor,
                borderColor: `${domainColor}30`,
              }}
            >
              {DOMAIN_LABELS[activity.domain]}
            </span>

            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${difficultyStyles[activity.difficultyLevel]}`}
            >
              {DIFFICULTY_LABELS[activity.difficultyLevel]}
            </span>

            <span className="text-xs text-neutral-400">{activity.durationMin}분</span>
          </div>

          <h3 className="text-sm font-semibold text-neutral-800 truncate">{activity.title}</h3>
        </div>

        {saved && selectedResult && (
          <span
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
              selectedResult === 'SUCCESS'
                ? 'bg-primary-100 text-primary-700'
                : selectedResult === 'PARTIAL'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {selectedResult === 'SUCCESS'
              ? '✓ 완료'
              : selectedResult === 'PARTIAL'
                ? '◐ 부분'
                : '→ 건너뜀'}
          </span>
        )}

        <svg
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 animate-fade-in">
          <p className="text-sm text-neutral-600 leading-relaxed pl-9">{activity.description}</p>

          {activity.steps.length > 0 && (
            <div className="pl-9">
              <p className="text-xs font-medium text-neutral-500 mb-2">진행 단계</p>
              <ol className="space-y-1.5">
                {activity.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-neutral-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-100 text-neutral-500 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {activity.materials && activity.materials.length > 0 && (
            <div className="pl-9">
              <p className="text-xs font-medium text-neutral-500 mb-2">준비물</p>
              <div className="flex flex-wrap gap-1.5">
                {activity.materials.map((material, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-neutral-100 text-xs text-neutral-600 border border-neutral-200"
                  >
                    {material}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pl-9">
            <p className="text-xs font-medium text-neutral-500 mb-1">성공 기준</p>
            <p className="text-sm text-neutral-600">{activity.successCriteria}</p>
          </div>

          <div className="pl-9 pt-2 border-t border-neutral-100">
            <div className="flex flex-wrap gap-2">
              {resultButtons.map((btn) => {
                const isActive = selectedResult === btn.result;
                return (
                  <button
                    key={btn.result}
                    onClick={() => handleResultClick(btn.result)}
                    disabled={saved}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all duration-150 min-h-[40px] ${
                      isActive
                        ? btn.activeClass
                        : saved
                          ? 'bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
                    }`}
                  >
                    <span>{btn.icon}</span>
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>

            {showNotes && !saved && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="메모를 남겨보세요 (선택사항)"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none transition-colors"
                  rows={2}
                />
                <button
                  onClick={handleSave}
                  disabled={logActivity.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sage-sm disabled:opacity-60"
                >
                  {logActivity.isPending ? (
                    <svg className="w-4 h-4 animate-spin-slow" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : null}
                  저장
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CurriculumSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <Skeleton className="w-40 mb-2" height="h-5" />
        <Skeleton className="w-full" height="h-4" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6" height="h-6" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="w-16" height="h-5" rounded="rounded-md" />
                <Skeleton className="w-12" height="h-5" rounded="rounded-md" />
              </div>
              <Skeleton className="w-48" height="h-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CurriculumPage() {
  const { selectedChildId } = useChildStore();
  const { data: family } = useMyFamily();
  const { data: children } = useChildren(family?.id);
  const { data: curriculum, isLoading, error, refetch } = useTodayCurriculum(selectedChildId);
  const { data: activityLogs } = useCurriculumActivities(curriculum?.id ?? null);
  const generateCurriculum = useGenerateCurriculum();
  const confirmCurriculum = useConfirmCurriculum();
  const regenerateCurriculum = useRegenerateCurriculum();
  const deleteCurriculum = useDeleteCurriculum();

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const selectedChild = children?.find((c) => c.id === selectedChildId);
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const handleGenerate = () => {
    if (!selectedChildId) return;
    setShowGenerateModal(true);
  };

  const handleGenerateSubmit = (input: GenerateCurriculumInput) => {
    if (!selectedChildId) return;
    setShowGenerateModal(false);
    generateCurriculum.mutate(
      { childId: selectedChildId, input },
      {
        onError: (err) => {
          const msg = getAiErrorMessage(err);
          if (msg) alert(msg);
        },
      },
    );
  };

  const handleRegenerate = (curriculumId: string) => {
    regenerateCurriculum.mutate(curriculumId, {
      onError: (err) => {
        const msg = getAiErrorMessage(err);
        if (msg) alert(msg);
      },
    });
  };

  const allCompleted =
    curriculum?.activities && activityLogs && activityLogs.length >= curriculum.activities.length;

  if (!selectedChildId) {
    return (
      <div>
        <PageHeader title="오늘의 커리큘럼" subtitle={dateStr} />
        <EmptyState
          icon={
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
              />
            </svg>
          }
          title="상단에서 아이를 선택해주세요"
          description="커리큘럼을 확인하려면 먼저 아이를 선택해야 합니다"
        />
      </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div>
          <PageHeader
            title="🤖 오늘의 커리큘럼"
            subtitle={`${selectedChild?.name ?? ''} · ${dateStr}`}
          />
          <CurriculumSkeleton />
        </div>
      );
    }

    if (error || !curriculum) {
      const is404 = (error as { response?: { status?: number } })?.response?.status === 404;

      if (is404 || !curriculum) {
        return (
          <div>
            <PageHeader
              title="🤖 오늘의 커리큘럼"
              subtitle={`${selectedChild?.name ?? ''} · ${dateStr}`}
            />
            <EmptyState
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              }
              title="오늘의 커리큘럼이 아직 없어요"
              description="AI가 아이의 발달 단계에 맞는 활동을 추천해드릴게요"
              action={{
                label: generateCurriculum.isPending ? '생성 중...' : '✨ AI 커리큘럼 생성하기',
                onClick: () => handleGenerate(),
              }}
            />
            {generateCurriculum.isPending && (
              <GeneratingProgress onCancel={() => generateCurriculum.reset()} />
            )}
          </div>
        );
      }

      return (
        <div>
          <PageHeader
            title="🤖 오늘의 커리큘럼"
            subtitle={`${selectedChild?.name ?? ''} · ${dateStr}`}
          />
          <ErrorState
            title="커리큘럼을 불러올 수 없습니다"
            message="잠시 후 다시 시도해주세요"
            onRetry={() => refetch()}
          />
        </div>
      );
    }

    if (curriculum.status === 'FAILED') {
      return (
        <div>
          <PageHeader
            title="🤖 오늘의 커리큘럼"
            subtitle={`${selectedChild?.name ?? ''} · ${dateStr}`}
          />
          <ErrorState
            title="커리큘럼 생성에 실패했습니다"
            message="다시 시도하시면 새로운 커리큘럼을 만들어 드릴게요"
            onRetry={() => handleRegenerate(curriculum.id)}
          />
        </div>
      );
    }

    return (
      <div>
        <PageHeader
          title="🤖 오늘의 커리큘럼"
          subtitle={`${selectedChild?.name ?? ''} · ${dateStr}`}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRegenerate(curriculum.id)}
                disabled={regenerateCurriculum.isPending || deleteCurriculum.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors min-h-[40px] disabled:opacity-60"
              >
                {regenerateCurriculum.isPending ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                )}
                {regenerateCurriculum.isPending ? '재생성 중...' : '재생성'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('커리큘럼을 삭제할까요?')) {
                    deleteCurriculum.mutate(curriculum.id);
                  }
                }}
                disabled={deleteCurriculum.isPending || regenerateCurriculum.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-500 bg-white border border-red-200 hover:bg-red-50 transition-colors min-h-[40px] disabled:opacity-60"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {deleteCurriculum.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          }
        />

        {regenerateCurriculum.isPending && (
          <GeneratingProgress onCancel={() => regenerateCurriculum.reset()} />
        )}

        {curriculum.weeklyGoal && !regenerateCurriculum.isPending && (
          <Card className="mb-5 border-primary-100 bg-primary-50/30">
            <div className="flex items-start gap-3">
              <span className="text-lg">📌</span>
              <div>
                <p className="text-xs font-medium text-primary-600 mb-0.5">이번 주 목표</p>
                <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                  {curriculum.weeklyGoal}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {curriculum.activities.map((activity, i) => {
            const log = activityLogs?.find((l) => l.activityIndex === i);
            return (
              <ActivityCard
                key={i}
                activity={activity}
                index={i}
                curriculumId={curriculum.id}
                existingLog={log}
              />
            );
          })}
        </div>

        {allCompleted && (
          <div className="mt-6 text-center py-6 bg-primary-50/50 rounded-xl border border-primary-100 animate-fade-slide-in">
            <p className="text-lg font-semibold text-primary-700">오늘도 수고했어요 🌱</p>
            <p className="text-sm text-neutral-500 mt-1">
              아이와 함께한 시간이 소중한 성장이 됩니다
            </p>
          </div>
        )}

        {curriculum.status === 'GENERATED' && (
          <div className="mt-5">
            <button
              onClick={() => confirmCurriculum.mutate(curriculum.id)}
              disabled={confirmCurriculum.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sage min-h-[48px] disabled:opacity-60"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              📋 커리큘럼 확인하기
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <CurriculumGenerateModal
        isOpen={showGenerateModal}
        isPending={generateCurriculum.isPending}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateSubmit}
      />
      <div className="curriculum-page-layout">
        <div className="curriculum-page-grid">
          <div className="curriculum-page-content">{renderContent()}</div>
          <div className="curriculum-page-history">
            <CurriculumHistoryPanel childId={selectedChildId} />
          </div>
        </div>
      </div>
    </>
  );
}
