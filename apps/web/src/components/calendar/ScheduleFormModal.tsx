import { useEffect, useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Schedule,
  ScheduleCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../../types/schedule';
import { ConflictWarning } from './ConflictWarning';
import { useConflictCheck } from '../../hooks/use-conflict-check';

const RECURRENCE_OPTIONS = [
  { value: 'NONE', label: '없음' },
  { value: 'DAILY', label: '매일' },
  { value: 'WEEKLY', label: '매주' },
  { value: 'SPECIFIC_DAYS', label: '특정 요일' },
  { value: 'CUSTOM', label: '사용자 지정' },
] as const;

const WEEKDAYS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
] as const;

const PRESET_COLORS = [
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#ef4444',
  '#10b981',
];

const scheduleFormSchema = z
  .object({
    title: z
      .string()
      .min(1, '제목을 입력해주세요.')
      .max(100, '제목은 100자 이내로 입력해주세요.'),
    category: z.enum([
      'THERAPY',
      'EDUCATION',
      'FREE_PLAY',
      'MEAL',
      'SLEEP',
      'OTHER',
    ]),
    isAllDay: z.boolean(),
    startDate: z.string().min(1, '시작일을 선택해주세요.'),
    startTimeStr: z.string(),
    endDate: z.string().min(1, '종료일을 선택해주세요.'),
    endTimeStr: z.string(),
    recurrenceType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'SPECIFIC_DAYS', 'CUSTOM']),
    recurrenceDays: z.array(z.number()),
    recurrenceEndDate: z.string(),
    location: z.string(),
    notes: z.string(),
    color: z.string(),
  })
  .refine(
    (data) => {
      if (data.isAllDay) return true;
      const start = new Date(`${data.startDate}T${data.startTimeStr}`);
      const end = new Date(`${data.endDate}T${data.endTimeStr}`);
      return end > start;
    },
    { message: '종료 시간은 시작 시간 이후여야 합니다.', path: ['endTimeStr'] }
  );

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Schedule, 'id'> & { id?: string; location?: string; notes?: string; recurrenceDays?: number[]; recurrenceEndDate?: string }) => void;
  onDelete?: (id: string) => void;
  editSchedule?: Schedule | null;
  childId: string;
  existingSchedules?: Schedule[];
  defaultDate?: Date;
  defaultTime?: string;
}

function getDefaultValues(
  editSchedule?: Schedule | null,
  defaultDate?: Date,
  defaultTime?: string
): ScheduleFormData {
  if (editSchedule) {
    const start = new Date(editSchedule.startTime);
    const end = new Date(editSchedule.endTime);
    return {
      title: editSchedule.title,
      category: editSchedule.category,
      isAllDay: editSchedule.isAllDay,
      startDate: format(start, 'yyyy-MM-dd'),
      startTimeStr: format(start, 'HH:mm'),
      endDate: format(end, 'yyyy-MM-dd'),
      endTimeStr: format(end, 'HH:mm'),
      recurrenceType: editSchedule.recurrenceType,
      recurrenceDays: [],
      recurrenceEndDate: '',
      location: '',
      notes: editSchedule.description || '',
      color: editSchedule.color || '',
    };
  }

  const base = defaultDate || new Date();
  const dateStr = format(base, 'yyyy-MM-dd');
  const timeStr = defaultTime || format(base, 'HH:mm');
  const endHour = parseInt(timeStr.split(':')[0]) + 1;
  const endTimeStr = `${String(endHour).padStart(2, '0')}:${timeStr.split(':')[1]}`;

  return {
    title: '',
    category: 'THERAPY',
    isAllDay: false,
    startDate: dateStr,
    startTimeStr: timeStr,
    endDate: dateStr,
    endTimeStr: endHour < 24 ? endTimeStr : '23:59',
    recurrenceType: 'NONE',
    recurrenceDays: [],
    recurrenceEndDate: '',
    location: '',
    notes: '',
    color: '',
  };
}

