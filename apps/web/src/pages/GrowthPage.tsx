import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildStore } from '../stores/child.store';
import { useChildren } from '../hooks/use-children';
import { useMyFamily } from '../hooks/use-families';
import { useGrowthData } from '../hooks/use-growth';
import { useAssessments } from '../hooks/use-assessments';
import { useClinicalReports, useDeleteClinicalReport } from '../hooks/use-clinical-reports';
import type { ClinicalReport } from '../hooks/use-clinical-reports';
import { ClinicalReportModal } from '../components/clinical/ClinicalReportModal';
import type { GrowthData } from '../hooks/use-growth';
import type { Assessment } from '../hooks/use-assessments';
import { GrowthLineChart } from '../components/charts/GrowthLineChart';
import { DomainRadarChart } from '../components/charts/DomainRadarChart';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { MilestoneTimeline } from '../components/charts/MilestoneTimeline';
import type { Milestone } from '../components/charts/MilestoneTimeline';

type TabKey = 'trend' | 'domain' | 'milestone' | 'clinical';
type DayRange = 7 | 30 | 90;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'trend', label: '성장 추이' },
  { key: 'domain', label: '도메인 비교' },
  { key: 'milestone', label: '마일스톤' },
  { key: 'clinical', label: '임상 평가' },
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

const TOOL_LABELS: Record<string, string> = {
  M_CHAT_R_F: 'M-CHAT-R/F',
  CARS_2: 'CARS-2',
  ABC: 'ABC',
  ADOS_2: 'ADOS-2',
  SCQ: 'SCQ',
};

function getLicensedSeverity(
  tool: string,
  score: number,
): { label: string; color: string; bg: string } {
  if (tool === 'CARS_2') {
    if (score < 30) return { label: '비자폐', color: '#5B8A72', bg: '#e8f5ee' };
    if (score < 37) return { label: '경증-중등도', color: '#D4A800', bg: '#fef9e7' };
    return { label: '중증', color: '#E88B8B', bg: '#fef2f2' };
  }
  if (tool === 'M_CHAT_R_F') {
    if (score <= 2) return { label: '낮은 위험', color: '#5B8A72', bg: '#e8f5ee' };
    if (score <= 7) return { label: '중간 위험', color: '#D4A800', bg: '#fef9e7' };
    return { label: '높은 위험', color: '#E88B8B', bg: '#fef2f2' };
  }
  if (tool === 'ABC') {
    return score > 0
      ? { label: '유의미', color: '#F0A86E', bg: '#fff7ed' }
      : { label: '정상 범위', color: '#5B8A72', bg: '#e8f5ee' };
  }
  return { label: `${score}점`, color: '#94A3B8', bg: '#f8fafc' };
}

