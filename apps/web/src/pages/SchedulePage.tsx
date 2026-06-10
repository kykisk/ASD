import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import {
  CalendarViewMode,
  ScheduleCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  Schedule,
} from '../types/schedule';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  CreateScheduleInput,
} from '../hooks/use-schedules';
import {
  useScheduleSuggestions,
  useAcceptSuggestion,
  type ScheduleSuggestion,
} from '../hooks/use-schedule-ai';
import { useChildStore } from '../stores/child.store';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';
import { ScheduleFormModal } from '../components/calendar/ScheduleFormModal';
import { RecurringEditDialog } from '../components/calendar/RecurringEditDialog';
import { SessionFeedbackModal } from '../components/session-feedback/SessionFeedbackModal';

const ALL_CATEGORIES: ScheduleCategory[] = [
  'THERAPY',
  'EDUCATION',
  'FREE_PLAY',
  'MEAL',
  'SLEEP',
  'OTHER',
];

const SCHEDULE_STEPS = [
  { delay: 0, icon: '📊', text: '최근 일정 분석 중...' },
  { delay: 3000, icon: '🧠', text: 'AI가 패턴을 파악하고 있습니다...' },
  { delay: 8000, icon: '💡', text: '개선 제안을 생성하고 있습니다...' },
  { delay: 15000, icon: '✅', text: '거의 완료...' },
];

