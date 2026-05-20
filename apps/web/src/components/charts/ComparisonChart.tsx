import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ComparisonChartProps {
  weeklyData: { week: string; score: number }[];
  monthlyData: { month: string; score: number }[];
}

type Period = 'weekly' | 'monthly';

interface BarTooltipPayload {
  value: number;
  name: string;
}

function ComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: BarTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#FDFBF7',
        border: '1px solid rgba(91, 138, 114, 0.2)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(91, 138, 114, 0.12)',
      }}
    >
      <p style={{ fontSize: 11, color: '#6B7B8D', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#5B8A72' }}>
        {payload[0].value.toFixed(1)}점
      </p>
    </div>
  );
}

export function ComparisonChart({ weeklyData, monthlyData }: ComparisonChartProps) {
  const [period, setPeriod] = useState<Period>('weekly');

  const chartData =
    period === 'weekly'
      ? weeklyData.map((d) => ({ name: d.week, score: d.score }))
      : monthlyData.map((d) => ({ name: d.month, score: d.score }));

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(91, 138, 114, 0.06)',
          borderRadius: 10,
          padding: 4,
          marginBottom: 20,
          width: 'fit-content',
        }}
      >
        {([['weekly', '주간'], ['monthly', '월간']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: 'none',
              background: period === key ? '#5B8A72' : 'transparent',
              color: period === key ? '#fff' : '#64748b',
              fontSize: 13,
              fontWeight: period === key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B8A72" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#5B8A72" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(91, 138, 114, 0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: 'rgba(91, 138, 114, 0.12)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ComparisonTooltip />} cursor={{ fill: 'rgba(91, 138, 114, 0.04)' }} />
          <Bar
            dataKey="score"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
