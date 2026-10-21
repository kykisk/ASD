import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChildStore } from '../stores/child.store';
import {
  useTodayCurriculum,
  useCurriculumActivities,
  useGenerateCurriculum,
  getAiErrorMessage,
} from '../hooks/use-curriculum';
import { useDailyRecord } from '../hooks/use-daily-record';
import { useWeeklyInsight } from '../hooks/use-insights';
import { useDashboard } from '../hooks/use-dashboard';
import { ActivityDetailPanel } from '../components/today/ActivityDetailPanel';
import { DailyRecordModal } from '../components/today/DailyRecordModal';
import { hasSeenTour, runTour } from '../tours/engine';
import { tourSteps } from '../tours/definitions';
import type { ActivityResult } from '../types/curriculum';
import { DOMAIN_LABELS } from '../types/curriculum';

const RESULT_LABELS: Record<ActivityResult, string> = {
  SUCCESS: '잘했어요',
  PARTIAL: '조금 했어요',
  FAILED: '못 했어요',
  SKIPPED: '건너뛰었어요',
};

const RESULT_DOT: Record<ActivityResult, string> = {
  SUCCESS: 'bg-primary-500',
  PARTIAL: 'bg-[#F5D76E]',
  FAILED: 'bg-[#F0A86E]',
  SKIPPED: 'bg-[#D9D4CC]',
};

