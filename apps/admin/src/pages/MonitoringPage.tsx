import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Select,
  Space,
  Badge,
  Button,
  Tooltip,
  Progress,
  Modal,
  List,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  HddOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../services/api';

const { Title, Text } = Typography;

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  icon: React.ReactNode;
}
interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  userId: string | null;
}
interface ErrorSummary {
  endpoint: string;
  count: number;
  lastOccurred: string;
}
interface BatchJobError {
  query?: string;
  articleId?: string;
  title?: string;
  reason?: string;
  error?: string;
}

interface BatchJob {
  id: string;
  type: string;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: BatchJobError[] | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  targetDate: string | null;
}

const MOCK_HEALTH: HealthStatus[] = [
  { service: 'API 상태', status: 'healthy', latencyMs: 12, icon: <ApiOutlined /> },
  { service: 'DB 상태', status: 'healthy', latencyMs: 3, icon: <DatabaseOutlined /> },
  { service: 'Redis 상태', status: 'healthy', latencyMs: 1, icon: <CloudServerOutlined /> },
  { service: 'S3 상태', status: 'unhealthy', latencyMs: 0, icon: <HddOutlined /> },
];

const MOCK_API_LOGS: ApiLog[] = [
  {
    id: '1',
    timestamp: '2025-05-18T14:30:12Z',
    method: 'GET',
    path: '/v1/families/123/children',
    statusCode: 200,
    latencyMs: 45,
    userId: 'user-1',
  },
  {
    id: '2',
    timestamp: '2025-05-18T14:30:15Z',
    method: 'POST',
    path: '/v1/ai/chat',
    statusCode: 201,
    latencyMs: 1230,
    userId: 'user-2',
  },
  {
    id: '3',
    timestamp: '2025-05-18T14:30:18Z',
    method: 'GET',
    path: '/v1/admin/users',
    statusCode: 200,
    latencyMs: 32,
    userId: 'admin-1',
  },
  {
    id: '4',
    timestamp: '2025-05-18T14:30:22Z',
    method: 'PUT',
    path: '/v1/families/456/questionnaires/1',
    statusCode: 404,
    latencyMs: 15,
    userId: 'user-3',
  },
  {
    id: '5',
    timestamp: '2025-05-18T14:30:25Z',
    method: 'POST',
    path: '/v1/auth/login',
    statusCode: 401,
    latencyMs: 89,
    userId: null,
  },
];

const MOCK_ERROR_SUMMARY: ErrorSummary[] = [
  { endpoint: 'POST /v1/ai/chat', count: 12, lastOccurred: '2025-05-18T14:30:35Z' },
  { endpoint: 'GET /v1/ai/chat/history', count: 5, lastOccurred: '2025-05-18T14:30:28Z' },
];

const JOB_TYPE_LABELS: Record<string, string> = {
  CURRICULUM_GENERATION: '커리큘럼 생성',
  RESEARCH_COLLECTION: '연구 자료 수집',
  RESEARCH_RESUMMARY: '연구 요약 재처리',
  INSIGHTS_GENERATION: 'AI 인사이트 생성',
  REPORT_GENERATION: '보고서 생성',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  RUNNING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기중',
  RUNNING: '실행중',
  COMPLETED: '완료',
  FAILED: '실패',
};

