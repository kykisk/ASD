import { useState, useMemo, useCallback } from 'react';
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
import { useChildStore } from '../stores/child.store';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';
import { ScheduleFormModal } from '../components/calendar/ScheduleFormModal';

const ALL_CATEGORIES: ScheduleCategory[] = [
  'THERAPY',
  'EDUCATION',
  'FREE_PLAY',
  'MEAL',
  'SLEEP',
  'OTHER',
];

export function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [activeCategories, setActiveCategories] = useState<Set<ScheduleCategory>>(
    new Set(ALL_CATEGORIES)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();

  const { selectedChildId } = useChildStore();
  const childId = selectedChildId;

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
        updateSchedule.mutate(data as CreateScheduleInput & { id: string }, {
          onSuccess: () => handleModalClose(),
        });
      } else {
        createSchedule.mutate(data, {
          onSuccess: () => handleModalClose(),
        });
      }
    },
    [createSchedule, updateSchedule, handleModalClose]
  );

  const handleDeleteSchedule = useCallback(
    (id: string) => {
      deleteSchedule.mutate(id, {
        onSuccess: () => handleModalClose(),
      });
    },
    [deleteSchedule, handleModalClose]
  );

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

      <div className="mt-2">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            schedules={filteredSchedules}
            onEventClick={handleEventClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            schedules={filteredSchedules}
            onEventClick={handleEventClick}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            schedules={filteredSchedules}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      <button
        onClick={handleAddNew}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-300/40 hover:bg-primary-600 hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center z-40"
        aria-label="일정 추가"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={handleDeleteSchedule}
        editSchedule={editingSchedule}
        childId={childId}
        existingSchedules={schedules}
        defaultDate={modalDefaultDate}
        defaultTime={modalDefaultTime}
      />
    </div>
  );
}
