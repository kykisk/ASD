import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import {
  useWellbeingHistory,
  useWellbeingStats,
  useCreateWellbeingCheckin,
  WellbeingEntry,
} from '../hooks/use-wellbeing';
import { PageHeader, ErrorState, EmptyState, LoadingSpinner } from '../components/ui';

const MOOD_EMOJIS = ['😫', '😕', '😐', '🙂', '😊'];
const MOOD_LABELS = ['매우 힘듦', '힘듦', '보통', '좋음', '매우 좋음'];

function BurnoutBadge({ risk }: { risk?: string }) {
  if (!risk) return null;
  const colors: Record<string, string> = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels: Record<string, string> = {
    LOW: '낮음',
    MEDIUM: '주의',
    HIGH: '높음',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[risk] || colors.LOW}`}
    >
      번아웃 위험: {labels[risk] || risk}
    </span>
  );
}

export function WellbeingPage() {
  const { selectedChildId } = useChildStore();
  const {
    data: history,
    isLoading: histLoading,
    isError: histError,
    refetch,
  } = useWellbeingHistory(selectedChildId);
  const { data: stats } = useWellbeingStats(selectedChildId);
  const checkin = useCreateWellbeingCheckin();

  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [notes, setNotes] = useState('');
  const [lastAiMessage, setLastAiMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = () => {
    if (!selectedChildId) return;
    checkin.mutate(
      { childId: selectedChildId, input: { mood, stressLevel: stress, notes: notes || undefined } },
      {
        onSuccess: (entry) => {
          setLastAiMessage(entry.aiMessage || null);
          setNotes('');
          setMood(3);
          setStress(3);
          showToast('체크인이 저장되었습니다.');
        },
        onError: () => showToast('저장에 실패했습니다.'),
      },
    );
  };

  if (!selectedChildId) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          title="아이를 먼저 선택해주세요"
          description="상단에서 아이를 선택한 후 웰빙 체크인을 할 수 있습니다."
        />
      </div>
    );
  }

  if (histLoading) return <LoadingSpinner fullPage />;
  if (histError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <PageHeader title="부모 웰빙 체크인" subtitle="오늘 나의 컨디션을 기록해보세요." />

      {/* Check-in Form */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">기분</label>
          <div className="flex items-center justify-between gap-2">
            {MOOD_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMood(i + 1)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  mood === i + 1
                    ? 'bg-primary-50 border-2 border-primary-400 scale-110'
                    : 'border-2 border-transparent hover:bg-neutral-50'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] text-neutral-500">{MOOD_LABELS[i]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            스트레스 <span className="text-neutral-400 font-normal">({stress}/5)</span>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>낮음</span>
            <span>높음</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            메모 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="오늘의 느낌을 자유롭게 적어주세요..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={checkin.isPending}
          className="w-full py-3 px-4 rounded-xl bg-primary-500 text-white font-semibold shadow-sage-sm hover:bg-primary-600 active:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all min-h-[48px]"
        >
          {checkin.isPending ? '저장 중...' : '체크인 저장'}
        </button>
      </div>

      {/* AI Message */}
      {lastAiMessage && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 animate-fade-in">
          <p className="text-sm text-green-800 leading-relaxed">
            <span className="font-semibold">AI 메시지:</span> {lastAiMessage}
          </p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">
              {stats.avgMood?.toFixed(1) || '-'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">평균 기분</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {stats.avgStress?.toFixed(1) || '-'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">평균 스트레스</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
            <p className="text-2xl font-bold text-neutral-700">{stats.checkInCount || 0}</p>
            <p className="text-xs text-neutral-500 mt-1">총 체크인</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
            <BurnoutBadge risk={stats.burnoutRisk} />
          </div>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700">최근 기록</h3>
          {history.slice(0, 7).map((entry: WellbeingEntry) => (
            <div key={entry.id} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{MOOD_EMOJIS[(entry.mood || 3) - 1]}</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-700">
                      기분 {entry.mood}/5 · 스트레스 {entry.stressLevel}/5
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(entry.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
                {entry.burnoutRisk && <BurnoutBadge risk={entry.burnoutRisk} />}
              </div>
              {entry.notes && <p className="mt-2 text-sm text-neutral-600">{entry.notes}</p>}
              {entry.aiMessage && (
                <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  {entry.aiMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {history && history.length === 0 && (
        <EmptyState
          title="아직 체크인 기록이 없습니다"
          description="위 폼을 통해 첫 체크인을 해보세요."
        />
      )}
    </div>
  );
}
