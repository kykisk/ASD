import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { GrowthData } from '../../hooks/use-growth';

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

interface GrowthLineChartProps {
  data: GrowthData;
  selectedDomains?: string[];
  height?: number;
  showLegend?: boolean;
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
  dataKey: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#FDFBF7',
        border: '1px solid rgba(91, 138, 114, 0.2)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(91, 138, 114, 0.12)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: '#6B7B8D',
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
            {entry.name}
          </span>
          <span
            style={{
              fontSize: 13,
              color: '#1e293b',
              fontWeight: 700,
              marginLeft: 'auto',
            }}
          >
            {entry.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GrowthLineChart({
  data,
  selectedDomains,
  height = 240,
  showLegend = true,
}: GrowthLineChartProps) {
  const chartData = data.entries.map((entry) => {
    const point: Record<string, string | number> = {
      date: new Date(entry.date).toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
      }),
    };
    entry.domains.forEach((d) => {
      point[d.domain] = d.score;
    });
    return point;
  });

  const allDomains = data.entries[0]?.domains.map((d) => d.domain) || [];
  const domainsToShow =
    selectedDomains && selectedDomains.length > 0
      ? allDomains.filter((d) => selectedDomains.includes(d))
      : allDomains;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(91, 138, 114, 0.08)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: 'rgba(91, 138, 114, 0.12)' }}
          tickLine={false}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        )}
        {domainsToShow.map((domain) => (
          <Line
            key={domain}
            type="monotone"
            dataKey={domain}
            name={DOMAIN_LABELS[domain] || domain}
            stroke={DOMAIN_COLORS[domain] || '#5B8A72'}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: DOMAIN_COLORS[domain] || '#5B8A72',
              stroke: '#FDFBF7',
              strokeWidth: 2,
            }}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
