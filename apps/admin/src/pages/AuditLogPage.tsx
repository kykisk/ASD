import { useState } from 'react';
import { App, Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../services/api';
import { useAuditLogs, type AuditLogRow } from '../hooks/use-admin-ops';
import { kstDateTime } from '../lib/labels';

const { Title, Text } = Typography;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const PAGE_SIZE = 50;

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function AuditLogPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('ALL');
  const [resource, setResource] = useState('');
  const [exporting, setExporting] = useState(false);

  const filters = {
    action: action === 'ALL' ? undefined : action,
    resource: resource.trim() || undefined,
  };
  const { data, isLoading } = useAuditLogs({ page, limit: PAGE_SIZE, ...filters });

  /** 지금 필터 조건의 최근 1,000건을 CSV 로 */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: AuditLogRow[] = [];
      for (let p = 1; p <= 5; p++) {
        const { data: res } = await adminApi.get('/admin/audit-logs', {
          params: { page: p, limit: 200, ...filters },
        });
        rows.push(...res.data.data);
        if (rows.length >= res.data.meta.total) break;
      }
      const header = ['시간(KST)', '이메일', '이름', '액션', '리소스', '리소스ID', 'IP'];
      const lines = rows.map((r) =>
        [
          kstDateTime(r.createdAt),
          r.userEmail,
          r.userName,
          r.action,
          r.resource,
          r.resourceId,
          r.ipAddress,
        ]
          .map(csvCell)
          .join(','),
      );
      const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      message.success(`${rows.length}건을 내려받았어요`);
    } catch {
      message.error('내려받지 못했어요.');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<AuditLogRow> = [
    { title: '시간', dataIndex: 'createdAt', width: 190, render: kstDateTime },
    {
      title: '사용자',
      key: 'user',
      width: 240,
      render: (_, r) =>
        r.userEmail ? (
          <span>
            {r.userName} <Text type="secondary">{r.userEmail}</Text>
          </span>
        ) : (
          <Text type="secondary">(로그인 전 · 시스템)</Text>
        ),
    },
    {
      title: '액션',
      dataIndex: 'action',
      width: 90,
      render: (a: string) => <Tag color={ACTION_COLORS[a] ?? 'default'}>{a}</Tag>,
    },
    { title: '리소스', dataIndex: 'resource', width: 160 },
    { title: '리소스 ID', dataIndex: 'resourceId', ellipsis: true },
    { title: 'IP', dataIndex: 'ipAddress', width: 140 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            감사 로그
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            데이터를 만들거나 바꾸거나 지운 기록이에요.
          </Text>
        </div>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>
          CSV 내보내기
        </Button>
      </div>

      <Space wrap>
        <Select
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          style={{ width: 130 }}
          options={[
            { value: 'ALL', label: '전체 액션' },
            { value: 'CREATE', label: 'CREATE' },
            { value: 'UPDATE', label: 'UPDATE' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
        />
        <Input.Search
          placeholder="리소스 (예: auth, children)"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => {
            setResource(v);
            setPage(1);
          }}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isLoading}
        size="middle"
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.meta.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `총 ${t.toLocaleString()}건`,
        }}
        locale={{ emptyText: '기록이 없어요' }}
      />
    </div>
  );
}
