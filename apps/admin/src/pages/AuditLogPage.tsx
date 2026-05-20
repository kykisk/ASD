import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Tag,
  message,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  ipAddress: string;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: '1', timestamp: '2025-05-18T14:30:00Z', userName: '김관리', action: 'UPDATE', resource: 'AiConfig', resourceId: 'claude-bedrock', ipAddress: '192.168.1.10' },
  { id: '2', timestamp: '2025-05-18T14:25:00Z', userName: '김관리', action: 'CREATE', resource: 'User', resourceId: 'user-21', ipAddress: '192.168.1.10' },
  { id: '3', timestamp: '2025-05-18T13:50:00Z', userName: '박지혜', action: 'CREATE', resource: 'Questionnaire', resourceId: 'q-15', ipAddress: '10.0.0.55' },
  { id: '4', timestamp: '2025-05-18T12:40:00Z', userName: '김관리', action: 'DELETE', resource: 'User', resourceId: 'user-99', ipAddress: '192.168.1.10' },
  { id: '5', timestamp: '2025-05-18T11:30:00Z', userName: '이민호', action: 'UPDATE', resource: 'Child', resourceId: 'child-5', ipAddress: '10.0.0.42' },
  { id: '6', timestamp: '2025-05-18T10:15:00Z', userName: '김관리', action: 'UPDATE', resource: 'AiConfig', resourceId: 'gemini', ipAddress: '192.168.1.10' },
  { id: '7', timestamp: '2025-05-17T22:00:00Z', userName: '최유나', action: 'CREATE', resource: 'Observation', resourceId: 'obs-88', ipAddress: '10.0.0.78' },
  { id: '8', timestamp: '2025-05-17T20:45:00Z', userName: '김관리', action: 'UPDATE', resource: 'User', resourceId: 'user-5', ipAddress: '192.168.1.10' },
  { id: '9', timestamp: '2025-05-17T19:30:00Z', userName: '정시우', action: 'DELETE', resource: 'Questionnaire', resourceId: 'q-3', ipAddress: '10.0.0.33' },
  { id: '10', timestamp: '2025-05-17T18:00:00Z', userName: '김관리', action: 'CREATE', resource: 'AiConfig', resourceId: 'openai', ipAddress: '192.168.1.10' },
  { id: '11', timestamp: '2025-05-17T16:30:00Z', userName: '한소연', action: 'UPDATE', resource: 'Family', resourceId: 'fam-8', ipAddress: '10.0.0.61' },
  { id: '12', timestamp: '2025-05-17T15:00:00Z', userName: '김관리', action: 'DELETE', resource: 'AiConfig', resourceId: 'claude-direct', ipAddress: '192.168.1.10' },
  { id: '13', timestamp: '2025-05-17T14:00:00Z', userName: '오준혁', action: 'CREATE', resource: 'Observation', resourceId: 'obs-87', ipAddress: '10.0.0.78' },
  { id: '14', timestamp: '2025-05-17T12:00:00Z', userName: '김관리', action: 'UPDATE', resource: 'SystemConfig', resourceId: 'sys-1', ipAddress: '192.168.1.10' },
  { id: '15', timestamp: '2025-05-16T10:00:00Z', userName: '서민지', action: 'CREATE', resource: 'Child', resourceId: 'child-12', ipAddress: '10.0.0.44' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const filtered = useMemo(() => {
    let result = MOCK_AUDIT_LOGS;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((log) => log.userName.toLowerCase().includes(q));
    }

    if (actionFilter !== 'ALL') {
      result = result.filter((log) => log.action === actionFilter);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').toDate().getTime();
      const end = dateRange[1].endOf('day').toDate().getTime();
      result = result.filter((log) => {
        const ts = new Date(log.timestamp).getTime();
        return ts >= start && ts <= end;
      });
    }

    return result;
  }, [search, actionFilter, dateRange]);

  const handleExportCsv = useCallback(() => {
    const headers = ['timestamp', '사용자', '액션', '리소스', '리소스ID', 'IP주소'];
    const rows = filtered.map((log) => [
      log.timestamp,
      log.userName,
      log.action,
      log.resource,
      log.resourceId,
      log.ipAddress,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('CSV 파일이 다운로드되었습니다.');
  }, [filtered]);

  const columns: ColumnsType<AuditLog> = [
    {
      title: '시간',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: formatDateTime,
    },
    { title: '사용자', dataIndex: 'userName', key: 'userName', width: 100 },
    {
      title: '액션',
      dataIndex: 'action',
      key: 'action',
      width: 90,
      align: 'center',
      render: (action: AuditAction) => <Tag color={ACTION_COLORS[action]}>{action}</Tag>,
    },
    { title: '리소스', dataIndex: 'resource', key: 'resource', width: 130 },
    { title: '리소스ID', dataIndex: 'resourceId', key: 'resourceId', width: 130 },
    { title: 'IP주소', dataIndex: 'ipAddress', key: 'ipAddress', width: 130 },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          감사 로그
        </Title>
        <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
          CSV 내보내기
        </Button>
      </div>

      <Space wrap size="middle" style={{ marginBottom: 16 }}>
        <Input
          placeholder="사용자 검색"
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          value={actionFilter}
          onChange={setActionFilter}
          style={{ width: 130 }}
          options={[
            { value: 'ALL', label: '전체 액션' },
            { value: 'CREATE', label: 'CREATE' },
            { value: 'UPDATE', label: 'UPDATE' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
        />
        <RangePicker
          onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
          placeholder={['시작일', '종료일']}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (t) => `총 ${t}건` }}
        scroll={{ x: 800 }}
        size="middle"
        locale={{ emptyText: '감사 로그가 없습니다.' }}
      />
    </div>
  );
}
