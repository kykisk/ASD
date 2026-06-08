import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import { useAssessments, useAssessmentAggregated } from '../hooks/use-assessments';
import type { DomainScore, Assessment } from '../hooks/use-assessments';
import { EmptyState, ErrorState, LoadingSpinner, PageHeader } from '../components/ui';
import '../components/assessment/assessment.css';
import './assessment-history.css';

const domainMeta: Record<string, { icon: string; color: string }> = {
  communication: { icon: '🗣️', color: '#7B9FD4' },
  social: { icon: '🤝', color: '#E8A87C' },
  motor: { icon: '🏃', color: '#9B8EC4' },
  cognitive: { icon: '🧠', color: '#7EC8C8' },
  emotional: { icon: '💛', color: '#F2B880' },
};

const domainNames: Record<string, string> = {
  communication: '의사소통',
  social: '사회성',
  motor: '운동',
  cognitive: '인지',
  emotional: '정서',
};

function TrendIndicator({
  trend,
  percentage,
}: {
  trend: 'UP' | 'DOWN' | 'STABLE';
  percentage: number;
}) {
  if (trend === 'UP') {
    return <span className="history-trend history-trend-up">↑ {percentage}%</span>;
  }
  if (trend === 'DOWN') {
    return <span className="history-trend history-trend-down">↓ 조금 더 신경써요</span>;
  }
  return <span className="history-trend history-trend-stable">→ 안정적</span>;
}

function Sparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;

  const width = 64;
  const height = 24;
  const maxScore = 5;
  const minScore = 1;
  const range = maxScore - minScore;

  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - ((score - minScore) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="history-sparkline">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
}

