import { Link } from 'react-router-dom';
import './design-preview.css';

const pages = [
  { path: '/design-preview/login', title: '로그인', desc: '따뜻한 첫인상, 안전한 시작', icon: '🔐' },
  { path: '/design-preview/register', title: '회원가입', desc: '간결하고 부드러운 온보딩', icon: '✨' },
  { path: '/design-preview/dashboard', title: '대시보드', desc: '레이어 1-2-3 정보 계층', icon: '🏠' },
  { path: '/design-preview/assessment', title: '평가 입력', desc: '한 영역씩 가이드 패턴', icon: '📊' },
  { path: '/design-preview/calendar', title: '캘린더', desc: '색상 코딩된 월간 뷰', icon: '📅' },
  { path: '/design-preview/child-profile', title: '아이 프로필', desc: '성장 기록과 레이더 차트', icon: '👶' },
];

export function DesignPreviewIndex() {
  return (
    <div className="dp-root" style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--dp-primary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Design System Preview
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--dp-text)',
              lineHeight: 1.3,
              marginBottom: 12,
            }}
          >
            AutiCare 디자인 시안
          </h1>
          <p style={{ fontSize: 15, color: 'var(--dp-text-secondary)', maxWidth: 480, margin: '0 auto' }}>
            새로운 디자인 시스템 — Sage Green 기반의 따뜻하고 부드러운 인터페이스
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {pages.map((page, i) => (
            <Link
              key={page.path}
              to={page.path}
              className="dp-card dp-animate-in"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                animationDelay: `${i * 80}ms`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--dp-shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--dp-shadow-md)';
              }}
            >
              <span style={{ fontSize: 32 }}>{page.icon}</span>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{page.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--dp-text-secondary)' }}>{page.desc}</p>
              </div>
              <span
                style={{
                  marginTop: 'auto',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--dp-primary)',
                }}
              >
                시안 보기 →
              </span>
            </Link>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            padding: '16px 20px',
            background: 'var(--dp-primary-light)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--dp-primary-dark)',
            textAlign: 'center',
          }}
        >
          이 페이지들은 이해관계자 리뷰를 위한 정적 시안입니다. 실제 데이터 연동 없이 하드코딩된 예시를 표시합니다.
        </div>
      </div>
    </div>
  );
}
