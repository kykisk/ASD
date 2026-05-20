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
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  HddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

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

const MOCK_HEALTH: HealthStatus[] = [
  { service: 'API 상태', status: 'healthy', latencyMs: 12, icon: <ApiOutlined /> },
  { service: 'DB 상태', status: 'healthy', latencyMs: 3, icon: <DatabaseOutlined /> },
  { service: 'Redis 상태', status: 'healthy', latencyMs: 1, icon: <CloudServerOutlined /> },
  { service: 'S3 상태', status: 'unhealthy', latencyMs: 0, icon: <HddOutlined /> },
];

const MOCK_API_LOGS: ApiLog[] = [
  { id: '1', timestamp: '2025-05-18T14:30:12Z', method: 'GET', path: '/v1/families/123/children', statusCode: 200, latencyMs: 45, userId: 'user-1' },
  { id: '2', timestamp: '2025-05-18T14:30:15Z', method: 'POST', path: '/v1/ai/chat', statusCode: 201, latencyMs: 1230, userId: 'user-2' },
  { id: '3', timestamp: '2025-05-18T14:30:18Z', method: 'GET', path: '/v1/admin/users', statusCode: 200, latencyMs: 32, userId: 'admin-1' },
  { id: '4', timestamp: '2025-05-18T14:30:22Z', method: 'PUT', path: '/v1/families/456/questionnaires/1', statusCode: 404, latencyMs: 15, userId: 'user-3' },
  { id: '5', timestamp: '2025-05-18T14:30:25Z', method: 'POST', path: '/v1/auth/login', statusCode: 401, latencyMs: 89, userId: null },
  { id: '6', timestamp: '2025-05-18T14:30:28Z', method: 'GET', path: '/v1/ai/chat/history', statusCode: 500, latencyMs: 5002, userId: 'user-4' },
  { id: '7', timestamp: '2025-05-18T14:30:30Z', method: 'DELETE', path: '/v1/admin/users/99', statusCode: 204, latencyMs: 28, userId: 'admin-1' },
  { id: '8', timestamp: '2025-05-18T14:30:33Z', method: 'GET', path: '/v1/families/789/children', statusCode: 200, latencyMs: 38, userId: 'user-5' },
  { id: '9', timestamp: '2025-05-18T14:30:35Z', method: 'POST', path: '/v1/ai/chat', statusCode: 503, latencyMs: 30000, userId: 'user-6' },
  { id: '10', timestamp: '2025-05-18T14:30:38Z', method: 'GET', path: '/v1/admin/ai-config/claude-bedrock', statusCode: 200, latencyMs: 22, userId: 'admin-1' },
  { id: '11', timestamp: '2025-05-18T14:30:40Z', method: 'POST', path: '/v1/auth/refresh', statusCode: 302, latencyMs: 55, userId: 'user-7' },
  { id: '12', timestamp: '2025-05-18T14:30:42Z', method: 'GET', path: '/v1/families/111/questionnaires', statusCode: 200, latencyMs: 67, userId: 'user-8' },
];

const MOCK_ERROR_SUMMARY: ErrorSummary[] = [
  { endpoint: 'POST /v1/ai/chat', count: 12, lastOccurred: '2025-05-18T14:30:35Z' },
  { endpoint: 'GET /v1/ai/chat/history', count: 5, lastOccurred: '2025-05-18T14:30:28Z' },
  { endpoint: 'PUT /v1/families/:id/questionnaires/:id', count: 3, lastOccurred: '2025-05-18T14:30:22Z' },
  { endpoint: 'POST /v1/auth/login', count: 8, lastOccurred: '2025-05-18T14:30:25Z' },
];

function getStatusCodeColor(code: number): string {
  if (code >= 200 && code < 300) return 'green';
  if (code >= 300 && code < 400) return 'gold';
  if (code >= 400 && code < 500) return 'orange';
  return 'red';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function MonitoringPage() {
  const [healthData, setHealthData] = useState<HealthStatus[]>(MOCK_HEALTH);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHealthData((prev) =>
        prev.map((h) => ({
          ...h,
          latencyMs: h.status === 'healthy' ? Math.floor(Math.random() * 20) + 1 : 0,
        })),
      );
      setRefreshCount((c) => c + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const filteredLogs = useMemo(() => {
    if (statusFilter === 'ALL') return MOCK_API_LOGS;
    if (statusFilter === '2xx') return MOCK_API_LOGS.filter((l) => l.statusCode >= 200 && l.statusCode < 300);
    if (statusFilter === '3xx') return MOCK_API_LOGS.filter((l) => l.statusCode >= 300 && l.statusCode < 400);
    if (statusFilter === '4xx') return MOCK_API_LOGS.filter((l) => l.statusCode >= 400 && l.statusCode < 500);
    if (statusFilter === '5xx') return MOCK_API_LOGS.filter((l) => l.statusCode >= 500);
    return MOCK_API_LOGS;
  }, [statusFilter]);

  const logColumns: ColumnsType<ApiLog> = [
    { title: '시간', dataIndex: 'timestamp', key: 'timestamp', width: 100, render: formatTime },
    {
      title: '메서드',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => <Tag>{method}</Tag>,
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
      width: 100,
      render: formatTime,
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
        title="API 로그"
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
              { value: '3xx', label: '3xx 리다이렉트' },
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

      <Card title="오류 요약 (최근 24시간)" size="small">
        <Table
          columns={errorColumns}
          dataSource={MOCK_ERROR_SUMMARY}
          rowKey="endpoint"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
