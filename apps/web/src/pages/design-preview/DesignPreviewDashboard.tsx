import { Link } from 'react-router-dom';
import './design-preview.css';

function Sparkline({ color, data }: { color: string; data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline className="dp-sparkline" points={points} stroke={color} />
    </svg>
  );
}

function DomainCard({
  icon,
  name,
  score,
  trend,
  trendLabel,
  color,
  sparkData,
  message,
  delay,
}: {
  icon: string;
  name: string;
  score: number;
  trend: string;
  trendLabel: string;
  color: string;
  sparkData: number[];
  message: string;
  delay: number;
}) {
  return (
    <div
      className="dp-card dp-animate-in"
      style={{ animationDelay: `${delay}ms`, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{trend} {trendLabel}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--dp-card-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${score}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dp-text)', minWidth: 52, textAlign: 'right' }}>
          {score}/100
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Sparkline color={color} data={sparkData} />
        <span style={{ fontSize: 12, color: 'var(--dp-text-secondary)', fontStyle: 'italic' }}>{message}</span>
      </div>
    </div>
  );
}

export function DesignPreviewDashboard() {
  const scheduleItems = [
    { time: '9:00', label: '언어치료 (김선생님)', done: true, color: 'var(--dp-comm)' },
    { time: '11:30', label: '감각놀이', done: false, color: 'var(--dp-motor)' },
    { time: '15:00', label: '부모 체크인', done: false, color: 'var(--dp-emotional)' },
  ];

  const quickActions = [
    { icon: '📝', label: '기록하기' },
    { icon: '📅', label: '일정 추가' },
    { icon: '💬', label: '메모' },
    { icon: '📊', label: '리포트' },
    { icon: '📚', label: '자료실' },
  ];

  return (
    <div className="dp-root" style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <Link
        to="/design-preview"
        style={{ fontSize: 13, color: 'var(--dp-text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}
      >
        ← 디자인 시안 목록
      </Link>

      {/* Layer 1: Daily Summary */}
      <section className="dp-animate-in" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
          좋은 아침이에요, 지현님.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--dp-text-secondary)', lineHeight: 1.6 }}>
          오늘 3개 세션 예정 · 민준이 의사소통 점수 상승중 · AI 추천: 감각 놀이
        </p>
      </section>

      {/* Layer 2: Content Cards */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Schedule Card */}
        <div className="dp-card dp-animate-in" style={{ animationDelay: '100ms' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📅</span> 오늘 일정
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scheduleItems.map((item) => (
              <div key={item.time} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.done ? item.color : 'transparent',
                    border: item.done ? 'none' : `2px solid ${item.color}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--dp-text-muted)', minWidth: 40, fontWeight: 500 }}>
                  {item.time}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    color: item.done ? 'var(--dp-text-muted)' : 'var(--dp-text)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </span>
                {item.done && (
                  <span style={{ fontSize: 11, background: 'var(--dp-primary-light)', color: 'var(--dp-primary)', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>
                    완료
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Domain Score Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <DomainCard
            icon="🗣️"
            name="의사소통"
            score={72}
            trend="↑"
            trendLabel="+8%"
            color="var(--dp-comm)"
            sparkData={[52, 55, 58, 60, 64, 68, 72]}
            message="꾸준히 좋아지고 있어요"
            delay={200}
          />
          <DomainCard
            icon="🤝"
            name="사회성"
            score={65}
            trend="→"
            trendLabel="유지"
            color="var(--dp-social)"
            sparkData={[62, 63, 64, 63, 65, 64, 65]}
            message="안정적으로 유지 중이에요"
            delay={280}
          />
          <DomainCard
            icon="🏃"
            name="운동"
            score={58}
            trend="↑"
            trendLabel="+5%"
            color="var(--dp-motor)"
            sparkData={[48, 50, 52, 53, 55, 56, 58]}
            message="조금씩 나아지고 있어요"
            delay={360}
          />
        </div>

        {/* AI Recommendation Card */}
        <div
          className="dp-card dp-animate-in"
          style={{
            animationDelay: '440ms',
            background: 'linear-gradient(135deg, var(--dp-primary-light) 0%, #F0EDF8 100%)',
            borderColor: 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
                boxShadow: 'var(--dp-shadow-sm)',
              }}
            >
              🤖
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: 'var(--dp-primary-dark)', fontWeight: 500, marginBottom: 4 }}>
                오늘의 추천 활동
              </p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--dp-text)', marginBottom: 4 }}>
                감각 통합 놀이 — 물감 촉감 탐색
              </p>
              <p style={{ fontSize: 13, color: 'var(--dp-text-secondary)' }}>
                15분 · 운동 + 인지 영역 강화
              </p>
            </div>
          </div>
          <button
            className="dp-btn-primary"
            style={{ marginTop: 16, width: 'auto', padding: '0 24px', height: 40, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            시작하기 →
          </button>
        </div>
      </section>

      {/* Layer 3: Quick Actions */}
      <section className="dp-animate-in" style={{ animationDelay: '520ms', marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollbarWidth: 'none',
          }}
        >
          {quickActions.map((action) => (
            <button
              key={action.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid var(--dp-card-border)',
                background: 'white',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--dp-text)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--dp-shadow-sm)',
              }}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