export function ScheduleFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editSchedule,
  childId,
  existingSchedules,
  defaultDate,
  defaultTime,
}: ScheduleFormModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: getDefaultValues(editSchedule, defaultDate, defaultTime),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(editSchedule, defaultDate, defaultTime));
      setShowDeleteConfirm(false);
    }
  }, [isOpen, editSchedule, defaultDate, defaultTime, reset]);

  const isAllDay = watch('isAllDay');
  const startDate = watch('startDate');
  const startTimeStr = watch('startTimeStr');
  const endDate = watch('endDate');
  const endTimeStr = watch('endTimeStr');
  const recurrenceType = watch('recurrenceType');
  const selectedColor = watch('color');

  const computedStartTime =
    startDate && startTimeStr
      ? new Date(`${startDate}T${startTimeStr}`).toISOString()
      : null;
  const computedEndTime =
    endDate && endTimeStr
      ? new Date(`${endDate}T${endTimeStr}`).toISOString()
      : null;

  const conflicts = useConflictCheck(
    existingSchedules,
    childId,
    isAllDay ? null : computedStartTime,
    isAllDay ? null : computedEndTime,
    editSchedule?.id
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const onSubmit = (data: ScheduleFormData) => {
    const startTime = data.isAllDay
      ? new Date(`${data.startDate}T00:00:00`).toISOString()
      : new Date(`${data.startDate}T${data.startTimeStr}`).toISOString();
    const endTime = data.isAllDay
      ? new Date(`${data.endDate}T23:59:59`).toISOString()
      : new Date(`${data.endDate}T${data.endTimeStr}`).toISOString();

    onSave({
      id: editSchedule?.id,
      childId,
      title: data.title,
      description: data.notes || undefined,
      category: data.category,
      startTime,
      endTime,
      isAllDay: data.isAllDay,
      recurrenceType: data.recurrenceType,
      color: data.color || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      recurrenceDays:
        data.recurrenceType === 'SPECIFIC_DAYS' ? data.recurrenceDays : undefined,
      recurrenceEndDate:
        data.recurrenceType !== 'NONE' && data.recurrenceEndDate
          ? data.recurrenceEndDate
          : undefined,
    });
  };

  const handleDelete = () => {
    if (editSchedule?.id && onDelete) {
      onDelete(editSchedule.id);
    }
  };

  if (!isOpen) return null;

  const isEditMode = !!editSchedule;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-800">
            {isEditMode ? '일정 수정' : '새 일정'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="일정 제목을 입력하세요"
              className={`w-full px-4 py-2.5 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                errors.title ? 'border-red-300' : 'border-neutral-200'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              카테고리
            </label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(CATEGORY_LABELS) as ScheduleCategory[]).map(
                    (cat) => {
                      const colors = CATEGORY_COLORS[cat];
                      const isSelected = field.value === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => field.onChange(cat)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-primary-200`
                              : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            />
          </div>

          <Controller
            name="isAllDay"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-neutral-700">종일</span>
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    field.value ? 'bg-primary-500' : 'bg-neutral-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      field.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                시작일
              </label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            {!isAllDay && (
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  시작 시간
                </label>
                <input
                  type="time"
                  {...register('startTimeStr')}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                종료일
              </label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            {!isAllDay && (
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  종료 시간
                </label>
                <input
                  type="time"
                  {...register('endTimeStr')}
                  className={`w-full px-3 py-2 rounded-lg border bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                    errors.endTimeStr ? 'border-red-300' : 'border-neutral-200'
                  }`}
                />
                {errors.endTimeStr && (
                  <p className="mt-1 text-xs text-red-500">{errors.endTimeStr.message}</p>
                )}
              </div>
            )}
          </div>

          {!isAllDay && <ConflictWarning conflicts={conflicts} />}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              반복
            </label>
            <select
              {...register('recurrenceType')}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {recurrenceType === 'SPECIFIC_DAYS' && (
            <Controller
              name="recurrenceDays"
              control={control}
              render={({ field }) => (
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isSelected = field.value.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? field.value.filter((d) => d !== day.value)
                            : [...field.value, day.value];
                          field.onChange(next);
                        }}
                        className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-primary-500 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          )}

          {recurrenceType !== 'NONE' && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                반복 종료일
              </label>
              <input
                type="date"
                {...register('recurrenceEndDate')}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              장소
            </label>
            <input
              {...register('location')}
              placeholder="장소 (선택사항)"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              메모
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="메모 (선택사항)"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              색상
            </label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(field.value === c ? '' : c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        field.value === c
                          ? 'border-neutral-800 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="ml-2 flex items-center gap-1.5">
                    <input
                      type="color"
                      value={selectedColor || '#14b8a6'}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        </form>

        <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100 bg-neutral-50/50">
          <div>
            {isEditMode && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">삭제하시겠습니까?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs font-medium text-neutral-600 bg-neutral-200 rounded-md hover:bg-neutral-300 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    삭제
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary-500 rounded-lg shadow-sm shadow-primary-200/50 hover:bg-primary-600 active:bg-primary-700 transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