function ScheduleAnalysisProgress() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers = SCHEDULE_STEPS.slice(1).map((s, i) =>
      setTimeout(() => setStepIdx(i + 1), s.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const current = SCHEDULE_STEPS[stepIdx];
  const progress = Math.min(((stepIdx + 1) / SCHEDULE_STEPS.length) * 100, 95);

  return (
    <div className="py-4 px-1">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-base">{current.icon}</span>
        <span className="text-sm font-medium text-[#5B8A72] transition-all duration-300">
          {current.text}
        </span>
      </div>
      <div className="h-1.5 bg-[#5B8A72]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#5B8A72] rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [activeCategories, setActiveCategories] = useState<Set<ScheduleCategory>>(
    new Set(ALL_CATEGORIES),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [pendingSave, setPendingSave] = useState<(CreateScheduleInput & { id: string }) | null>(
    null,
  );
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackScheduleId, setFeedbackScheduleId] = useState<string | null>(null);

  const { selectedChildId } = useChildStore();
  const childId = selectedChildId;

  const suggestions = useScheduleSuggestions(childId);
  const acceptSuggestion = useAcceptSuggestion(childId);

  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'month': {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return { start: start.toISOString(), end: end.toISOString() };
      }
      case 'week': {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        return { start: start.toISOString(), end: end.toISOString() };
      }
      case 'day':
        return {
          start: currentDate.toISOString(),
          end: currentDate.toISOString(),
        };
    }
  }, [currentDate, viewMode]);

  const { data: schedules } = useSchedules(childId, dateRange.start, dateRange.end);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter((s) => activeCategories.has(s.category));
  }, [schedules, activeCategories]);

  function handleNavigate(direction: 'prev' | 'next' | 'today') {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const isPrev = direction === 'prev';
    switch (viewMode) {
      case 'month':
        setCurrentDate(isPrev ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(isPrev ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(isPrev ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
    }
  }

  function toggleCategory(category: ScheduleCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function resetCategories() {
    setActiveCategories(new Set(ALL_CATEGORIES));
  }

  const handleEventClick = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule);
    setModalDefaultDate(undefined);
    setModalDefaultTime(undefined);
    setIsModalOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingSchedule(null);
    setModalDefaultDate(currentDate);
    setModalDefaultTime(undefined);
    setIsModalOpen(true);
  }, [currentDate]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  }, []);

  const handleSave = useCallback(
    (data: CreateScheduleInput) => {
      if (data.id) {
        const realId = data.id.includes('_') ? data.id.split('_')[0] : data.id;
        const originalSchedule = schedules?.find((s) => s.id.split('_')[0] === realId);

        if (
          originalSchedule &&
          originalSchedule.recurrenceType !== 'NONE' &&
          data.id.includes('_')
        ) {
          setPendingSave(data as CreateScheduleInput & { id: string });
          setShowRecurringDialog(true);
          handleModalClose();
          return;
        }

        updateSchedule.mutate(data as CreateScheduleInput & { id: string }, {
          onSuccess: () => handleModalClose(),
        });
      } else {
        createSchedule.mutate(data, {
          onSuccess: () => handleModalClose(),
        });
      }
    },
    [schedules, createSchedule, updateSchedule, handleModalClose],
  );

  const handleRecurringChoice = useCallback(
    (mode: 'THIS_ONLY' | 'ALL') => {
      if (!pendingSave) return;
      setShowRecurringDialog(false);
      updateSchedule.mutate(
        { ...pendingSave, editMode: mode },
        {
          onSuccess: () => {
            setPendingSave(null);
          },
        },
      );
    },
    [pendingSave, updateSchedule],
  );

  const handleToggleAiPanel = useCallback(() => {
    setShowAiPanel((prev) => {
      const opening = !prev;
      if (opening && !suggestions.data && !suggestions.isFetching) {
        suggestions.refetch();
      }
      return opening;
    });
  }, [suggestions]);

  const handleDismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(id));
  }, []);

  const handleAcceptSuggestion = useCallback(
    (suggestion: ScheduleSuggestion) => {
      const today = new Date().toISOString().split('T')[0];
      setAcceptingId(suggestion.id);
      acceptSuggestion.mutate(
        { suggestion, targetDate: today },
        {
          onSuccess: () => {
            handleDismissSuggestion(suggestion.id);
            setAcceptingId(null);
          },
          onError: () => setAcceptingId(null),
        },
      );
    },
    [acceptSuggestion, handleDismissSuggestion],
  );

  const visibleSuggestions =
    suggestions.data?.suggestions.filter((s) => !dismissedSuggestions.has(s.id)) || [];

  const handleDeleteSchedule = useCallback(
    (id: string) => {
      deleteSchedule.mutate(id, {
        onSuccess: () => handleModalClose(),
      });
    },
    [deleteSchedule, handleModalClose],
  );

  const handleFeedbackClick = useCallback((schedule: Schedule) => {
    const realId = schedule.id.includes('_') ? schedule.id.split('_')[0] : schedule.id;
    setFeedbackScheduleId(realId);
    setShowFeedbackModal(true);
  }, []);

  const allActive = activeCategories.size === ALL_CATEGORIES.length;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {!childId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          상단에서 아이를 선택하면 일정을 확인할 수 있어요
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">일정</h1>
          <p className="text-sm text-neutral-500 mt-0.5">아이의 일정을 관리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFeedbackScheduleId(null);
              setShowFeedbackModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-semibold bg-[#e8f5ee] text-[#5B8A72] hover:bg-[#d4edde] transition-all"
          >
            <span>📝</span> 수업 피드백 추가
          </button>
          <button
            onClick={handleToggleAiPanel}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all ${
              showAiPanel
                ? 'bg-[#5B8A72] text-white shadow-[0_4px_12px_rgba(91,138,114,0.25)]'
                : 'bg-[#5B8A72]/[0.08] text-[#5B8A72] hover:bg-[#5B8A72]/[0.15]'
            }`}
          >
            <span>🤖</span> AI 스케줄 제안
          </button>
        </div>
      </div>

      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigate={handleNavigate}
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={resetCategories}
          className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
            allActive
              ? 'bg-primary-100 text-primary-700 border-primary-300'
              : 'bg-neutral-50 text-neutral-400 border-neutral-200 hover:bg-neutral-100'
          }`}
        >
          전체
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat];
          const isActive = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${
                isActive
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : 'bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {showAiPanel && (
        <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-white shadow-[0_4px_16px_rgba(91,138,114,0.08)] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          <div className="px-5 py-4 border-b border-[#E8E4DF] bg-[#FDFBF7]">
            <h3 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
              <span>🤖</span> AI 스케줄 개선 제안
            </h3>
            <p className="text-xs text-[#6B7B8D] mt-0.5">최근 평가 데이터 기반</p>
          </div>

          <div className="p-4">
            {suggestions.isFetching && <ScheduleAnalysisProgress />}

            {suggestions.isError && !suggestions.isFetching && (
              <div className="py-6 text-center">
                <p className="text-sm text-red-600 mb-1">제안을 불러올 수 없습니다.</p>
                <p className="text-xs text-[#94A3B4] mb-3">
                  {(suggestions.error as { response?: { data?: { error?: { message?: string } } } })
                    ?.response?.data?.error?.message ??
                    'AI 서비스가 응답하지 않았습니다. 잠시 후 다시 시도해주세요.'}
                </p>
                <button
                  onClick={() => suggestions.refetch()}
                  className="px-4 py-2 text-sm font-medium text-[#5B8A72] hover:bg-[#5B8A72]/[0.08] rounded-[8px] transition-colors"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!suggestions.isFetching && !suggestions.isError && visibleSuggestions.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-[#94A3B4]">
                  {suggestions.data
                    ? '모든 제안을 확인했어요'
                    : '분석할 일정이나 평가 데이터가 없어요'}
                </p>
              </div>
            )}

            {!suggestions.isFetching && visibleSuggestions.length > 0 && (
              <div className="space-y-3">
                {visibleSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="px-4 py-3.5 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] hover:border-[#5B8A72]/30 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <span className="text-base shrink-0">
                        {suggestion.type === 'ADD'
                          ? '➕'
                          : suggestion.type === 'MODIFY'
                            ? '✏️'
                            : '🗑️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2C3E50]">{suggestion.title}</p>
                        <p className="text-xs text-[#6B7B8D] mt-0.5">{suggestion.reason}</p>
                        {suggestion.suggestedTime && (
                          <p className="text-xs text-[#94A3B4] mt-1">
                            {suggestion.suggestedTime}
                            {suggestion.durationMinutes && ` · ${suggestion.durationMinutes}분`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-7">
                      {suggestion.type === 'ADD' && (
                        <button
                          onClick={() => handleAcceptSuggestion(suggestion)}
                          disabled={acceptingId === suggestion.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#5B8A72] rounded-[8px] hover:bg-[#3D6B54] disabled:opacity-50 transition-colors"
                        >
                          {acceptingId === suggestion.id ? '처리 중...' : '수락'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissSuggestion(suggestion.id)}
                        className="px-3 py-1.5 text-xs font-medium text-[#6B7B8D] hover:text-[#2C3E50] hover:bg-[#E8E4DF]/60 rounded-[8px] transition-colors"
                      >
                        {suggestion.type === 'ADD' ? '무시' : '확인'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {suggestions.data?.summary && visibleSuggestions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E8E4DF]">
                <p className="text-xs text-[#6B7B8D]">
                  <span className="font-medium text-[#2C3E50]">전체 요약:</span>{' '}
                  {suggestions.data.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            schedules={filteredSchedules}
            onEventClick={handleEventClick}
            onFeedbackClick={handleFeedbackClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            schedules={filteredSchedules}
            onEventClick={handleEventClick}
            onFeedbackClick={handleFeedbackClick}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            schedules={filteredSchedules}
            onEventClick={handleEventClick}
            onFeedbackClick={handleFeedbackClick}
          />
        )}
      </div>

      <button
        onClick={handleAddNew}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-300/40 hover:bg-primary-600 hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center z-40"
        aria-label="일정 추가"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={handleDeleteSchedule}
        editSchedule={editingSchedule}
        childId={childId ?? ''}
        existingSchedules={schedules}
        defaultDate={modalDefaultDate}
        defaultTime={modalDefaultTime}
      />

      <RecurringEditDialog
        isOpen={showRecurringDialog}
        onSelect={handleRecurringChoice}
        onCancel={() => {
          setShowRecurringDialog(false);
          setPendingSave(null);
        }}
      />

      <SessionFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          setFeedbackScheduleId(null);
        }}
        defaultScheduleId={feedbackScheduleId}
      />
    </div>
  );
}
