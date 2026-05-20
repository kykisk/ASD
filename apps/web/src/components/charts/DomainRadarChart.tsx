import { useEffect, useState } from 'react';

interface DomainRadarChartProps {
  domains: { domain: string; label: string; score: number; maxScore: number }[];
  size?: number;
}

const DOMAIN_COLORS: Record<string, string> = {
  communication: '#7B9FD4',
  social: '#E8A87C',
  motor: '#9B8EC4',
  cognitive: '#7EC8C8',
  emotional: '#F2B880',
};

export function DomainRadarChart({ domains, size = 280 }: DomainRadarChartProps) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimProgress(1);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
  const levels = 4;
  const angleStep = (2 * Math.PI) / domains.length;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const dist = value * r * animProgress;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const polygonPoints = domains
    .map((d, i) => {
      const normalized = d.maxScore > 0 ? d.score / d.maxScore : 0;
      const p = getPoint(i, normalized);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', margin: '0 auto' }}
    >
      {Array.from({ length: levels }, (_, l) => {
        const levelR = (r * (l + 1)) / levels;
        const pts = domains
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
            stroke="rgba(91, 138, 114, 0.15)"
            strokeWidth={l === levels - 1 ? 1.5 : 0.7}
          />
        );
      })}

      {domains.map((_, i) => {
        const p = getPoint(i, 1 / animProgress || 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + (p.x - cx) / (animProgress || 1)}
            y2={cy + (p.y - cy) / (animProgress || 1)}
            stroke="rgba(91, 138, 114, 0.12)"
            strokeWidth={0.7}
          />
        );
      })}

      <polygon
        points={polygonPoints}
        fill="rgba(91, 138, 114, 0.2)"
        stroke="#5B8A72"
        strokeWidth={2}
        style={{
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      {domains.map((d, i) => {
        const normalized = d.maxScore > 0 ? d.score / d.maxScore : 0;
        const p = getPoint(i, normalized);
        return (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={DOMAIN_COLORS[d.domain] || '#5B8A72'}
            style={{
              transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        );
      })}

      {domains.map((d, i) => {
        const labelDist = r + size * 0.09;
        const angle = angleStep * i - Math.PI / 2;
        const x = cx + labelDist * Math.cos(angle);
        const y = cy + labelDist * Math.sin(angle);
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#475569"
            fontWeight={500}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
