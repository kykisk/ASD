import { useMemo, useState } from 'react';
import { App, Drawer, Input, List, Segmented, Space, Switch, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminQuestionnaires,
  useQuestionnaireItems,
  useSetQuestionnaireActive,
  type AdminQuestionnaire,
} from '../hooks/use-admin-ops';
import { kstShort } from '../lib/labels';

const { Title, Text } = Typography;

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  NON_LICENSED_USER_INPUT: { label: '직접 만든', color: 'cyan' },
  NON_LICENSED_AI_GENERATED: { label: 'AI가 만든', color: 'blue' },
  LICENSED: { label: '임상 도구', color: 'purple' },
};

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  DAILY_LIVING: '일상생활',
  EMOTIONAL: '정서',
  OTHER: '기타',
};

export function QuestionnairesManagementPage() {
  const { message } = App.useApp();
  const { data = [], isLoading } = useAdminQuestionnaires();
  const setActive = useSetQuestionnaireActive();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('ALL');
  const [viewing, setViewing] = useState<AdminQuestionnaire | null>(null);
  const { data: items = [], isLoading: itemsLoading } = useQuestionnaireItems(viewing?.id ?? null);

  const types = useMemo(() => [...new Set(data.map((q) => q.type))], [data]);
  const filtered = useMemo(
    () =>
      data.filter(
        (q) =>
          (type === 'ALL' || q.type === type) &&
          (!search || `${q.name} ${q.familyName}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [data, type, search],
  );

  const toggle = async (q: AdminQuestionnaire, isActive: boolean) => {
    try {
      await setActive.mutateAsync({ id: q.id, isActive });
      message.success(
        isActive ? `${q.name}: 다시 쓸 수 있어요` : `${q.name}: 가족 화면에서 숨겼어요`,
      );
    } catch {
      message.error('바꾸지 못했어요. 다시 시도해주세요.');
    }
  };

  const columns: ColumnsType<AdminQuestionnaire> = [
    {
      title: '이름',
      dataIndex: 'name',
      render: (name: string, q) => (
        <a onClick={() => setViewing(q)}>
          {name}
          {q.licensedTool && <Text type="secondary"> · {q.licensedTool}</Text>}
        </a>
      ),
    },
    {
      title: '종류',
      dataIndex: 'type',
      width: 110,
      render: (t: string) => <Tag color={TYPE_LABELS[t]?.color}>{TYPE_LABELS[t]?.label ?? t}</Tag>,
    },
    { title: '가족', dataIndex: 'familyName', width: 160, ellipsis: true },
    { title: '문항', dataIndex: 'itemCount', width: 70, align: 'right' },
    { title: '평가 횟수', dataIndex: 'assessmentCount', width: 90, align: 'right' },
    {
      title: '만든 날',
      dataIndex: 'createdAt',
      width: 110,
      render: (iso: string) => kstShort(iso).slice(0, 5),
    },
    {
      title: '사용',
      dataIndex: 'isActive',
      width: 70,
      render: (on: boolean, q) => (
        <Switch size="small" checked={on} onChange={(v) => toggle(q, v)} />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          질문지
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          모든 가족의 질문지예요. 끄면 그 가족 화면에서 더 이상 고를 수 없어요 (지난 평가 기록은
          남아요).
        </Text>
      </div>

      <Space wrap>
        <Input
          placeholder="이름 · 가족 검색"
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
        <Segmented
          value={type}
          onChange={(v) => setType(v as string)}
          options={[
            { value: 'ALL', label: `전체 (${data.length})` },
            ...types.map((t) => ({ value: t, label: TYPE_LABELS[t]?.label ?? t })),
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t) => `${t}개` }}
        size="middle"
        scroll={{ x: 800 }}
        locale={{ emptyText: '질문지가 없어요' }}
      />

      <Drawer open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name} size={520}>
        {viewing && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {viewing.familyName} · 문항 {viewing.itemCount}개 · 평가 {viewing.assessmentCount}회
          </Text>
        )}
        <List
          loading={itemsLoading}
          dataSource={items}
          locale={{ emptyText: '문항이 없어요' }}
          renderItem={(item) => (
            <List.Item>
              <div style={{ display: 'flex', gap: 10 }}>
                <Text type="secondary" style={{ width: 24 }}>
                  {item.orderIndex + 1}
                </Text>
                <div>
                  <div>{item.text}</div>
                  <Tag style={{ marginTop: 4 }}>{DOMAIN_LABELS[item.domain] ?? item.domain}</Tag>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
}
