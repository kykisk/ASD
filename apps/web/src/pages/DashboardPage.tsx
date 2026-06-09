import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useChildStore } from '../stores/child.store';
import { useDashboard, DomainScore } from '../hooks/use-dashboard';
import { useWeeklyInsight, InsightRecord } from '../hooks/use-insights';
import { useResearchFeed, ResearchMatch } from '../hooks/use-research';
import { Skeleton, ErrorState, EmptyState } from '../components/ui';

const DOMAIN_COLORS: Record<string, string> = {
  Communication: '#7B9FD4',
  Social: '#E8A87C',
  Motor: '#9B8EC4',
  Cognitive: '#7EC8C8',
  Emotional: '#F2B880',
};

const DOMAIN_ICONS: Record<string, string> = {
  Communication: '🗣️',
  Social: '🤝',
  Motor: '🏃',
  Cognitive: '🧠',
  Emotional: '💛',
};

const DOMAIN_LABELS: Record<string, string> = {
  Communication: '의사소통',
  Social: '사회성',
  Motor: '운동',
  Cognitive: '인지',
  Emotional: '정서',
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
  OTHER: '기타',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return '좋은 아침이에요';
  if (hour >= 11 && hour < 17) return '안녕하세요';
  if (hour >= 17 && hour < 21) return '수고하셨어요';
  return '오늘도 고생하셨어요';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-neutral-200/40">
        <Skeleton height="h-7" className="w-3/5" />
        <div className="mt-3">
          <Skeleton height="h-5" className="w-4/5" />
        </div>
      </div>
      <div className="p-5 rounded-xl border border-neutral-200 bg-white">
        <Skeleton height="h-5" className="w-1/3" />
        <div className="mt-4">
          <Skeleton lines={3} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-xl border border-neutral-200 bg-white">
            <Skeleton height="h-5" className="w-1/2" />
            <div className="mt-3">
              <Skeleton height="h-1.5" className="w-full rounded-full" />
            </div>
            <div className="mt-3">
              <Skeleton height="h-4" className="w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 6,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E8E4DF"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#5B8A72"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

const TREND_CONFIG: Record<
  InsightRecord['overallTrend'],
  { label: string; color: string; bg: string }
> = {
  IMPROVING: { label: '성장 중', color: '#5B8A72', bg: '#E8F5EE' },
  STABLE: { label: '안정', color: '#64748B', bg: '#F1F5F9' },
  NEEDS_ATTENTION: { label: '관심 필요', color: '#D97706', bg: '#FFFBEB' },
};

function InsightCard({
  insight,
  isLoading,
  isError,
}: {
  insight?: InsightRecord;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="dashboard-animate-in bg-gradient-to-br from-[#E8F5EE] to-white border border-primary-100 rounded-xl shadow-sage-sm p-5"
        style={{ animationDelay: '480ms' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✨</span>
          <Skeleton height="h-5" className="w-40" />
        </div>
        <Skeleton lines={2} />
      </div>
    );
  }

  if (isError || !insight) {
    return (
      <div
        className="dashboard-animate-in bg-gradient-to-br from-[#E8F5EE] to-white border border-primary-100 rounded-xl shadow-sage-sm p-5"
        style={{ animationDelay: '480ms' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✨</span>
          <h3 className="text-base font-semibold text-neutral-800">이번 주 AI 성장 분석</h3>
        </div>
        <p className="text-sm text-neutral-500 leading-relaxed">
          AI 분석 준비 중이에요. 평가 데이터를 조금 더 쌓으면 인사이트를 제공해드릴게요.
        </p>
      </div>
    );
  }

  const trendCfg = TREND_CONFIG[insight.overallTrend];

  return (
    <div
      className="dashboard-animate-in bg-gradient-to-br from-[#E8F5EE] to-white border border-primary-100 rounded-xl shadow-sage-sm p-5"
      style={{ animationDelay: '480ms' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-base font-semibold text-neutral-800">이번 주 AI 성장 분석</h3>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{ color: trendCfg.color, background: trendCfg.bg }}
        >
          {trendCfg.label}
        </span>
      </div>

      <p className="text-sm text-neutral-700 leading-relaxed mb-4">{insight.summary}</p>

      {insight.highlights.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[13px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
            <span>🌟</span> 하이라이트
          </h4>
          <ul className="space-y-1">
            {insight.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.concerns.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[13px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
            <span>⚠️</span> 관심 영역
          </h4>
          <ul className="space-y-1">
            {insight.concerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.recommendations.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[13px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
            <span>💡</span> 이번 주 집중 포인트
          </h4>
          <ul className="space-y-1">
            {insight.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to="/insights"
        className="inline-block mt-1 text-[13px] text-primary-600 font-semibold hover:text-primary-700 transition-colors"
      >
        자세히 보기 →
      </Link>
    </div>
  );
}

function DomainScoreCard({ domain, score, trend, delay }: DomainScore & { delay: number }) {
  const color = DOMAIN_COLORS[domain] || '#7B9FD4';
  const icon = DOMAIN_ICONS[domain] || '📊';
  const label = DOMAIN_LABELS[domain] || domain;
  const scorePercent = (score / 5) * 100;

  const trendSymbol = trend === 'UP' ? '↑' : trend === 'DOWN' ? '↓' : '→';
  const trendColor = trend === 'UP' ? '#4CAF50' : trend === 'DOWN' ? '#E57373' : '#94A3B4';
  const trendText = trend === 'UP' ? '상승' : trend === 'DOWN' ? '하락' : '유지';

  return (
    <div
      className="dashboard-animate-in bg-white border border-neutral-200 rounded-xl shadow-sage-sm p-5 flex flex-col gap-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-[15px] font-semibold text-neutral-800">{label}</span>
        </div>
        <span className="text-[13px] font-semibold" style={{ color: trendColor }}>
          {trendSymbol} {trendText}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-600 ease-out"
              style={{ width: `${scorePercent}%`, background: color }}
            />
          </div>
        </div>
        <span className="text-sm font-semibold text-neutral-800 min-w-[36px] text-right">
          {score}/5
        </span>
      </div>
    </div>
  );
}

function ResearchTicker({ articles }: { articles: ResearchMatch[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (articles.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % articles.length);
        setVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(interval);
  }, [articles.length]);

  const current = articles[idx];
  if (!current) return null;

  const text = current.article.koreanSummary || current.article.title;
  const date = new Date(current.article.publishedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
  });

  return (
    <Link
      to="/research"
      className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-xl hover:bg-primary-100/60 transition-colors overflow-hidden group cursor-pointer no-underline"
    >
      {/* Label badge */}
      <span className="shrink-0 flex items-center gap-1 bg-primary-500 text-white text-[11px] font-bold px-2 py-1 rounded-md leading-none whitespace-nowrap">
        📰 연구
      </span>

      {/* Scrolling text */}
      <span
        className="flex-1 text-sm text-neutral-700 truncate"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {text}
      </span>

      {/* Right meta */}
      <div className="shrink-0 flex items-center gap-2 text-xs text-neutral-400 whitespace-nowrap">
        <span className="hidden sm:inline">{date}</span>
        <span className="text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded font-medium">
          ✨ AI 요약
        </span>
        <span className="text-primary-400 group-hover:translate-x-0.5 transition-transform">→</span>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { selectedChildId } = useChildStore();
  const { data, isLoading, isError, refetch } = useDashboard(selectedChildId);
  const {
    data: insight,
    isLoading: insightLoading,
    isError: insightError,
  } = useWeeklyInsight(selectedChildId);
  const { data: researchFeed } = useResearchFeed(selectedChildId);

  if (!selectedChildId) {
    return (
      <EmptyState
        icon={<span className="text-3xl">👶</span>}
        title="아이를 선택해주세요"
        description="상단에서 아이를 선택하면 대시보드를 확인할 수 있어요"
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="max-w-[800px] mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="대시보드를 불러올 수 없습니다"
        message="네트워크 연결을 확인해주세요."
        onRetry={() => refetch()}
      />
    );
  }

  const { child, today, recentAssessment, weeklyProgress, alerts } = data;
  const greeting = getGreeting();

  const upDomain = recentAssessment?.domainScores.find((d) => d.trend === 'UP');
  const summaryParts: string[] = [];
  if (today.totalCount > 0) {
    summaryParts.push(`${today.totalCount}개 세션 예정`);
  }
  if (upDomain) {
    const domainLabel = DOMAIN_LABELS[upDomain.domain] || upDomain.domain;
    summaryParts.push(`${domainLabel} 점수 상승중`);
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join(' · ') : '오늘 일정이 없어요';

  const quickActions = [
    { icon: '📝', label: '평가하기', to: '/assessment' },
    { icon: '📅', label: '일정 추가', to: '/schedule' },
    { icon: '📚', label: '질문지', to: '/questionnaires' },
    { icon: '📈', label: '성장 기록', to: '/assessment/history' },
  ];

  return (
    <div className="max-w-[800px] mx-auto">
      <style>{`
        @keyframes dashboard-fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-animate-in {
          animation: dashboard-fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`px-4 py-3 rounded-xl text-sm flex items-start gap-2 ${
                alert.severity === 'warning'
                  ? 'bg-amber-50 border border-amber-200/60 text-amber-800'
                  : 'bg-primary-50 border border-primary-200/60 text-primary-800'
              }`}
            >
              <span className="shrink-0 mt-0.5">
                {alert.type === 'RE_EVALUATION_DUE'
                  ? '🏥'
                  : alert.severity === 'warning'
                    ? '⚠️'
                    : 'ℹ️'}
              </span>
              <div>
                <span className="font-medium">{alert.message}</span>
                {alert.detail && <p className="text-xs mt-0.5 opacity-75">{alert.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="dashboard-animate-in mb-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-5 w-[120px] h-[120px] rounded-full bg-white/8" />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-[22px] font-bold">
            {greeting}, {child.name}님.
          </h1>
          <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-lg">
            치료 {child.therapyDays}일째
          </span>
        </div>
        <p className="text-[15px] mt-2 opacity-90 leading-relaxed">{summaryText}</p>
      </section>

      {/* Research Ticker */}
      {researchFeed && researchFeed.length > 0 && (
        <div className="dashboard-animate-in mb-2" style={{ animationDelay: '60ms' }}>
          <ResearchTicker
            articles={[...researchFeed].sort(
              (a, b) =>
                new Date(b.article.publishedAt).getTime() -
                new Date(a.article.publishedAt).getTime(),
            )}
          />
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div
          className="dashboard-animate-in bg-white border border-neutral-200 rounded-xl shadow-sage-sm p-5"
          style={{ animationDelay: '100ms' }}
        >
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-neutral-800">
            <span>📅</span> 오늘 일정
          </h3>
          {today.schedules.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">오늘 예정된 일정이 없어요</p>
          ) : (
            <div className="flex flex-col gap-3">
              {today.schedules.slice(0, 3).map((item) => {
                const catColor = DOMAIN_COLORS[item.category] || '#7B9FD4';
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: item.completed ? catColor : 'transparent',
                        border: item.completed ? 'none' : `2px solid ${catColor}`,
                      }}
                    />
                    <span className="text-[13px] text-neutral-400 min-w-[40px] font-medium">
                      {item.time}
                    </span>
                    <span
                      className={`text-[15px] flex-1 ${item.completed ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}
                    >
                      {item.title}
                    </span>
                    {item.completed && (
                      <span className="text-[11px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-md font-medium">
                        완료
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {today.schedules.length > 0 && (
            <Link
              to="/schedule"
              className="inline-block mt-4 text-[13px] text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              모든 일정 보기 →
            </Link>
          )}
        </div>

        {recentAssessment && recentAssessment.domainScores.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentAssessment.domainScores.map((ds, idx) => (
              <DomainScoreCard key={ds.domain} {...ds} delay={200 + idx * 80} />
            ))}
          </div>
        )}

        <InsightCard insight={insight} isLoading={insightLoading} isError={insightError} />

        <div
          className="dashboard-animate-in bg-white border border-neutral-200 rounded-xl shadow-sage-sm p-5"
          style={{ animationDelay: '400ms' }}
        >
          <h3 className="text-base font-semibold mb-4 text-neutral-800">이번 주 활동</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <ProgressRing percent={weeklyProgress.completionRate} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-neutral-800">
                {weeklyProgress.completionRate}%
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-neutral-500">
                {weeklyProgress.assessmentCount}회 평가 완료
              </span>
              {weeklyProgress.streak > 0 && (
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg w-fit">
                  🔥 {weeklyProgress.streak}일 연속
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-animate-in mt-6" style={{ animationDelay: '520ms' }}>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-800 whitespace-nowrap hover:border-primary-200 hover:shadow-sage-sm transition-all min-h-[44px]"
            >
              <span>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