export function TodayPage() {
  const navigate = useNavigate();
  const { selectedChildId } = useChildStore();
  const { data: curriculum, isLoading } = useTodayCurriculum(selectedChildId);
  const { data: logs } = useCurriculumActivities(curriculum?.id ?? null);
  const { data: record } = useDailyRecord(selectedChildId);
  const { data: insight } = useWeeklyInsight(selectedChildId);
  const { data: dashboard } = useDashboard(selectedChildId);
  const generate = useGenerateCurriculum();
  const [selected, setSelected] = useState(0);
  const [recordOpen, setRecordOpen] = useState(false);

  const activities = curriculum?.activities ?? [];
  const logByIndex = new Map((logs ?? []).map((l) => [l.activityIndex, l]));
  const doneCount = activities.filter((_, i) => logByIndex.has(i)).length;
  const recorded = !!record && (!!record.scores || record.feedbacks.length > 0);

  // 처음 열면 아직 기록 안 한 첫 활동을 보여줌
  useEffect(() => {
    if (activities.length === 0) return;
    const firstOpen = activities.findIndex((_, i) => !logByIndex.has(i));
    setSelected(firstOpen === -1 ? 0 : firstOpen);
    // 커리큘럼이 바뀔 때만 다시 고름
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum?.id, logs === undefined]);

  // 처음 들어온 사람에게 한 번 따라하기 투어를 보여줌 (활동이 준비된 뒤)
  useEffect(() => {
    if (isLoading || activities.length === 0 || hasSeenTour('today')) return;
    const timer = window.setTimeout(() => runTour('today', tourSteps('today')), 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, activities.length]);

  async function handleGenerate() {
    if (!selectedChildId) return;
    try {
      await generate.mutateAsync({ childId: selectedChildId });
    } catch (err) {
      alert(getAiErrorMessage(err) ?? '활동을 만들지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  }

  if (!selectedChildId) {
    return (
      <div className="max-w-md mx-auto text-center py-24 flex flex-col items-center gap-3">
        <h1 className="text-xl font-bold text-neutral-800">아이를 먼저 등록해주세요</h1>
        <p className="text-sm text-neutral-600">
          아이에 대해 알려주시면 오늘 집에서 할 활동을 만들어 드려요
        </p>
        <button
          type="button"
          onClick={() => navigate('/children')}
          className="mt-2 h-12 px-6 rounded-xl bg-primary-700 text-white font-bold"
        >
          아이 등록하기
        </button>
      </div>
    );
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const schedules = dashboard?.today.schedules ?? [];
  const current = activities[selected];

  return (
    <div className="max-w-[1320px] mx-auto flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-end gap-2">
        <div>
          <p className="text-sm text-neutral-500">{dateLabel}</p>
          <h1 className="text-[26px] font-bold text-neutral-800">오늘도 함께해요</h1>
        </div>
        <div className="flex items-center gap-4">
          {schedules.length > 0 && (
            <p className="text-sm text-neutral-600">
              오늘 일정 · {schedules.map((s) => `${s.time} ${s.title}`).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)] gap-5 items-start">
        <div className="flex flex-col gap-3.5">
          <section
            data-tour="today-activities"
            className="bg-white rounded-2xl border border-neutral-200 p-[18px] flex flex-col gap-1"
          >
            <div className="flex justify-between items-baseline pb-2">
              <h2 className="text-[17px] font-bold text-neutral-800">오늘 집에서 할 활동</h2>
              {activities.length > 0 && (
                <span className="text-[13px] font-medium text-primary-600">
                  {doneCount} / {activities.length} 완료
                </span>
              )}
            </div>
            {isLoading ? (
              <p className="text-sm text-neutral-500 py-4">불러오는 중…</p>
            ) : activities.length === 0 ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-sm text-neutral-600 leading-relaxed">
                  아직 오늘 활동이 없어요. 아이 정보와 지난 기록을 바탕으로 만들어 드릴게요.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generate.isPending}
                  className="h-12 rounded-xl bg-primary-700 text-white font-bold disabled:opacity-60"
                >
                  {generate.isPending ? '만드는 중… (30초 정도 걸려요)' : '오늘 활동 만들기'}
                </button>
              </div>
            ) : (
              <>
                <div className="h-1.5 rounded-full bg-primary-50 mb-1.5">
                  <div
                    className="h-1.5 rounded-full bg-primary-500 transition-all"
                    style={{ width: `${(doneCount / activities.length) * 100}%` }}
                  />
                </div>
                {activities.map((activity, i) => {
                  const log = logByIndex.get(i);
                  const active = i === selected;
                  return (
                    <button
                      key={i}
                      type="button"
                      data-tour="activity-item"
                      onClick={() => setSelected(i)}
                      aria-current={active}
                      className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                        active
                          ? 'bg-primary-50 outline outline-2 outline-primary-500'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <span
                        className={`w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold ${
                          log ? RESULT_DOT[log.result] : 'border-2 border-[#C9C3BA]'
                        }`}
                        aria-hidden="true"
                      >
                        {log?.result === 'SUCCESS' ? '✓' : ''}
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span
                          className={`text-[15px] font-medium truncate ${log ? 'text-neutral-500' : 'text-neutral-800'}`}
                        >
                          {activity.title}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {DOMAIN_LABELS[activity.domain] ?? activity.domain} ·{' '}
                          {activity.durationMin}분{log ? ` · ${RESULT_LABELS[log.result]}` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </section>

          <button
            type="button"
            data-tour="record-button"
            onClick={() => setRecordOpen(true)}
            className={`rounded-2xl px-[18px] py-4 text-left flex flex-col gap-0.5 ${
              recorded
                ? 'bg-primary-50 border border-primary-500 text-primary-700'
                : 'bg-primary-700 text-white'
            }`}
          >
            <span className="text-base font-bold">
              {recorded ? '오늘 기록 완료' : '오늘 하루 기록하기'}
            </span>
            <span className={`text-[13px] ${recorded ? '' : 'opacity-90'}`}>
              {recorded ? '더 적을 일이 있으면 눌러주세요' : '1분이면 돼요 · 수업 피드백도 여기서'}
            </span>
          </button>

          {insight?.summary && (
            <section className="bg-white rounded-2xl border border-neutral-200 px-[18px] py-4 flex flex-col gap-1.5">
              <h2 className="text-[15px] font-bold text-neutral-800">이번 주 이렇게 달라졌어요</h2>
              <p className="text-sm text-neutral-800 leading-relaxed">{insight.summary}</p>
              {insight.recommendations[0] && (
                <p className="text-sm text-neutral-800 leading-relaxed">
                  다음엔: {insight.recommendations[0]}
                </p>
              )}
              <Link
                to="/growth?tab=weekly"
                className="text-xs text-neutral-500 hover:text-primary-700 mt-1"
              >
                AI가 이번 주 기록을 바탕으로 정리했어요 · 자세히 보기
              </Link>
            </section>
          )}

          <div className="flex justify-center gap-6 py-1">
            <Link to="/guide" className="text-sm text-primary-700 underline">
              처음이세요? 사용 가이드
            </Link>
            <Link to="/dashboard" className="text-sm text-primary-700 underline">
              자세한 대시보드 보기
            </Link>
          </div>
        </div>

        {curriculum && current ? (
          <ActivityDetailPanel
            curriculumId={curriculum.id}
            activity={current}
            index={selected}
            total={activities.length}
            log={logByIndex.get(selected)}
            onSaved={() => {
              const next = activities.findIndex((_, i) => i > selected && !logByIndex.has(i));
              if (next !== -1) setSelected(next);
            }}
          />
        ) : (
          <section className="bg-white rounded-2xl border border-dashed border-neutral-300 min-h-[320px] hidden lg:flex items-center justify-center text-sm text-neutral-500">
            오늘 활동을 만들면 여기에서 방법을 보고 바로 기록할 수 있어요
          </section>
        )}
      </div>

      {recordOpen && (
        <DailyRecordModal
          childId={selectedChildId}
          today={record}
          onClose={() => setRecordOpen(false)}
        />
      )}
    </div>
  );
}
