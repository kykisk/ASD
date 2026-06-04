import { useState, useEffect, useCallback } from 'react';
import { useChildStore } from '../stores/child.store';
import {
  useEmergencyGuides,
  useEmergencyGuide,
  useEmergencyHistory,
  useLogEmergencyEvent,
  EmergencyEvent,
} from '../hooks/use-emergency';
import { PageHeader, ErrorState, EmptyState, LoadingSpinner } from '../components/ui';

const GUIDE_TYPES = [
  { key: 'MELTDOWN', label: '멜트다운' },
  { key: 'SELF_INJURY', label: '자해' },
  { key: 'AGGRESSION', label: '공격' },
  { key: 'ELOPEMENT', label: '도주' },
  { key: 'SENSORY_OVERLOAD', label: '감각과부하' },
  { key: 'OTHER', label: '기타' },
];

function BreathingGuide({
  inhale,
  hold,
  exhale,
}: {
  inhale: number;
  hold: number;
  exhale: number;
}) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [count, setCount] = useState(inhale);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          setPhase((p) => {
            if (p === 'inhale') {
              setCount(hold);
              return 'hold';
            }
            if (p === 'hold') {
              setCount(exhale);
              return 'exhale';
            }
            setCount(inhale);
            return 'inhale';
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, inhale, hold, exhale]);

  const phaseLabel = { inhale: '들이쉬기', hold: '멈추기', exhale: '내쉬기' };
  const phaseColor = { inhale: 'text-blue-600', hold: 'text-amber-600', exhale: 'text-green-600' };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
      <h4 className="text-sm font-semibold text-neutral-700 mb-3">호흡 가이드</h4>
      {active ? (
        <div className="space-y-2">
          <p className={`text-3xl font-bold ${phaseColor[phase]}`}>{count}</p>
          <p className={`text-lg font-medium ${phaseColor[phase]}`}>{phaseLabel[phase]}</p>
          <p className="text-xs text-neutral-500">
            들이쉬기 {inhale}초 · 멈추기 {hold}초 · 내쉬기 {exhale}초
          </p>
          <button
            onClick={() => setActive(false)}
            className="mt-2 px-4 py-2 text-sm rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            중지
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setActive(true);
            setPhase('inhale');
            setCount(inhale);
          }}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          호흡 시작
        </button>
      )}
    </div>
  );
}

function CalmTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
      <h4 className="text-sm font-semibold text-neutral-700 mb-3">진정 타이머</h4>
      <p className="text-4xl font-bold text-amber-700 font-mono">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </p>
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={() => setRunning(!running)}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            running
              ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {running ? '일시정지' : '시작'}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(seconds);
          }}
          className="px-4 py-2 text-sm rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}

export function EmergencyGuidePage() {
  const { selectedChildId } = useChildStore();
  const {
    data: guides,
    isLoading: guidesLoading,
    isError: guidesError,
    refetch,
  } = useEmergencyGuides();
  const { data: history } = useEmergencyHistory(selectedChildId);
  const logEvent = useLogEmergencyEvent();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { data: guide } = useEmergencyGuide(selectedType);

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    type: 'MELTDOWN',
    severity: '',
    trigger: '',
    durationMin: '',
    notes: '',
  });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleLogEvent = () => {
    if (!selectedChildId) return;
    logEvent.mutate(
      {
        childId: selectedChildId,
        input: {
          type: eventForm.type,
          severity: eventForm.severity || undefined,
          trigger: eventForm.trigger || undefined,
          durationMin: eventForm.durationMin ? Number(eventForm.durationMin) : undefined,
          notes: eventForm.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          showToast('이벤트가 기록되었습니다.');
          setShowEventModal(false);
          setEventForm({ type: 'MELTDOWN', severity: '', trigger: '', durationMin: '', notes: '' });
        },
        onError: () => showToast('기록에 실패했습니다.'),
      },
    );
  };

  if (guidesLoading) return <LoadingSpinner fullPage />;
  if (guidesError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <PageHeader
        title="비상 대응 가이드"
        subtitle="위기 상황 시 단계별 대응을 안내합니다."
        action={
          selectedChildId ? (
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 shadow-sm transition-colors min-h-[44px]"
            >
              이벤트 기록
            </button>
          ) : undefined
        }
      />

      {/* Guide Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {GUIDE_TYPES.map((gt) => (
          <button
            key={gt.key}
            onClick={() => setSelectedType(gt.key)}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
              selectedType === gt.key
                ? 'bg-primary-50 border-primary-400 text-primary-700'
                : 'bg-white border-[#E8E4DF] text-neutral-600 hover:border-primary-200 hover:bg-primary-50/50'
            }`}
          >
            {(guides as Record<string, { title: string }> | undefined)?.[gt.key]?.title || gt.label}
          </button>
        ))}
      </div>

      {/* Selected Guide Content */}
      {guide && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E8E4DF] p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{guide.title}</h3>
            <ol className="space-y-3">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-neutral-700 pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guide.breathingGuide && (
              <BreathingGuide
                inhale={guide.breathingGuide.inhale}
                hold={guide.breathingGuide.hold}
                exhale={guide.breathingGuide.exhale}
              />
            )}
            {guide.calmTimerSec && <CalmTimer seconds={guide.calmTimerSec} />}
          </div>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700">최근 이벤트</h3>
          {history.slice(0, 10).map((event: EmergencyEvent) => (
            <div key={event.id} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-700">
                    {GUIDE_TYPES.find((g) => g.key === event.type)?.label || event.type}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(event.createdAt).toLocaleDateString('ko-KR')}
                    {event.durationMin && ` · ${event.durationMin}분`}
                  </p>
                </div>
                {event.severity && (
                  <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                    {event.severity}
                  </span>
                )}
              </div>
              {event.trigger && (
                <p className="mt-2 text-xs text-neutral-500">유발 요인: {event.trigger}</p>
              )}
              {event.notes && <p className="mt-1 text-xs text-neutral-500">{event.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Event Log Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-sage-lg border border-neutral-200 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-800">이벤트 기록</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">유형</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {GUIDE_TYPES.map((gt) => (
                    <option key={gt.key} value={gt.key}>
                      {gt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">심각도</label>
                <select
                  value={eventForm.severity}
                  onChange={(e) => setEventForm({ ...eventForm, severity: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">선택 안함</option>
                  <option value="MILD">경미</option>
                  <option value="MODERATE">보통</option>
                  <option value="SEVERE">심각</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  유발 요인
                </label>
                <input
                  value={eventForm.trigger}
                  onChange={(e) => setEventForm({ ...eventForm, trigger: e.target.value })}
                  placeholder="무엇이 원인이었나요?"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  지속 시간 (분)
                </label>
                <input
                  type="number"
                  value={eventForm.durationMin}
                  onChange={(e) => setEventForm({ ...eventForm, durationMin: e.target.value })}
                  placeholder="예: 15"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">메모</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  placeholder="추가 메모..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogEvent}
                  disabled={logEvent.isPending}
                  className="flex-1 py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {logEvent.isPending ? '저장 중...' : '기록하기'}
                </button>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-6 py-3 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
