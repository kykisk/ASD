import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Card, Col, Progress, Row, Select, Spin, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAiUsage } from '../hooks/use-admin-ops';
import { useAiConfigs, type AiConfigItem } from '../hooks/use-ai-config';
import {
  useAiFeatureConfig,
  useSaveAiFeatureConfig,
  type AiFeatureMapping,
} from '../hooks/use-ai-feature-config';
import { AI_FEATURES, featureName, kstShort, modelShortName } from '../lib/labels';
import { AiSettingsPage } from './AiSettingsPage';

const { Title, Text } = Typography;

const MODEL_COLORS = ['#0F766E', '#99F6E4', '#6366F1', '#F59E0B', '#94A3B8'];

function UsageChart({ days }: { days: Array<{ date: string; byModel: Record<string, number> }> }) {
  const models = useMemo(() => {
    const set = new Set<string>();
    days.forEach((d) => Object.keys(d.byModel).forEach((m) => set.add(m)));
    return [...set].sort();
  }, [days]);
  const max = Math.max(1, ...days.map((d) => Object.values(d.byModel).reduce((a, b) => a + b, 0)));

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          fontSize: 12,
          color: '#64748B',
          marginBottom: 8,
          minHeight: 18,
        }}
      >
        {models.map((m, i) => (
          <span key={m} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: MODEL_COLORS[i % MODEL_COLORS.length],
              }}
            />
            {modelShortName(m)}
          </span>
        ))}
        {models.length === 0 && <span>아직 기록된 호출이 없어요</span>}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          gap: 12,
          alignItems: 'end',
          height: 140,
        }}
      >
        {days.map((d) => {
          const total = Object.values(d.byModel).reduce((a, b) => a + b, 0);
          return (
            <div
              key={d.date}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <span style={{ fontSize: 11, color: '#475569' }}>{total > 0 ? total : ''}</span>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  height: `${(total / max) * 100}px`,
                }}
              >
                {models.map((m, i) =>
                  d.byModel[m] ? (
                    <div
                      key={m}
                      title={`${modelShortName(m)} ${d.byModel[m]}회`}
                      style={{
                        height: `${(d.byModel[m] / total) * 100}%`,
                        background: MODEL_COLORS[i % MODEL_COLORS.length],
                      }}
                    />
                  ) : null,
                )}
              </div>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                {d.date.slice(5).replace('-', '/')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FeatureRow {
  feature: string;
  configId: string | null;
  calls: number;
  failures: number;
  avgLatencyMs: number;
}

function UsageTab() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { data: usage, isLoading } = useAiUsage(7);
  const { data: configs = [] } = useAiConfigs();
  const { data: mappings = [] } = useAiFeatureConfig();
  const save = useSaveAiFeatureConfig();

  const defaultConfig = configs.find((c: AiConfigItem) => c.isDefault && c.isActive);
  const activeConfigs = configs.filter((c: AiConfigItem) => c.isActive);
  const dailyLimit = defaultConfig?.dailyBudgetLimit ?? null;

  const rows: FeatureRow[] = useMemo(() => {
    const stats = new Map((usage?.today.features ?? []).map((f) => [f.feature, f]));
    const keys = new Set<string>([
      ...Object.keys(AI_FEATURES),
      ...(mappings as AiFeatureMapping[]).map((m) => m.feature),
    ]);
    return [...keys].map((feature) => {
      const s = stats.get(feature);
      return {
        feature,
        configId:
          (mappings as AiFeatureMapping[]).find((m) => m.feature === feature)?.configId ?? null,
        calls: s?.calls ?? 0,
        failures: s?.failures ?? 0,
        avgLatencyMs: s?.avgLatencyMs ?? 0,
      };
    });
  }, [usage, mappings]);

  const changeModel = async (feature: string, configId: string | null) => {
    const next = rows.map((r) => ({
      feature: r.feature,
      configId: r.feature === feature ? configId : r.configId,
    }));
    try {
      await save.mutateAsync(next);
      message.success(`${featureName(feature)}: 모델을 바꿨어요`);
    } catch {
      message.error('저장하지 못했어요. 다시 시도해주세요.');
    }
  };

  if (isLoading || !usage) return <Spin style={{ display: 'block', margin: '60px auto' }} />;

  const pct = dailyLimit ? Math.min(100, Math.round((usage.today.calls / dailyLimit) * 100)) : 0;

  const columns: ColumnsType<FeatureRow> = [
    {
      title: '기능',
      dataIndex: 'feature',
      width: 220,
      render: (f: string) => <span style={{ fontWeight: 500 }}>{featureName(f)}</span>,
    },
    {
      title: '어디서 쓰이나',
      dataIndex: 'feature',
      key: 'where',
      render: (f: string) => <Text type="secondary">{AI_FEATURES[f]?.where ?? '-'}</Text>,
    },
    {
      title: '모델',
      dataIndex: 'configId',
      width: 230,
      render: (configId: string | null, r) => (
        <Select
          size="small"
          style={{ width: 210 }}
          value={configId ?? '__default'}
          loading={save.isPending}
          onChange={(v) => changeModel(r.feature, v === '__default' ? null : v)}
          options={[
            {
              value: '__default',
              label: `기본 (${defaultConfig ? modelShortName(defaultConfig.modelId) : '없음'})`,
            },
            ...activeConfigs.map((c: AiConfigItem) => ({
              value: c.id,
              label: `${c.name} · ${modelShortName(c.modelId)}`,
            })),
          ]}
        />
      ),
    },
    {
      title: '추천',
      dataIndex: 'feature',
      key: 'tier',
      width: 80,
      render: (f: string) =>
        AI_FEATURES[f] ? (
          <Tag color={AI_FEATURES[f].tier === 'QUALITY' ? 'blue' : 'green'}>
            {AI_FEATURES[f].tier === 'QUALITY' ? '품질' : '속도'}
          </Tag>
        ) : null,
    },
    { title: '오늘', dataIndex: 'calls', width: 70, align: 'right' },
    {
      title: '실패',
      dataIndex: 'failures',
      width: 70,
      align: 'right',
      render: (n: number) => (
        <span style={n > 0 ? { color: '#B45309', fontWeight: 700 } : { color: '#64748B' }}>
          {n}
        </span>
      ),
    },
    {
      title: '평균',
      dataIndex: 'avgLatencyMs',
      width: 80,
      align: 'right',
      render: (ms: number) => (
        <Text type="secondary">{ms ? `${(ms / 1000).toFixed(1)}초` : '-'}</Text>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Row gutter={[14, 14]}>
        <Col xs={24} lg={16}>
          <Card size="small" title="최근 7일 호출 수 (모델별)">
            <UsageChart days={usage.days} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="이번 달" style={{ height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              추정 크레딧 사용 (토큰 × 공시 단가)
            </Text>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              ${usage.month.estimatedCostUsd.toFixed(2)}{' '}
              <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
                / $200
              </Text>
            </div>
            <Progress
              percent={Math.min(100, (usage.month.estimatedCostUsd / 200) * 100)}
              showInfo={false}
              strokeColor="#14B8A6"
            />
            <div style={{ fontSize: 13, color: '#334155', marginTop: 8 }}>
              오늘 {usage.today.calls}회
              {dailyLimit != null && ` / 하루 호출 한도 ${dailyLimit.toLocaleString()}회 (${pct}%)`}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              한도는 연결 설정의 기본 연결에서 바꿔요
            </Text>
          </Card>
        </Col>
      </Row>

      <Card size="small" title="기능별 모델 · 오늘 사용" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="feature"
          columns={columns}
          dataSource={rows}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
        />
      </Card>

      <Card size="small" title="최근 실패">
        {usage.recentFailures.length === 0 ? (
          <Text type="secondary">최근 실패한 AI 호출이 없어요</Text>
        ) : (
          usage.recentFailures.slice(0, 10).map((f, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 180px minmax(0,1fr)',
                gap: 10,
                fontSize: 13,
                padding: '6px 0',
                borderTop: i ? '1px solid #F1F5F9' : undefined,
              }}
            >
              <span>{kstShort(f.at)}</span>
              <span>{featureName(f.feature)}</span>
              <Text type="secondary" ellipsis title={f.error}>
                {f.error}
              </Text>
            </div>
          ))
        )}
        <div style={{ marginTop: 8 }}>
          <a onClick={() => navigate('/ai?tab=connections')}>연결 설정에서 연결 테스트하기</a>
        </div>
      </Card>
    </div>
  );
}

export function AiPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'connections' ? 'connections' : 'usage';

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        AI
      </Title>
      <Tabs
        activeKey={tab}
        onChange={(k) => setParams(k === 'usage' ? {} : { tab: k })}
        items={[
          { key: 'usage', label: '사용량 · 기능별 모델', children: <UsageTab /> },
          { key: 'connections', label: '연결 설정', children: <AiSettingsPage /> },
        ]}
      />
    </div>
  );
}