function DomainCard({ domain, index }: { domain: DomainScore; index: number }) {
  const meta = domainMeta[domain.domain] || { icon: '📊', color: '#94A3B8' };
  const name = domainNames[domain.domain] || domain.label;

  return (
    <div
      className="history-domain-card history-animate-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="history-domain-header">
        <div className="history-domain-icon" style={{ background: `${meta.color}20` }}>
          {meta.icon}
        </div>
        <span className="history-domain-name">{name}</span>
      </div>

      <div className="history-domain-score">
        <span className="history-score-value" style={{ color: meta.color }}>
          {domain.currentScore.toFixed(1)}
        </span>
        <span className="history-score-max">/5</span>
      </div>

      <div className="history-domain-footer">
        <Sparkline scores={[domain.currentScore]} color={meta.color} />
        <TrendIndicator
          trend={domain.trend.direction}
          percentage={Math.abs(domain.trend.changePercent)}
        />
      </div>
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

function getLicensedSeverity(tool: string, totalScore: number): { label: string; color: string } {
  if (tool === 'CARS_2') {
    if (totalScore < 30) return { label: '비자폐', color: '#5B8A72' };
    if (totalScore < 37) return { label: '경증-중등도', color: '#D4A800' };
    return { label: '중증', color: '#E88B8B' };
  }
  if (tool === 'M_CHAT_R_F') {
    if (totalScore <= 2) return { label: '낮은 위험', color: '#5B8A72' };
    if (totalScore <= 7) return { label: '중간 위험', color: '#D4A800' };
    return { label: '높은 위험', color: '#E88B8B' };
  }
  if (tool === 'ABC') {
    return totalScore > 0
      ? { label: '유의미한 이상행동', color: '#F0A86E' }
      : { label: '정상 범위', color: '#5B8A72' };
  }
  return { label: `${totalScore}점`, color: '#94A3B8' };
}

function HistoryEntry({ assessment, index }: { assessment: Assessment; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(assessment.createdAt);
  const formattedDate = `${date.getMonth() + 1}월 ${date.getDate()}일`;

  const isLicensed = assessment.questionnaire?.type === 'LICENSED';
  const tool = assessment.questionnaire?.licensedTool ?? '';
  const toolLabel = TOOL_LABELS[tool] ?? tool;

  const scoreOption = (() => {
    if (isLicensed && tool && assessment.totalScore !== null) {
      return getLicensedSeverity(tool, assessment.totalScore);
    }
    const s = assessment.totalScore ?? 0;
    if (s >= 5) return { emoji: '😊', color: '#5B8A72', label: '매우 좋음' };
    if (s >= 4) return { emoji: '🙂', color: '#5BAA5B', label: '좋음' };
    if (s >= 3) return { emoji: '😐', color: '#D4A800', label: '보통' };
    if (s >= 2) return { emoji: '😟', color: '#F0A86E', label: '노력 필요' };
    return { emoji: '😢', color: '#E88B8B', label: '관심 필요' };
  })();

  return (
    <div
      className="history-entry history-animate-in"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="history-entry-header">
        <div className="flex flex-col gap-0.5">
          <span className="history-entry-date">{formattedDate}</span>
          {isLicensed && toolLabel && (
            <span className="text-xs font-semibold text-[#9B8EC4]">🏥 {toolLabel}</span>
          )}
        </div>
        <div className="history-entry-score">
          {isLicensed ? (
            <>
              <span
                className="text-sm font-semibold"
                style={{ color: (scoreOption as { color: string }).color }}
              >
                {(scoreOption as { label: string }).label}
              </span>
              <span className="text-xs text-neutral-400 ml-1">{assessment.totalScore}점</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 18 }}>
                {'emoji' in scoreOption ? scoreOption.emoji : '📊'}
              </span>
              <span style={{ color: scoreOption.color, fontWeight: 600, fontSize: 14 }}>
                {scoreOption.label}
              </span>
            </>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="history-entry-chevron"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="#94A3B4"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {expanded && (
        <div className="history-entry-details history-animate-in">
          {isLicensed ? (
            <div className="text-sm text-neutral-500 py-1">
              총점 {assessment.totalScore ?? 0}점 · {toolLabel} 평가 완료
            </div>
          ) : (
            (assessment.scores ?? []).map((score) => {
              const domainId = score.domain?.toLowerCase();
              const meta = domainMeta[domainId];
              const name = domainNames[domainId];
              if (!meta || !name) return null;
              return (
                <div key={score.itemId} className="history-entry-item">
                  <div className="history-entry-item-dot" style={{ background: meta.color }} />
                  <span className="history-entry-item-name">{name}</span>
                  <span className="history-entry-item-score" style={{ color: meta.color }}>
                    {score.score}점
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function AssessmentHistoryPage() {
  const { selectedChildId } = useChildStore();
  const {
    data: assessments,
    isLoading: loadingList,
    isError: errorList,
    refetch: refetchList,
  } = useAssessments(selectedChildId);
  const {
    data: aggregated,
    isLoading: loadingAgg,
    isError: errorAgg,
    refetch: refetchAgg,
  } = useAssessmentAggregated(selectedChildId);

  if (!selectedChildId) {
    return (
      <div className="assessment-root">
        <EmptyState icon={<span className="text-3xl">👶</span>} title="아이를 먼저 선택해주세요" />
      </div>
    );
  }

  const isLoading = loadingList || loadingAgg;
  const isError = errorList || errorAgg;
  const hasAssessments = assessments && assessments.length > 0;

  if (isError) {
    return (
      <div className="assessment-root">
        <ErrorState
          title="기록을 불러올 수 없습니다"
          message="네트워크 연결을 확인 후 다시 시도해주세요."
          onRetry={() => {
            refetchList();
            refetchAgg();
          }}
        />
      </div>
    );
  }

  return (
    <div className="assessment-root">
      <PageHeader title="성장 기록" subtitle="아이의 발달 추이를 한눈에" />

      {isLoading && <LoadingSpinner />}

      {!isLoading && !hasAssessments && (
        <EmptyState
          icon={
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          }
          title="아직 평가 기록이 없어요"
          description="첫 번째 평가를 시작해보세요."
          action={{
            label: '평가 시작하기',
            onClick: () => {
              window.location.href = '/assessment';
            },
          }}
        />
      )}

      {!isLoading && aggregated && aggregated.domains.length > 0 && (
        <div className="history-domain-grid">
          {aggregated.domains.map((ds, i) => (
            <DomainCard key={ds.domain} domain={ds} index={i} />
          ))}
        </div>
      )}

      {!isLoading && hasAssessments && (
        <div className="history-list">
          <h2 className="history-list-title">기록 목록</h2>
          {assessments!.map((a, i) => (
            <HistoryEntry key={a.id} assessment={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
