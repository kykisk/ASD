import { Link } from 'react-router-dom';
import './design-preview.css';

const domainData = [
  { name: '의사소통', score: 72, color: '#7B9FD4' },
  { name: '사회성', score: 65, color: '#E8A87C' },
  { name: '운동', score: 58, color: '#9B8EC4' },
  { name: '인지', score: 70, color: '#7EC8C8' },
  { name: '정서', score: 75, color: '#F2B880' },
];

function RadarChart() {
  const cx = 120;
  const cy = 120;
  const r = 90;
  const levels = 4;
  const angleStep = (2 * Math.PI) / domainData.length;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const polygonPoints = domainData
    .map((d, i) => {
      const p = getPoint(i, d.score);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <svg width={240} height={240} viewBox="0 0 240 240" style={{ display: 'block', margin: '0 auto' }}>
      {Array.from({ length: levels }, (_, l) => {
        const levelR = (r * (l + 1)) / levels;
        const pts = domainData
          .map((_, i) => {
            const angle = angleStep * i - Math.PI / 2;
            return `${cx + levelR * Math.cos(angle)},${cy + levelR * Math.sin(angle)}`;
          })
          .join(' ');
        return (
          <polygon
            key={l}
            points={pts}
            fill="none"
            stroke="var(--dp-card-border)"
            strokeWidth={l === levels - 1 ? 1.5 : 0.8}
          />
        );
      })}

      {domainData.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--dp-card-border)" strokeWidth={0.8} />
        );
      })}

      <polygon points={polygonPoints} fill="rgba(91, 138, 114, 0.15)" stroke="#5B8A72" strokeWidth={2} />

      {domainData.map((d, i) => {
        const p = getPoint(i, d.score);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill={d.color} />;
      })}

      {domainData.map((d, i) => {
        const labelDist = r + 20;
        const angle = angleStep * i - Math.PI / 2;
        const x = cx + labelDist * Math.cos(angle);
        const y = cy + labelDist * Math.sin(angle);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#6B7B8D" fontWeight={500}>
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}

function ProgressRing({ percent, color }: { percent: number; color: string }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      <circle cx={44} cy={44} r={r} fill="none" stroke="var(--dp-card-border)" strokeWidth={6} />
      <circle
        cx={44}
        cy={44}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={44} y={44} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={700} fill="var(--dp-text)">
        {percent}%
      </text>
    </svg>
  );
}

export function DesignPreviewChildProfile() {
  return (
    <div className="dp-root" style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>
      <Link
        to="/design-preview"
        style={{ fontSize: 13, color: 'var(--dp-text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        ← 디자인 시안 목록
      </Link>

      <div className="dp-card dp-animate-in" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'linear-gradient(135deg, var(--dp-primary-light), #F0EDF8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--dp-primary)',
            flexShrink: 0,
          }}
        >
          민
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>민준</h1>
          <p style={{ fontSize: 14, color: 'var(--dp-text-secondary)' }}>4세 2개월</p>
          <p style={{ fontSize: 12, color: 'var(--dp-text-muted)', marginTop: 2 }}>치료 시작: 247일째 🌱</p>
        </div>
      </div>

      <div
        className="dp-animate-in"
        style={{
          animationDelay: '100ms',
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          background: 'var(--dp-card)',
          borderRadius: 12,
          padding: 4,
          border: '1px solid var(--dp-card-border)',
        }}
      >
        {['개요', '포트폴리오', '마일스톤'].map((tab, i) => (
          <button
            key={tab}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: i === 0 ? 'var(--dp-primary)' : 'transparent',
              color: i === 0 ? 'white' : 'var(--dp-text-secondary)',
              fontWeight: i === 0 ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="dp-card dp-animate-in" style={{ animationDelay: '180ms', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>발달 영역 현황</h3>
        <RadarChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="dp-card dp-animate-in" style={{ animationDelay: '260ms', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
          <ProgressRing percent={78} color="var(--dp-primary)" />
          <p style={{ fontSize: 13, color: 'var(--dp-text-secondary)', textAlign: 'center' }}>이번 주 활동 완료율</p>
        </div>
        <div className="dp-card dp-animate-in" style={{ animationDelay: '320ms', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--dp-primary)' }}>12</div>
          <p style={{ fontSize: 13, color: 'var(--dp-text-secondary)' }}>이번 달 완료한 활동</p>
          <div style={{ fontSize: 12, color: 'var(--dp-score-5)', fontWeight: 500 }}>↑ 지난 달 대비 +3</div>
        </div>
      </div>

      <div className="dp-card dp-animate-in" style={{ animationDelay: '380ms' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>최근 하이라이트</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#E8F5EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🎉
            </span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>두 단어 문장 사용 시작!</p>
              <p style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>3일 전 · 의사소통 영역</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#F0EDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ⭐
            </span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>또래와 5분간 협동 놀이 성공</p>
              <p style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>5일 전 · 사회성 영역</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#FFF8EC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🌟
            </span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>감정 표현 어휘 3개 추가</p>
              <p style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>1주 전 · 정서 영역</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