export function GrowthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('trend');
  const [dayRange, setDayRange] = useState<DayRange>(30);
  const { selectedChildId } = useChildStore();
  const { data: family } = useMyFamily();
  const { data: children } = useChildren(family?.id);
  const { data: growthData, isLoading } = useGrowthData(selectedChildId, dayRange);
  const { data: allAssessments } = useAssessments(selectedChildId);

  const [showReportModal, setShowReportModal] = useState(false);
  const [clinicalSubTab, setClinicalSubTab] = useState<'licensed' | 'external'>('external');
  const { data: clinicalReports } = useClinicalReports(selectedChildId);
  const deleteReport = useDeleteClinicalReport(selectedChildId);

  const licensedAssessments = (allAssessments ?? []).filter(
    (a: Assessment) => a.questionnaire?.type === 'LICENSED' && a.totalScore !== null,
  );

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

      {!isLoading && selectedChildId && activeTab === 'clinical' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* 서브탭 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '4px',
              background: '#f1f5f9',
              borderRadius: 12,
            }}
          >
            {(
              [
                { key: 'external', label: '외부 평가 보고서', count: clinicalReports?.length ?? 0 },
                { key: 'licensed', label: '라이선스 도구', count: licensedAssessments.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setClinicalSubTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: clinicalSubTab === tab.key ? 600 : 400,
                  background: clinicalSubTab === tab.key ? '#fff' : 'transparent',
                  color: clinicalSubTab === tab.key ? '#1e293b' : '#64748b',
                  boxShadow: clinicalSubTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: clinicalSubTab === tab.key ? '#5B8A72' : '#cbd5e1',
                      color: clinicalSubTab === tab.key ? '#fff' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 라이선스 도구 탭 */}
          {clinicalSubTab === 'licensed' && (
            <div style={cardStyle}>
              <div
                style={{
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    임상 평가 기록
                  </h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    라이선스 표준화 도구 (CARS-2, M-CHAT-R/F, ABC)
                  </p>
                </div>
                <button
                  onClick={() => navigate('/questionnaires')}
                  style={{
                    fontSize: 12,
                    color: '#5B8A72',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + 새 평가
                </button>
              </div>

              {licensedAssessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>임상 평가 기록이 없습니다</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    질문지 탭에서 라이선스 도구로 평가를 시작해보세요
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {licensedAssessments.map((a: Assessment) => {
                    const tool = a.questionnaire?.licensedTool ?? '';
                    const toolLabel = TOOL_LABELS[tool] ?? tool;
                    const sev = getLicensedSeverity(tool, a.totalScore ?? 0);
                    const date = new Date(a.createdAt);
                    const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 12,
                          border: '1px solid #e8e4df',
                          background: '#fdfbf7',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: '#9B8EC420',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            🏥
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                              {toolLabel}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                              {dateStr} · 총점 {a.totalScore}점
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 8,
                            color: sev.color,
                            background: sev.bg,
                          }}
                        >
                          {sev.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 외부 기관 평가 보고서 탭 */}
          {clinicalSubTab === 'external' && (
            <div style={cardStyle}>
              <div
                style={{
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    외부 기관 평가 보고서
                  </h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    언어, 인지, 작업치료 등 외부 평가 결과
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(true)}
                  style={{
                    fontSize: 12,
                    color: '#5B8A72',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + 보고서 추가
                </button>
              </div>

              {!clinicalReports || clinicalReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>외부 평가 보고서가 없습니다</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    '+ 보고서 추가'로 임상 결과를 기록하세요.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {clinicalReports.map((report: ClinicalReport) => {
                    const dateStr = report.assessmentDate
                      ? formatReportDate(report.assessmentDate)
                      : '';
                    const metaParts = [dateStr, report.evaluatorType, report.institution].filter(
                      Boolean,
                    );
                    const totalLabel =
                      report.totalScore !== null
                        ? `${report.totalScore}${report.totalScoreUnit || '점'}`
                        : null;
                    const visibleSections = report.sectionScores.slice(0, 3);

                    return (
                      <div
                        key={report.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 12,
                          border: '1px solid #e8e4df',
                          background: '#fdfbf7',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                              {report.assessmentTool}
                            </div>
                            {metaParts.length > 0 && (
                              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                                {metaParts.join(' · ')}
                                {totalLabel && (
                                  <span
                                    style={{ marginLeft: 6, color: '#5B8A72', fontWeight: 600 }}
                                  >
                                    {totalLabel}
                                  </span>
                                )}
                              </div>
                            )}
                            {visibleSections.length > 0 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#6B7B8D',
                                  marginTop: 6,
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 4,
                                }}
                              >
                                {visibleSections.map((s, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                      background: '#E8F5EE',
                                      fontSize: 11,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {s.name} {s.score !== null ? `${s.score}${s.unit || '점'}` : ''}
                                    {s.percentile !== null && s.percentile !== undefined
                                      ? `(${s.percentile}%)`
                                      : ''}
                                  </span>
                                ))}
                                {report.sectionScores.length > 3 && (
                                  <span
                                    style={{ padding: '2px 6px', fontSize: 11, color: '#94a3b8' }}
                                  >
                                    +{report.sectionScores.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            {report.clinicalFindings && (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: '#6B7B8D',
                                  marginTop: 6,
                                  lineHeight: 1.5,
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                소견: "{report.clinicalFindings}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm('이 보고서를 삭제하시겠습니까?')) {
                                deleteReport.mutate(report.id);
                              }
                            }}
                            style={{
                              marginLeft: 12,
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: 'none',
                              background: 'none',
                              fontSize: 11,
                              color: '#94a3b8',
                              cursor: 'pointer',
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ClinicalReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        childId={selectedChildId}
      />
    </div>
  );
}

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
