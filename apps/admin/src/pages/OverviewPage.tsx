import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Empty, Progress, Row, Spin, Typography } from 'antd';
import { useOverview } from '../hooks/use-admin-ops';
import { batchStatusKey, duration, kstShort } from '../lib/labels';

const { Title, Text } = Typography;

const TODO_ACTION: Record<string, string> = {
  RESEARCH_SUMMARY: '요약 재처리',
  AI_FAILURES: 'AI 보기',
  JOB_FAILED: '자동 작업 보기',
  TEST_ACCOUNTS: '정리하기',
  INACTIVE_FAMILY: '보기',
};

const TODO_DOT: Record<string, string> = {
  RESEARCH_SUMMARY: '#F59E0B',
  AI_FAILURES: '#F59E0B',
  JOB_FAILED: '#EF4444',
  TEST_ACCOUNTS: '#94A3B8',
  INACTIVE_FAMILY: '#94A3B8',
};

function StatCard({
  accent,
  label,
  children,
}: {
  accent: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="small" style={{ borderLeft: `4px solid ${accent}`, height: '100%' }}>
      <Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Text>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </Card>
  );
}

export function OverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useOverview();

  if (isLoading || !data) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const night = data.lastNight;
  const nightKey = night ? batchStatusKey(night) : null;
  const nightOk = nightKey === 'COMPLETED';
  const nightLabel =
    nightKey === 'COMPLETED'
      ? '정상'
      : nightKey === 'PARTIAL'
        ? '일부 실패'
        : nightKey === 'FAILED'
          ? '실패'
          : nightKey === 'RUNNING'
            ? '실행 중'
            : '기록 없음';

  const limit = data.ai.dailyLimit;
  const usedPct = limit ? Math.min(100, Math.round((data.ai.todayCalls / limit) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Title level={4} style={{ margin: 0 }}>
          운영 현황
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {kstShort(data.generatedAt)} 기준 · 1분마다 새로고침
        </Text>
      </div>

      <Row gutter={[14, 14]}>
        <Col xs={24} md={8}>
          <StatCard
            accent={nightOk ? '#16A34A' : night ? '#F59E0B' : '#CBD5E1'}
            label="어젯밤 자동 작업"
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: nightOk ? '#15803D' : night ? '#B45309' : '#475569',
              }}
            >
              {nightLabel}
            </span>
            {night && (
              <Text style={{ fontSize: 13 }}>
                커리큘럼 {kstShort(night.startedAt ?? night.createdAt)} · {night.processedItems} /{' '}
                {night.totalItems}명 생성
                {night.completedAt && ` (${duration(night.startedAt, night.completedAt)})`}
              </Text>
            )}
          </StatCard>
        </Col>
        <Col xs={24} md={8}>
          <StatCard accent="#0EA5E9" label="AI 사용 (오늘)">
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              {data.ai.todayCalls.toLocaleString()}회{' '}
              {limit != null && (
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                  / 하루 한도 {limit.toLocaleString()}회
                </Text>
              )}
            </span>
            {limit != null && (
              <Progress
                percent={usedPct}
                showInfo={false}
                size="small"
                strokeColor={usedPct >= 80 ? '#F59E0B' : '#0EA5E9'}
              />
            )}
            <Text style={{ fontSize: 13 }}>
              이번 달 크레딧 약 ${data.ai.monthCostUsd.toFixed(2)} / $200
            </Text>
          </StatCard>
        </Col>
        <Col xs={24} md={8}>
          <StatCard
            accent={data.ai.failures24h > 0 ? '#F59E0B' : '#16A34A'}
            label="AI 실패 (24시간)"
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: data.ai.failures24h > 0 ? '#B45309' : '#15803D',
              }}
            >
              {data.ai.failures24h}건
            </span>
            <Button
              size="small"
              type="link"
              style={{ padding: 0, alignSelf: 'flex-start' }}
              onClick={() => navigate('/ai')}
            >
              AI 사용량 보기
            </Button>
          </StatCard>
        </Col>
      </Row>

      <Row gutter={[14, 14]}>
        <Col xs={24} lg={13}>
          <Card size="small" title="확인이 필요한 것" style={{ height: '100%' }}>
            {data.todos.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="지금은 확인할 것이 없어요" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.todos.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      border: '1px solid #F1F5F9',
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: TODO_DOT[t.kind] ?? '#94A3B8',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>{t.title}</div>
                      {t.detail && (
                        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                          {t.detail}
                        </Text>
                      )}
                    </div>
                    <Button size="small" onClick={() => navigate(t.link)}>
                      {TODO_ACTION[t.kind] ?? '보기'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={11}>
          <Card size="small" title="가족 현황" style={{ height: '100%' }}>
            <Row gutter={[10, 10]}>
              {[
                ['가족', data.stats.families],
                ['아이', data.stats.children],
                ['이번 주 기록한 가족', data.stats.activeFamiliesThisWeek],
                ['새 가입 (7일)', data.stats.newUsers7d],
              ].map(([label, value]) => (
                <Col span={12} key={label}>
                  <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {label}
                    </Text>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                  </div>
                </Col>
              ))}
            </Row>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', margin: '16px 0 8px' }}>
              최근 7일 기록 (가족별)
            </div>
            {data.families.length === 0 ? (
              <Text type="secondary">아이를 등록한 가족이 아직 없어요</Text>
            ) : (
              data.families.map((f) => (
                <div
                  key={f.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}
                >
                  <div style={{ width: 110 }} title={f.name}>
                    <Text ellipsis style={{ width: 110 }}>
                      {f.name}
                    </Text>
                  </div>
                  <Progress
                    percent={Math.round((f.recordDays7 / 7) * 100)}
                    showInfo={false}
                    size="small"
                    strokeColor="#14B8A6"
                    style={{ flex: 1, margin: 0 }}
                  />
                  <div style={{ width: 56, textAlign: 'right', color: '#475569' }}>
                    {f.recordDays7} / 7일
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
