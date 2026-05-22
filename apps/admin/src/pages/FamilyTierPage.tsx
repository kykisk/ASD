import { useState, useEffect, useCallback } from 'react';
import { Table, Select, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../services/api';

const { Title } = Typography;

type AiTier = 'DISABLED' | 'BASIC' | 'STANDARD' | 'UNLIMITED';

interface FamilyRow {
  id: string;
  name: string;
  aiTier: AiTier;
  memberCount: number;
  createdAt: string;
}

const TIER_LABELS: Record<AiTier, string> = {
  DISABLED: '비활성',
  BASIC: '기본 (일 5회)',
  STANDARD: '표준 (일 20회)',
  UNLIMITED: '무제한',
};

export function FamilyTierPage() {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/families');
      setFamilies(res.data.data ?? res.data);
    } catch {
      message.error('가족 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleTierChange = useCallback(async (familyId: string, aiTier: AiTier) => {
    try {
      await adminApi.patch(`/admin/families/${familyId}/tier`, { aiTier });
      setFamilies((prev) =>
        prev.map((f) => (f.id === familyId ? { ...f, aiTier } : f)),
      );
      message.success('AI 티어가 변경되었습니다.');
    } catch {
      message.error('AI 티어 변경에 실패했습니다.');
    }
  }, []);

  const columns: ColumnsType<FamilyRow> = [
    {
      title: '가족명',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '멤버 수',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      align: 'center',
    },
    {
      title: 'AI 티어',
      dataIndex: 'aiTier',
      key: 'aiTier',
      width: 200,
      render: (tier: AiTier, record) => (
        <Select
          value={tier}
          style={{ width: 180 }}
          onChange={(value) => handleTierChange(record.id, value)}
          options={Object.entries(TIER_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (iso: string) =>
        new Date(iso).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        가족 AI 관리
      </Title>
      <Table
        columns={columns}
        dataSource={families}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showTotal: (t) => `총 ${t}개 가족` }}
        scroll={{ x: 700 }}
        size="middle"
        locale={{ emptyText: '등록된 가족이 없습니다.' }}
      />
    </div>
  );
}
