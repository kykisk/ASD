export interface Milestone {
  id: string;
  title: string;
  achievedAt: string | null;
  targetDate?: string;
  domain: string;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  childName: string;
}

const DOMAIN_COLORS: Record<string, string> = {
  communication: '#7B9FD4',
  social: '#E8A87C',
  motor: '#9B8EC4',
  cognitive: '#7EC8C8',
  emotional: '#F2B880',
};

const DOMAIN_LABELS: Record<string, string> = {
  communication: '의사소통',
  social: '사회성',
  motor: '운동',
  cognitive: '인지',
  emotional: '정서',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function MilestoneTimeline({ milestones, childName }: MilestoneTimelineProps) {
  const sorted = [...milestones].sort((a, b) => {
    const dateA = a.achievedAt || a.targetDate || '';
    const dateB = b.achievedAt || b.targetDate || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <div>
      <p
        style={{
          fontSize: 13,
          color: '#64748b',
          marginBottom: 20,
        }}
      >
        {childName}의 발달 여정
      </p>

      <div style={{ position: 'relative', paddingLeft: 28 }}>
        <div
          style={{
            position: 'absolute',
            left: 9,
            top: 4,
            bottom: 4,
            width: 2,
            background: 'linear-gradient(to bottom, rgba(91,138,114,0.3), rgba(91,138,114,0.05))',
            borderRadius: 1,
          }}
        />

        {sorted.map((milestone, i) => {
          const achieved = !!milestone.achievedAt;
          const color = DOMAIN_COLORS[milestone.domain] || '#5B8A72';

          return (
            <div
              key={milestone.id}
              style={{
                position: 'relative',
                marginBottom: i < sorted.length - 1 ? 24 : 0,
                opacity: 0,
                animation: `fadeSlideIn 0.4s ease forwards ${i * 100}ms`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -23,
                  top: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: achieved ? color : '#FDFBF7',
                  border: `2.5px solid ${color}`,
                  boxShadow: achieved ? `0 2px 8px ${color}40` : 'none',
                  transition: 'all 0.3s ease',
                }}
              />

              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: achieved ? '#334155' : '#94a3b8',
                    textDecoration: achieved ? 'line-through' : 'none',
                    textDecorationColor: achieved ? `${color}80` : undefined,
                    marginBottom: 4,
                  }}
                >
                  {milestone.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: `${color}15`,
                      color: color,
                      fontWeight: 500,
                    }}
                  >
                    {DOMAIN_LABELS[milestone.domain] || milestone.domain}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {achieved
                      ? `달성: ${formatDate(milestone.achievedAt!)}`
                      : milestone.targetDate
                        ? `목표: ${formatDate(milestone.targetDate)}`
                        : '진행 중'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
