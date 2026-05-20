import { Link } from 'react-router-dom';
import './design-preview.css';

const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

const sampleEvents: Record<number, { colors: string[]; hasEvent?: boolean }> = {
  1: { colors: ['var(--dp-comm)'] },
  3: { colors: ['var(--dp-motor)', 'var(--dp-social)'] },
  5: { colors: ['var(--dp-comm)', 'var(--dp-cognitive)'] },
  7: { colors: ['var(--dp-emotional)'] },
  8: { colors: ['var(--dp-comm)', 'var(--dp-motor)'] },
  10: { colors: ['var(--dp-social)'] },
  12: { colors: ['var(--dp-comm)', 'var(--dp-cognitive)', 'var(--dp-emotional)'] },
  14: { colors: ['var(--dp-motor)'] },
  15: { colors: ['var(--dp-comm)', 'var(--dp-social)'] },
  17: { colors: ['var(--dp-cognitive)', 'var(--dp-emotional)'] },
  19: { colors: ['var(--dp-comm)'] },
  20: { colors: ['var(--dp-motor)', 'var(--dp-social)', 'var(--dp-cognitive)'] },
  22: { colors: ['var(--dp-emotional)'] },
};

const todayDate = 15;

const legendItems = [
  { color: 'var(--dp-comm)', label: '의사소통' },
  { color: 'var(--dp-social)', label: '사회성' },
  { color: 'var(--dp-motor)', label: '운동' },
  { color: 'var(--dp-cognitive)', label: '인지' },
  { color: 'var(--dp-emotional)', label: '정서' },
];

export function DesignPreviewCalendar() {
  const totalDays = 31;
  const startDay = 3; // Wednesday start

  const blanks = Array.from({ length: startDay }, (_, i) => i);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="dp-root" style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: 560, margin: '0 auto' }}>
      <Link
        to="/design-preview"
        style={{ fontSize: 13, color: 'var(--dp-text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        ← 디자인 시안 목록
      </Link>

      <div className="dp-animate-in" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--dp-text-secondary)', cursor: 'pointer', padding: 8 }}>
            ‹
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>2025년 5월</h1>
          <button style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--dp-text-secondary)', cursor: 'pointer', padding: 8 }}>
            ›
          </button>
        </div>
      </div>

      <div className="dp-card dp-animate-in" style={{ animationDelay: '100ms', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {daysOfWeek.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: 'var(--dp-text-muted)', padding: '8px 0' }}>
              {d}
            </div>
          ))}

          {blanks.map((b) => (
            <div key={`blank-${b}`} />
          ))}

          {days.map((day) => {
            const event = sampleEvents[day];
            const isToday = day === todayDate;
            return (
              <div
                key={day}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--dp-primary)' : 'var(--dp-text)',
                    border: isToday ? '2px solid var(--dp-primary)' : '2px solid transparent',
                    background: isToday ? 'var(--dp-primary-light)' : 'transparent',
                  }}
                >
                  {day}
                </span>
                <div style={{ display: 'flex', gap: 2, marginTop: 4, minHeight: 6 }}>
                  {event?.colors.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: c,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dp-card dp-animate-in" style={{ animationDelay: '200ms', marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--dp-text-secondary)' }}>
          5월 15일 · 오늘
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--dp-primary-light)' }}>
            <span style={{ width: 4, height: 28, borderRadius: 2, background: 'var(--dp-comm)' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>의사소통 평가 완료</p>
              <p style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>점수: 4/5 · 좋음</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#F0EDF8' }}>
            <span style={{ width: 4, height: 28, borderRadius: 2, background: 'var(--dp-social)' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>사회성 평가 완료</p>
              <p style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>점수: 3/5 · 보통</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dp-animate-in" style={{ animationDelay: '300ms', marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {legendItems.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 12, color: 'var(--dp-text-secondary)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
