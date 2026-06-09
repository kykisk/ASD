import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import { useChildren } from '../hooks/use-children';
import { useMyFamily } from '../hooks/use-families';
import { useGrowthData } from '../hooks/use-growth';
import type { GrowthData } from '../hooks/use-growth';
import { GrowthLineChart } from '../components/charts/GrowthLineChart';
import { DomainRadarChart } from '../components/charts/DomainRadarChart';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { MilestoneTimeline } from '../components/charts/MilestoneTimeline';
import type { Milestone } from '../components/charts/MilestoneTimeline';

type TabKey = 'trend' | 'domain' | 'milestone';
type DayRange = 7 | 30 | 90;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'trend', label: '성장 추이' },
  { key: 'domain', label: '도메인 비교' },
  { key: 'milestone', label: '마일스톤' },
];

const MOCK_MILESTONES: Milestone[] = [
  {
    id: '1',
    title: '두 단어 문장으로 의사 표현하기',
    achievedAt: '2025-05-10',
    domain: 'communication',
  },
  {
    id: '2',
    title: '또래와 5분간 협동 놀이 유지',
    achievedAt: '2025-05-05',
    domain: 'social',
  },
  {
    id: '3',
    title: '감정 단어 5개 이상 사용하기',
    achievedAt: '2025-04-28',
    domain: 'emotional',
  },
  {
    id: '4',
    title: '한 발로 3초 이상 서 있기',
    achievedAt: null,
    targetDate: '2025-06-15',
    domain: 'motor',
  },
  {
    id: '5',
    title: '색깔 4가지 이상 구별하기',
    achievedAt: null,
    targetDate: '2025-06-30',
    domain: 'cognitive',
  },
];

const DOMAIN_LIST = [
  { domain: 'COMMUNICATION', label: '의사소통', color: '#7B9FD4' },
  { domain: 'SOCIAL', label: '사회성', color: '#E8A87C' },
  { domain: 'MOTOR', label: '운동', color: '#9B8EC4' },
  { domain: 'COGNITIVE', label: '인지', color: '#7EC8C8' },
  { domain: 'EMOTIONAL', label: '정서', color: '#F2B880' },
];

const MOCK_GROWTH_DATA: GrowthData = {
  childId: 'mock',
  dateRange: {
    from: new Date(Date.now() - 13 * 2 * 86400000).toISOString(),
    to: new Date().toISOString(),
  },
  domains: DOMAIN_LIST.map((d) => ({
    domain: d.domain,
    label: d.label,
    color: d.color,
    data: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i) * 2);
      return {
        date: date.toISOString().split('T')[0],
        score: 2.5 + Math.random() * 2,
        assessmentId: `mock-${i}`,
      };
    }),
  })),
  overall: Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i) * 2);
    return {
      date: date.toISOString().split('T')[0],
      score: 2.8 + Math.random() * 1.5,
      assessmentId: `mock-${i}`,
    };
  }),
  weeklyAverages: [
    { week: '1주', score: 2.8 },
    { week: '2주', score: 3.1 },
    { week: '3주', score: 3.4 },
    { week: '4주', score: 3.6 },
  ],
  monthlyAverages: [
    { month: '1월', score: 2.4 },
    { month: '2월', score: 2.7 },
    { month: '3월', score: 3.0 },
    { month: '4월', score: 3.3 },
    { month: '5월', score: 3.5 },
  ],
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 2px 16px rgba(91, 138, 114, 0.06)',
  border: '1px solid rgba(91, 138, 114, 0.08)',
};

function EmptyState() {
  return (
    <div
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(91, 138, 114, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          fontSize: 24,
        }}
      >
        📊
      </div>
      <p style={{ fontSize: 15, color: '#475569', fontWeight: 500 }}>성장 데이터가 없어요</p>
      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>평가를 시작해보세요.</p>
    </div>
  );
}

export function GrowthPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('trend');
  const [dayRange, setDayRange] = useState<DayRange>(30);
  const { selectedChildId } = useChildStore();
  const { data: family } = useMyFamily();
  const { data: children } = useChildren(family?.id);
  const { data: growthData, isLoading } = useGrowthData(selectedChildId, dayRange);

  const selectedChild = children?.find((c) => c.id === selectedChildId);
  const displayData = growthData || MOCK_GROWTH_DATA;
  const hasRealData = !!growthData;

  return (
    <div className="max-w-4xl mx-auto">
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: 4,
          }}
        >
          성장 기록
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          {selectedChild ? `${selectedChild.name}의 발달 성장 추이` : '아이를 선택해주세요'}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(91, 138, 114, 0.05)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === tab.key ? '#5B8A72' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#64748b',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 48 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(91,138,114,0.15)',
              borderTopColor: '#5B8A72',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: 13, color: '#64748b' }}>데이터를 불러오는 중...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!isLoading && !selectedChildId && <EmptyState />}

      {!isLoading && selectedChildId && activeTab === 'trend' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 6 }}>
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setDayRange(days)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: dayRange === days ? 'rgba(91, 138, 114, 0.12)' : 'transparent',
                  color: dayRange === days ? '#5B8A72' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: dayRange === days ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {days}일
              </button>
            ))}
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>발달 추이 그래프</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                최근 {dayRange}일 · 영역별 점수 변화
              </p>
            </div>
            {!hasRealData && !growthData ? (
              <GrowthLineChart data={displayData} height={260} />
            ) : (
              <GrowthLineChart data={displayData} height={260} />
            )}
          </div>
        </div>
      )}

      {!isLoading && selectedChildId && activeTab === 'domain' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>영역별 현황</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>현재 도메인 점수 분포</p>
            </div>
            <DomainRadarChart
              domains={displayData.domains.map((d) => ({
                domain: d.domain,
                label: d.label,
                score: d.data[d.data.length - 1]?.score ?? 0,
                maxScore: 5,
              }))}
            />
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>기간별 비교</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>전체 평균 점수 변화</p>
            </div>
            <ComparisonChart
              weeklyData={displayData.weeklyAverages}
              monthlyData={displayData.monthlyAverages}
            />
          </div>
        </div>
      )}

      {!isLoading && selectedChildId && activeTab === 'milestone' && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>발달 마일스톤</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>달성 및 목표 추적</p>
          </div>
          <MilestoneTimeline
            milestones={MOCK_MILESTONES}
            childName={selectedChild?.name || '아이'}
          />
        </div>
      )}
    </div>
  );
}
