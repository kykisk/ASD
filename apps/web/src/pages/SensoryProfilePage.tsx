import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import {
  useSensoryProfiles,
  useLatestSensoryProfile,
  useCreateSensoryProfile,
  SensoryProfile,
} from '../hooks/use-sensory';
import { DomainRadarChart } from '../components/charts/DomainRadarChart';
import { PageHeader, ErrorState, EmptyState, LoadingSpinner } from '../components/ui';

const CHANNELS = [
  { key: 'visual', label: '시각' },
  { key: 'auditory', label: '청각' },
  { key: 'tactile', label: '촉각' },
  { key: 'vestibular', label: '전정감각' },
  { key: 'proprioception', label: '고유수용감각' },
  { key: 'olfactory', label: '후각' },
] as const;

const SCALE_LABELS = ['과민', '', '보통', '', '둔감'];

export function SensoryProfilePage() {
  const { selectedChildId } = useChildStore();
  const { data: profiles, isLoading, isError, refetch } = useSensoryProfiles(selectedChildId);
  const { data: latest } = useLatestSensoryProfile(selectedChildId);
  const createProfile = useCreateSensoryProfile();

  const [form, setForm] = useState<Record<string, number>>({
    visual: 3,
    auditory: 3,
    tactile: 3,
    vestibular: 3,
    proprioception: 3,
    olfactory: 3,
  });
  const [notes, setNotes] = useState('');
  const [lastResult, setLastResult] = useState<SensoryProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = () => {
    if (!selectedChildId) return;
    createProfile.mutate(
      {
        childId: selectedChildId,
        input: {
          visual: form.visual,
          auditory: form.auditory,
          tactile: form.tactile,
          vestibular: form.vestibular,
          proprioception: form.proprioception,
          olfactory: form.olfactory,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: (result) => {
          setLastResult(result);
          showToast('감각 프로파일이 저장되었습니다.');
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
          description="상단에서 아이를 선택한 후 감각 프로파일을 기록할 수 있습니다."
        />
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const radarData = latest
    ? CHANNELS.map((ch) => ({
        domain: ch.key,
        label: ch.label,
        score: latest[ch.key as keyof SensoryProfile] as number,
        maxScore: 5,
      }))
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <PageHeader title="감각 프로파일" subtitle="6가지 감각 채널의 민감도를 평가합니다." />

      {/* Guide Card */}
      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-primary-700 mb-3">
          이 정보가 어떻게 활용되나요?
        </h4>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-5">🎯</span>
            <p className="text-sm text-neutral-600">
              <span className="font-semibold text-neutral-700">커리큘럼 자동 맞춤화</span>
              {' — '}AI가 매일 생성하는 커리큘럼에 감각 특성이 반영돼요
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-5">📚</span>
            <p className="text-sm text-neutral-600">
              <span className="font-semibold text-neutral-700">연구 자료 개인화</span>
              {' — '}AI 맞춤 연구 요약 시 감각 프로파일이 함께 분석돼요
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-5">✨</span>
            <p className="text-sm text-neutral-600">
              <span className="font-semibold text-neutral-700">즉시 AI 활동 추천</span>
              {' — '}저장하면 바로 감각 통합 활동 3가지를 AI가 추천해줘요
            </p>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      {radarData && (
        <div className="bg-white rounded-2xl border border-[#E8E4DF] p-6">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4 text-center">
            최신 감각 프로파일
          </h3>
          <DomainRadarChart domains={radarData} size={260} />
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-6 space-y-5">
        <h3 className="text-sm font-semibold text-neutral-800">새 프로파일 작성</h3>

        {CHANNELS.map((ch) => (
          <div key={ch.key}>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{ch.label}</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm({ ...form, [ch.key]: val })}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                    form[ch.key] === val
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  {val}
                  {SCALE_LABELS[val - 1] && (
                    <span className="block text-[10px] mt-0.5 opacity-80">
                      {SCALE_LABELS[val - 1]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            메모 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="특이사항이나 관찰 내용..."
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={createProfile.isPending}
          className="w-full py-3 px-4 rounded-xl bg-primary-500 text-white font-semibold shadow-sage-sm hover:bg-primary-600 active:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all min-h-[48px]"
        >
          {createProfile.isPending ? '저장 중...' : '프로파일 저장'}
        </button>
      </div>

      {/* AI Recommendations */}
      {lastResult?.aiRecommendations && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 animate-fade-in">
          <h4 className="text-sm font-semibold text-green-800 mb-2">AI 추천</h4>
          <p className="text-sm text-green-700 leading-relaxed whitespace-pre-line">
            {lastResult.aiRecommendations}
          </p>
        </div>
      )}

      {/* History */}
      {profiles && profiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700">기록 목록</h3>
          {profiles.slice(0, 5).map((profile: SensoryProfile) => (
            <div key={profile.id} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-400">
                  {new Date(profile.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CHANNELS.map((ch) => (
                  <div key={ch.key} className="text-center">
                    <p className="text-xs text-neutral-500">{ch.label}</p>
                    <p className="text-sm font-bold text-neutral-700">
                      {profile[ch.key as keyof SensoryProfile] as number}
                    </p>
                  </div>
                ))}
              </div>
              {profile.aiRecommendations && (
                <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 line-clamp-2">
                  {profile.aiRecommendations}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {profiles && profiles.length === 0 && !lastResult && (
        <EmptyState
          title="아직 감각 프로파일이 없습니다"
          description="위 폼을 통해 첫 프로파일을 작성해보세요."
        />
      )}
    </div>
  );
}
