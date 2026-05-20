import { Link } from 'react-router-dom';
import { useState } from 'react';
import './design-preview.css';

const domains = [
  { id: 'communication', name: '의사소통', icon: '🗣️', color: 'var(--dp-comm)' },
  { id: 'social', name: '사회성', icon: '🤝', color: 'var(--dp-social)' },
  { id: 'motor', name: '운동', icon: '🏃', color: 'var(--dp-motor)' },
  { id: 'cognitive', name: '인지', icon: '🧠', color: 'var(--dp-cognitive)' },
  { id: 'emotional', name: '정서', icon: '💛', color: 'var(--dp-emotional)' },
];

const scaleOptions = [
  { score: 1, emoji: '😢', color: '#E88B8B', label: '관심 필요' },
  { score: 2, emoji: '😟', color: '#F0A86E', label: '노력 필요' },
  { score: 3, emoji: '😐', color: '#F5D76E', label: '보통' },
  { score: 4, emoji: '🙂', color: '#A8D8A8', label: '좋음' },
  { score: 5, emoji: '😊', color: '#7BC67E', label: '매우 좋음' },
];

export function DesignPreviewAssessment() {
  const [selectedScore, setSelectedScore] = useState<number | null>(4);
  const currentDomain = domains[0];
  const completedCount = 2;

  return (
    <div className="dp-root" style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: 560, margin: '0 auto' }}>
      <Link
        to="/design-preview"
        style={{ fontSize: 13, color: 'var(--dp-text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        ← 디자인 시안 목록
      </Link>

      <div className="dp-animate-in" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dp-text-secondary)' }}>
            {completedCount}/{domains.length} 영역 완료
          </span>
          <span style={{ fontSize: 13, color: 'var(--dp-text-muted)' }}>
            {currentDomain.icon} {currentDomain.name}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--dp-card-border)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(completedCount / domains.length) * 100}%`,
              borderRadius: 3,
              background: currentDomain.color,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      <div className="dp-card dp-animate-in" style={{ animationDelay: '120ms', padding: '32px 24px' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${currentDomain.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginBottom: 20,
          }}
        >
          {currentDomain.icon}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--dp-text)' }}>
          오늘 아이의 의사소통 능력은 어떠했나요?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--dp-text-secondary)', marginBottom: 32 }}>
          전체적인 인상을 편하게 선택해주세요
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          {scaleOptions.map((option) => (
            <button
              key={option.score}
              className="dp-scale-btn"
              onClick={() => setSelectedScore(option.score)}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: selectedScore === option.score ? `3px solid ${option.color}` : '2px solid var(--dp-card-border)',
                background: selectedScore === option.score ? `${option.color}20` : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                cursor: 'pointer',
                boxShadow: selectedScore === option.score ? `0 4px 12px ${option.color}40` : 'none',
              }}
            >
              {option.emoji}
            </button>
          ))}
        </div>

        {selectedScore && (
          <div
            className="dp-animate-in"
            style={{
              textAlign: 'center',
              padding: '10px 16px',
              borderRadius: 8,
              background: `${scaleOptions[selectedScore - 1].color}15`,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: scaleOptions[selectedScore - 1].color }}>
              {scaleOptions[selectedScore - 1].label}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dp-text-secondary)', display: 'block', marginBottom: 6 }}>
            메모 (선택사항)
          </label>
          <textarea
            className="dp-input"
            placeholder="오늘 특별히 기억나는 순간이 있나요?"
            rows={3}
            readOnly
            style={{ resize: 'vertical' }}
          />
        </div>

        <button className="dp-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          다음 영역 →
        </button>
      </div>

      <div
        className="dp-animate-in"
        style={{
          animationDelay: '200ms',
          marginTop: 20,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {domains.map((d, i) => (
          <div
            key={d.id}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i < completedCount ? d.color : 'var(--dp-card-border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
