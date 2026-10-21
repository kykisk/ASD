import { useSearchParams } from 'react-router-dom';
import { useChildStore } from '../stores/child.store';
import { GrowthPage } from './GrowthPage';
import { InsightsPage } from './InsightsPage';
import { DigestTab } from './SessionFeedbackPage';
import { RecordsTimeline } from '../components/growth/RecordsTimeline';

type GrowthTab = 'change' | 'records' | 'weekly';

const TABS: Array<{ key: GrowthTab; label: string }> = [
  { key: 'change', label: '변화 그래프' },
  { key: 'records', label: '기록 모아보기' },
  { key: 'weekly', label: 'AI 주간 요약' },
];

/** 성장: 변화 그래프(구 성장 기록) · 기록 모아보기(구 일일피드백) · AI 주간 요약(구 AI 분석) */
export function GrowthHubPage() {
  const [params, setParams] = useSearchParams();
  const { selectedChildId } = useChildStore();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'change') as GrowthTab;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-neutral-800">성장</h1>
      <div
        role="tablist"
        data-tour="growth-tabs"
        className="flex gap-1 bg-[#F2F0EC] rounded-xl p-1 self-start"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setParams(t.key === 'change' ? {} : { tab: t.key }, { replace: true })}
            className={`h-[38px] px-[18px] rounded-[9px] text-sm ${
              t.key === tab ? 'bg-white font-bold text-neutral-800 shadow-sm' : 'text-neutral-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'change' && <GrowthPage embedded />}
      {tab === 'records' &&
        (selectedChildId ? (
          <RecordsTimeline childId={selectedChildId} />
        ) : (
          <p className="text-sm text-neutral-600">상단에서 아이를 선택해주세요</p>
        ))}
      {tab === 'weekly' && (
        <div className="flex flex-col gap-8">
          <InsightsPage embedded />
          {selectedChildId && (
            <section className="max-w-[800px] w-full mx-auto">
              <DigestTab childId={selectedChildId} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
