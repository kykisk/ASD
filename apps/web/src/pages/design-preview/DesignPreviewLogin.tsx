import { Link } from 'react-router-dom';
import './design-preview.css';

export function DesignPreviewLogin() {
  return (
    <div className="dp-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative blobs */}
      <div className="dp-blob" style={{ width: 300, height: 300, background: '#5B8A72', top: -80, right: -60 }} />
      <div className="dp-blob" style={{ width: 200, height: 200, background: '#9B8EC4', bottom: -40, left: -40, animationDelay: '3s' }} />
      <div className="dp-blob" style={{ width: 150, height: 150, background: '#F2B880', top: '60%', right: '10%', animationDelay: '5s' }} />

      <div className="dp-card-lg dp-animate-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--dp-primary-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" fill="#5B8A72" opacity="0.2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#5B8A72" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="10" r="1.5" fill="#5B8A72" />
              <circle cx="15" cy="10" r="1.5" fill="#5B8A72" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--dp-primary)', marginBottom: 6 }}>
            AutiCare
          </h1>
          <p style={{ fontSize: 14, color: 'var(--dp-text-secondary)' }}>
            따뜻한 돌봄이 시작되는 곳
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', marginBottom: 6 }}>
              이메일
            </label>
            <input
              className="dp-input"
              type="email"
              placeholder="hello@auticare.kr"
              readOnly
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', marginBottom: 6 }}>
              비밀번호
            </label>
            <input
              className="dp-input"
              type="password"
              placeholder="••••••••"
              readOnly
            />
          </div>

          <button className="dp-btn-primary" style={{ marginTop: 8 }}>
            로그인
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--dp-card-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: 'var(--dp-card-border)' }} />
        </div>

        {/* OAuth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            style={{
              height: 48,
              borderRadius: 12,
              border: '1px solid var(--dp-card-border)',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--dp-text)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 계속하기
          </button>

          <button
            style={{
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: '#FEE500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
              color: '#191919',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.56-.96 3.6-.99 3.83 0 0-.02.17.09.23.11.07.24.01.24.01.32-.04 3.7-2.44 4.28-2.85.56.08 1.14.12 1.72.12 5.52 0 10-3.58 10-7.94C22 6.58 17.52 3 12 3z" />
            </svg>
            카카오로 계속하기
          </button>

          <button
            style={{
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: '#1D1D1F',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Apple로 계속하기
          </button>
        </div>

        {/* Register link */}
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--dp-text-secondary)', marginTop: 24 }}>
          계정이 없으신가요?{' '}
          <Link to="/design-preview/register" style={{ color: 'var(--dp-primary)', fontWeight: 600, textDecoration: 'none' }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