function getStatusCodeColor(code: number): string {
  if (code >= 200 && code < 300) return 'green';
  if (code >= 300 && code < 400) return 'gold';
  if (code >= 400 && code < 500) return 'orange';
  return 'red';
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function durationStr(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '-';
  const end = completedAt ? new Date(completedAt) : new Date();
  const sec = Math.round((end.getTime() - new Date(startedAt).getTime()) / 1000);
  if (sec < 60) return `${sec}초`;
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

export function MonitoringPage() {
  const [healthData, setHealthData] = useState<HealthStatus[]>(MOCK_HEALTH);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshCount, setRefreshCount] = useState(0);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchTypeFilter, setBatchTypeFilter] = useState<string>('ALL');
  const [triggering, setTriggering] = useState(false);
  const [reSummarizing, setReSummarizing] = useState(false);
  const [reSummarizeJobId, setReSummarizeJobId] = useState<string | null>(null);
  const [reSummarizeProgress, setReSummarizeProgress] = useState<{
    processed: number;
    total: number;
    failed: number;
  } | null>(null);
  const [errorModalJob, setErrorModalJob] = useState<BatchJob | null>(null);

  const fetchBatchJobs = async () => {
    setBatchLoading(true);
    try {
      const params: Record<string, string> = { limit: '30' };
      if (batchTypeFilter !== 'ALL') params.type = batchTypeFilter;
      const { data } = await adminApi.get('/admin/batch-jobs', { params });
      setBatchJobs((data as any).data ?? []);
    } catch {
      setBatchJobs([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const triggerResearchBatch = async () => {
    setTriggering(true);
    try {
      await adminApi.post('/admin/research/batch');
      setTimeout(fetchBatchJobs, 1000);
    } finally {
      setTriggering(false);
    }
  };

  const triggerReSummarize = async () => {
    setReSummarizing(true);
    setReSummarizeProgress(null);
    try {
      const { data } = await adminApi.post('/admin/research/re-summarize');
      const result = (data as any).data ?? data;
      setReSummarizeJobId(result.jobId);
      setReSummarizeProgress({ processed: 0, total: result.total, failed: 0 });
    } catch {
      alert('요약 재처리 시작에 실패했습니다.');
      setReSummarizing(false);
    }
  };

  useEffect(() => {
    if (!reSummarizeJobId) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await adminApi.get('/admin/batch-jobs', {
          params: { type: 'RESEARCH_RESUMMARY', limit: '5' },
        });
        const jobs: any[] = (data as any).data ?? [];
        const job = jobs.find((j) => j.id === reSummarizeJobId);
        if (!job) return;
        setReSummarizeProgress({
          processed: job.processedItems,
          total: job.totalItems,
          failed: job.failedItems,
        });
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          clearInterval(poll);
          setReSummarizeJobId(null);
          setReSummarizing(false);
          fetchBatchJobs();
          const succeeded = job.processedItems - job.failedItems;
          alert(
            `요약 재처리 완료\n성공: ${succeeded}건 / 실패: ${job.failedItems}건 / 전체: ${job.totalItems}건`,
          );
          setReSummarizeProgress(null);
        }
      } catch (_) {
        void _;
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [reSummarizeJobId]);

  useEffect(() => {
    fetchBatchJobs();
  }, [batchTypeFilter]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHealthData((prev) =>
        prev.map((h) => ({
          ...h,
          latencyMs: h.status === 'healthy' ? Math.floor(Math.random() * 20) + 1 : 0,
        })),
      );
      setRefreshCount((c) => c + 1);
      fetchBatchJobs();
    }, 30000);
    return () => clearInterval(timer);
  }, [batchTypeFilter]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === '2xx')
      return MOCK_API_LOGS.filter((l) => l.statusCode >= 200 && l.statusCode < 300);
    if (statusFilter === '4xx')
      return MOCK_API_LOGS.filter((l) => l.statusCode >= 400 && l.statusCode < 500);
    if (statusFilter === '5xx') return MOCK_API_LOGS.filter((l) => l.statusCode >= 500);
    return MOCK_API_LOGS;
  }, [statusFilter]);

  const logColumns: ColumnsType<ApiLog> = [
    {
      title: '시간',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 100,
      render: (v) => formatTime(v),
    },
    {
      title: '메서드',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (m: string) => <Tag>{m}</Tag>,
    },
    { title: '경로', dataIndex: 'path', key: 'path', ellipsis: true },
    {
      title: '상태',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 80,
      align: 'center',
      render: (code: number) => <Tag color={getStatusCodeColor(code)}>{code}</Tag>,
    },
    {
      title: '지연(ms)',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      width: 90,
      align: 'right',
      render: (ms: number) => (
        <Text type={ms > 1000 ? 'danger' : undefined}>{ms.toLocaleString()}</Text>
      ),
    },
    {
      title: '사용자',
      dataIndex: 'userId',
      key: 'userId',
      width: 100,
      render: (id: string | null) => id || <Text type="secondary">-</Text>,
    },
  ];

  const errorColumns: ColumnsType<ErrorSummary> = [
    { title: '엔드포인트', dataIndex: 'endpoint', key: 'endpoint' },
    {
      title: '오류 수',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      align: 'center',
      render: (count: number) => <Tag color="red">{count}</Tag>,
    },
    {
      title: '마지막 발생',
      dataIndex: 'lastOccurred',
      key: 'lastOccurred',
      width: 140,
      render: (v) => formatTime(v),
    },
  ];

  const batchColumns: ColumnsType<BatchJob> = [
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      width: 160,
      render: (t: string) => <Text strong>{JOB_TYPE_LABELS[t] ?? t}</Text>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (s: string) => (
        <Badge
          status={STATUS_COLOR[s] as 'default' | 'processing' | 'success' | 'error'}
          text={STATUS_LABEL[s] ?? s}
        />
      ),
    },
    {
      title: '진행',
      key: 'progress',
      width: 180,
      render: (_: unknown, r: BatchJob) => {
        if (!r.totalItems) return <Text type="secondary">-</Text>;
        const pct = Math.round((r.processedItems / r.totalItems) * 100);
        const hasErrors = r.failedItems > 0 && r.errors && r.errors.length > 0;
        return (
          <div>
            <Tooltip title={`${r.processedItems} / ${r.totalItems}`}>
              <Progress
                percent={pct}
                size="small"
                status={
                  r.status === 'FAILED'
                    ? 'exception'
                    : r.status === 'COMPLETED'
                      ? pct === 100
                        ? 'success'
                        : 'normal'
                      : 'active'
                }
              />
            </Tooltip>
            {r.failedItems > 0 && (
              <Text
                type="danger"
                style={{ fontSize: 12, cursor: hasErrors ? 'pointer' : 'default' }}
                onClick={() => hasErrors && setErrorModalJob(r)}
              >
                실패 {r.failedItems}건{hasErrors ? ' (클릭하여 확인)' : ''}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: '시작',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 140,
      render: (v) => formatTime(v),
    },
    {
      title: '소요',
      key: 'duration',
      width: 90,
      render: (_: unknown, r: BatchJob) => durationStr(r.startedAt, r.completedAt),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (v) => formatTime(v),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        시스템 모니터링
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {healthData.map((h) => (
          <Col span={6} key={h.service}>
            <Card size="small">
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <span style={{ fontSize: 20, color: '#14b8a6' }}>{h.icon}</span>
                  <Text strong>{h.service}</Text>
                </Space>
                <Space>
                  <Badge
                    status={h.status === 'healthy' ? 'success' : 'error'}
                    text={h.status === 'healthy' ? '정상' : '장애'}
                  />
                  {h.status === 'healthy' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  )}
                </Space>
                {h.status === 'healthy' && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    응답: {h.latencyMs}ms
                  </Text>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Text type="secondary" style={{ fontSize: 12, marginBottom: 16, display: 'block' }}>
        자동 갱신 (30초 간격) · 갱신 횟수: {refreshCount}
      </Text>

      <Card
        title="배치 작업 이력"
        size="small"
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Select
              value={batchTypeFilter}
              onChange={setBatchTypeFilter}
              style={{ width: 160 }}
              size="small"
              options={[
                { value: 'ALL', label: '전체 유형' },
                { value: 'RESEARCH_COLLECTION', label: '연구 자료 수집' },
                { value: 'CURRICULUM_GENERATION', label: '커리큘럼 생성' },
                { value: 'INSIGHTS_GENERATION', label: 'AI 인사이트' },
              ]}
            />
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={fetchBatchJobs}
              loading={batchLoading}
            >
              새로고침
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={triggerResearchBatch}
              loading={triggering}
            >
              연구 배치 실행
            </Button>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={triggerReSummarize}
              loading={reSummarizing}
            >
              {reSummarizeProgress
                ? `재처리 중 (${reSummarizeProgress.processed}/${reSummarizeProgress.total})`
                : '요약 재처리'}
            </Button>
          </Space>
        }
      >
        <Table
          columns={batchColumns}
          dataSource={batchJobs}
          rowKey="id"
          loading={batchLoading}
          pagination={{ pageSize: 10, showTotal: (t) => `총 ${t}건` }}
          scroll={{ x: 800 }}
          size="small"
          locale={{ emptyText: '배치 실행 이력이 없습니다' }}
        />
      </Card>

      <Card
        title="API 로그 (샘플)"
        size="small"
        style={{ marginBottom: 24 }}
        extra={
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            size="small"
            options={[
              { value: 'ALL', label: '전체' },
              { value: '2xx', label: '2xx 성공' },
              { value: '4xx', label: '4xx 클라이언트' },
              { value: '5xx', label: '5xx 서버' },
            ]}
          />
        }
      >
        <Table
          columns={logColumns}
          dataSource={filteredLogs}
          rowKey="id"
          pagination={{ pageSize: 8, showTotal: (t) => `총 ${t}건` }}
          scroll={{ x: 700 }}
          size="small"
        />
      </Card>

      <Card title="오류 요약 (샘플)" size="small">
        <Table
          columns={errorColumns}
          dataSource={MOCK_ERROR_SUMMARY}
          rowKey="endpoint"
          pagination={false}
          size="small"
        />
      </Card>

      <Modal
        title={`오류 상세 내역 — ${JOB_TYPE_LABELS[errorModalJob?.type ?? ''] ?? errorModalJob?.type ?? ''}`}
        open={!!errorModalJob}
        onCancel={() => setErrorModalJob(null)}
        footer={null}
        width={640}
      >
        {errorModalJob?.errors && errorModalJob.errors.length > 0 ? (
          <List
            size="small"
            dataSource={errorModalJob.errors}
            renderItem={(err, idx) => (
              <List.Item key={idx}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag color="red">#{idx + 1}</Tag>
                    {err.query && <Tag color="blue">쿼리: {err.query}</Tag>}
                    {err.articleId && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        ID: {err.articleId}
                      </Text>
                    )}
                  </div>
                  {err.title && (
                    <Text strong style={{ display: 'block', marginTop: 4 }}>
                      {err.title}
                    </Text>
                  )}
                  <Text type="danger" style={{ fontSize: 13 }}>
                    {err.reason ?? err.error ?? '알 수 없는 오류'}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">저장된 오류 정보가 없습니다.</Text>
        )}
      </Modal>
    </div>
  );
}
