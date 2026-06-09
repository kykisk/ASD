import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildStore } from '../stores/child.store';
import { useAssessments, type Assessment } from '../hooks/use-assessments';
import { useClinicalReports, useDeleteClinicalReport } from '../hooks/use-clinical-reports';
import type { ClinicalReport } from '../hooks/use-clinical-reports';
import { ClinicalReportModal } from '../components/clinical/ClinicalReportModal';
import { PageHeader } from '../components/ui';

const LICENSED_TOOLS = [
  {
    id: 'M_CHAT_R_F',
    name: 'M-CHAT-R/F',
    description: '18~24개월 자폐 조기 선별 체크리스트',
    available: true,
  },
  { id: 'CARS_2', name: 'CARS-2', description: '아동기 자폐 평가 척도 2판', available: true },
  { id: 'ABC', name: 'ABC', description: '이상행동 체크리스트', available: true },
  { id: 'ADOS_2', name: 'ADOS-2', description: '자폐 관찰 진단 (전문가 전용)', available: false },
  { id: 'SCQ', name: 'SCQ', description: '사회적 의사소통 질문지', available: false },
];

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function formatReportDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function ClinicalPage() {
  const navigate = useNavigate();
  const { selectedChildId } = useChildStore();
  const { data: allAssessments } = useAssessments(selectedChildId);
  const { data: clinicalReports } = useClinicalReports(selectedChildId);
  const deleteReport = useDeleteClinicalReport(selectedChildId);
  const [showReportModal, setShowReportModal] = useState(false);

  const licensedAssessments = (allAssessments ?? []).filter(
    (a: Assessment) => a.questionnaire?.type === 'LICENSED',
  );

  const latestByTool = (allAssessments ?? [])
    .filter((a: Assessment) => a.questionnaire?.type === 'LICENSED' && a.totalScore !== null)
    .reduce<Record<string, Assessment>>((acc, a) => {
      const t = a.questionnaire?.licensedTool ?? '';
      if (!t) return acc;
      if (!acc[t] || new Date(a.createdAt) > new Date(acc[t].createdAt)) acc[t] = a;
      return acc;
    }, {});

  if (!selectedChildId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader title="임상 평가" subtitle="공인 평가 도구 및 외부 기관 결과서 관리" />
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-4xl mb-3">🏥</div>
          <p className="text-[15px] text-neutral-600 font-medium">아이를 먼저 선택해주세요</p>
          <p className="text-sm text-neutral-400 mt-1">
            좌측 메뉴에서 아이를 선택하면 임상 평가를 관리할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <PageHeader title="임상 평가" subtitle="공인 평가 도구 및 외부 기관 결과서 관리" />

      {/* Timeline Section */}
      <section>
        <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <span>🕐</span> 임상 평가 타임라인
        </h2>
        <div className="rounded-2xl border border-[#E8E4DF] bg-white p-6 shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          {(() => {
            interface TimelineEvent {
              id: string;
              date: Date;
              kind: 'licensed' | 'external';
              title: string;
              score: number | null;
              scoreUnit?: string;
              severity?: { label: string; color: string; bg: string };
            }

            const licensedItems = (allAssessments ?? []).filter(
              (a: Assessment) => a.questionnaire?.type === 'LICENSED',
            );

            const events: TimelineEvent[] = [
              ...licensedItems.map((a: Assessment) => ({
                id: a.id,
                date: new Date(a.createdAt),
                kind: 'licensed' as const,
                title:
                  TOOL_LABELS[a.questionnaire?.licensedTool ?? ''] ??
                  a.questionnaire?.name ??
                  '평가',
                score: a.totalScore,
                severity:
                  a.totalScore != null
                    ? getLicensedSeverity(a.questionnaire?.licensedTool ?? '', a.totalScore)
                    : undefined,
              })),
              ...(clinicalReports ?? []).map((r: ClinicalReport) => ({
                id: r.id,
                date: new Date(r.assessmentDate ?? r.createdAt),
                kind: 'external' as const,
                title: r.assessmentTool,
                score: r.totalScore,
                scoreUnit: r.totalScoreUnit ?? undefined,
              })),
            ].sort((a, b) => b.date.getTime() - a.date.getTime());

            if (events.length === 0) {
              return (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🕐</div>
                  <p className="text-sm font-medium text-neutral-500">임상 평가 이력이 없습니다</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    평가를 완료하거나 외부 보고서를 추가하면 타임라인에 표시됩니다
                  </p>
                </div>
              );
            }

            return (
              <div className="border-l-2 border-dashed border-neutral-200 ml-3">
                {events.map((event) => {
                  const dateStr = `${event.date.getFullYear()}.${String(event.date.getMonth() + 1).padStart(2, '0')}.${String(event.date.getDate()).padStart(2, '0')}`;
                  const icon = event.kind === 'licensed' ? '📊' : '📄';
                  const dotColor = event.severity?.color ?? '#5B8A72';

                  return (
                    <div key={event.id} className="relative pl-6 pb-4">
                      <span
                        className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="text-xs text-neutral-400 mb-0.5">{dateStr}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{icon}</span>
                        <span className="text-sm font-semibold text-neutral-800">
                          {event.title}
                        </span>
                        {event.kind === 'external' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f0f4f8] text-neutral-500 font-medium">
                            외부 보고서
                          </span>
                        )}
                        {event.score != null && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-[#f8f6f3] text-neutral-600 font-medium">
                            {event.score}
                            {event.scoreUnit ?? '점'}
                          </span>
                        )}
                        {event.severity && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-md"
                            style={{ color: event.severity.color, background: event.severity.bg }}
                          >
                            {event.severity.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* Section 1: 평가 도구 Launcher */}
      <section>
        <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <span>📋</span> 평가 도구
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LICENSED_TOOLS.map((tool) => (
            <div
              key={tool.id}
              onClick={() => tool.available && navigate(`/assessment/licensed/${tool.id}`)}
              className={`bg-white rounded-xl border p-5 transition-all duration-200 ${
                tool.available
                  ? 'border-[#e8e4df] shadow-[0_2px_8px_rgba(91,138,114,0.05)] hover:shadow-[0_4px_16px_rgba(91,138,114,0.1)] hover:border-[#5B8A72]/30 cursor-pointer group'
                  : 'border-neutral-100 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3
                  className={`text-base font-semibold ${
                    tool.available
                      ? 'text-neutral-800 group-hover:text-[#5B8A72] transition-colors'
                      : 'text-neutral-500'
                  }`}
                >
                  {tool.name}
                </h3>
                {tool.available ? (
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-[#e8f5ee] flex items-center justify-center text-[#5B8A72] group-hover:bg-[#5B8A72] group-hover:text-white transition-colors">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </span>
                ) : (
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-neutral-200/60 text-xs font-medium text-neutral-500">
                    준비중
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500">{tool.description}</p>
              {tool.available &&
                latestByTool[tool.id] &&
                (() => {
                  const latest = latestByTool[tool.id];
                  const sev = getLicensedSeverity(tool.id, latest.totalScore ?? 0);
                  return (
                    <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs text-neutral-400">
                        최근 {formatDate(latest.createdAt)} · {latest.totalScore}점
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-md"
                        style={{ color: sev.color, background: sev.bg }}
                      >
                        {sev.label}
                      </span>
                    </div>
                  );
                })()}
              {tool.available && !latestByTool[tool.id] && (
                <p className="mt-2 text-xs text-neutral-300">아직 평가 기록 없음</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            법적 동의 필요: 라이선스 도구 사용 시 저작권자 동의 및 전문가 자격 확인이 필요합니다.
          </p>
        </div>
      </section>

      {/* Section 2: 평가 결과 이력 */}
      <section>
        <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <span>📊</span> 평가 결과 이력
        </h2>
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-6 shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          {licensedAssessments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🏥</div>
              <p className="text-sm font-medium text-neutral-500">임상 평가 기록이 없습니다</p>
              <p className="text-xs text-neutral-400 mt-1">
                위의 평가 도구를 선택하여 평가를 시작해보세요
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {licensedAssessments.map((a: Assessment) => {
                const tool = a.questionnaire?.licensedTool ?? '';
                const toolLabel = TOOL_LABELS[tool] ?? tool;
                const sev = getLicensedSeverity(tool, a.totalScore ?? 0);
                const date = new Date(a.createdAt);
                const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 px-4 rounded-xl border border-[#e8e4df] bg-[#fdfbf7]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-[#9B8EC420] flex items-center justify-center text-base">
                        🏥
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-800">{toolLabel}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {dateStr} · 총점 {a.totalScore}점
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ color: sev.color, background: sev.bg }}
                    >
                      {sev.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 3: 외부 평가 보고서 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            <span>📄</span> 외부 평가 보고서
          </h2>
          <button
            onClick={() => setShowReportModal(true)}
            className="text-sm font-semibold text-[#5B8A72] hover:text-[#3d6b54] transition-colors"
          >
            + 보고서 추가
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-6 shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          {!clinicalReports || clinicalReports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-medium text-neutral-500">외부 평가 보고서가 없습니다</p>
              <p className="text-xs text-neutral-400 mt-1">
                '+ 보고서 추가'로 임상 결과를 기록하세요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
                    className="p-4 rounded-xl border border-[#e8e4df] bg-[#fdfbf7]"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-neutral-800">
                          {report.assessmentTool}
                        </div>
                        {metaParts.length > 0 && (
                          <div className="text-xs text-neutral-400 mt-1">
                            {metaParts.join(' · ')}
                            {totalLabel && (
                              <span className="ml-1.5 text-[#5B8A72] font-semibold">
                                {totalLabel}
                              </span>
                            )}
                          </div>
                        )}
                        {visibleSections.length > 0 && (
                          <div className="text-[11px] text-neutral-500 mt-1.5 flex flex-wrap gap-1">
                            {visibleSections.map((s, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-[#E8F5EE] text-[11px] whitespace-nowrap"
                              >
                                {s.name} {s.score !== null ? `${s.score}${s.unit || '점'}` : ''}
                                {s.percentile !== null && s.percentile !== undefined
                                  ? `(${s.percentile}%)`
                                  : ''}
                              </span>
                            ))}
                            {report.sectionScores.length > 3 && (
                              <span className="px-1.5 text-[11px] text-neutral-400">
                                +{report.sectionScores.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {report.clinicalFindings && (
                          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed line-clamp-2">
                            소견: &ldquo;{report.clinicalFindings}&rdquo;
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('이 보고서를 삭제하시겠습니까?')) {
                            deleteReport.mutate(report.id);
                          }
                        }}
                        className="ml-3 px-2 py-1 rounded-md text-[11px] text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
      </section>

      <ClinicalReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        childId={selectedChildId}
      />
    </div>
  );
}
