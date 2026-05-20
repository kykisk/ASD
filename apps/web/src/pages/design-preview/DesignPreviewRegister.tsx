import { Link } from 'react-router-dom';
import './design-preview.css';

export function DesignPreviewRegister() {
  return (
    <div className="dp-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div className="dp-blob" style={{ width: 250, height: 250, background: '#5B8A72', top: -60, left: -60, opacity: 0.3 }} />
      <div className="dp-blob" style={{ width: 180, height: 180, background: '#7EC8C8', bottom: -40, right: -40, animationDelay: '4s', opacity: 0.3 }} />

      <div className="dp-card-lg dp-animate-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--dp-text)', marginBottom: 6 }}>
            회원가입
          </h1>
          <p style={{ fontSize: 14, color: 'var(--dp-text-secondary)' }}>
            AutiCare와 함께 시작해보세요
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', marginBottom: 6 }}>
              이름
            </label>
            <input className="dp-input" type="text" placeholder="이름을 입력해주세요" readOnly />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', marginBottom: 6 }}>
              이메일
            </label>
            <input className="dp-input" type="email" placeholder="hello@auticare.kr" readOnly />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', marginBottom: 6 }}>
              비밀번호
            </label>
            <input className="dp-input" type="password" placeholder="8자 이상" readOnly />
            <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--dp-score-5)' }} />
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--dp-score-4)' }} />
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--dp-card-border)' }} />
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--dp-card-border)' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--dp-score-4)', marginTop: 4, fontWeight: 500 }}>
              적당한 강도
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', marginBottom: 6 }}>
              비밀번호 확인
            </label>
            <input className="dp-input" type="password" placeholder="비밀번호를 다시 입력해주세요" readOnly />
          </div>

          <button className="dp-btn-primary" style={{ marginTop: 8 }}>
            회원가입
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--dp-text-secondary)', marginTop: 20 }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/design-preview/login" style={{ color: 'var(--dp-primary)', fontWeight: 600, textDecoration: 'none' }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
