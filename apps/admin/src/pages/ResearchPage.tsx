import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Alert, Button, Segmented, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useResearchArticles, useRunJob, type AdminArticle } from '../hooks/use-admin-ops';
import { kstShort } from '../lib/labels';

const { Title, Text, Paragraph } = Typography;

export function ResearchPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'missing'>('all');
  const { data, isLoading } = useResearchArticles(filter === 'missing');
  const runJob = useRunJob();
  const missing = data?.missingSummaries ?? 0;

  const reSummarize = async () => {
    try {
      await runJob.mutateAsync('RESEARCH_RESUMMARY');
      message.success('요약 재처리를 시작했어요. 자동 작업에서 진행 상황을 볼 수 있어요.');
    } catch {
      message.error('시작하지 못했어요.');
    }
  };

  const columns: ColumnsType<AdminArticle> = [
    {
      title: '논문',
      dataIndex: 'title',
      render: (_, a) => (
        <div>
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${a.pubmedId}/`}
            target="_blank"
            rel="noreferrer"
          >
            {a.title}
          </a>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {a.journal ?? ''} {a.publishedAt ? `· ${a.publishedAt.slice(0, 10)}` : ''}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '한국어 요약',
      dataIndex: 'koreanSummary',
      width: 360,
      render: (s: string | null) =>
        s ? (
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: '더보기' }}
            style={{ margin: 0, fontSize: 13 }}
          >
            {s}
          </Paragraph>
        ) : (
          <Tag color="warning">요약 없음</Tag>
        ),
    },
    { title: '추천된 가족', dataIndex: 'matchedFamilies', width: 100, align: 'right' },
    { title: '수집', dataIndex: 'fetchedAt', width: 110, render: (iso: string) => kstShort(iso) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          논문
        </Title>
        <Button onClick={() => navigate('/jobs')}>수집 일정 · 기록 보기</Button>
      </div>

      {missing > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`논문 ${missing}편에 한국어 요약이 없어요`}
          description="수집할 때 AI 호출이 실패한 논문이에요. 재처리하면 요약 없는 논문만 다시 요약해요."
          action={
            <Button size="small" type="primary" loading={runJob.isPending} onClick={reSummarize}>
              요약 재처리
            </Button>
          }
        />
      )}

      <Segmented
        value={filter}
        onChange={(v) => setFilter(v as 'all' | 'missing')}
        options={[
          { value: 'all', label: '전체' },
          { value: 'missing', label: `요약 없음 (${missing})` },
        ]}
        style={{ alignSelf: 'flex-start' }}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t) => `${t}편` }}
        size="middle"
        scroll={{ x: 900 }}
        locale={{ emptyText: '수집된 논문이 없어요' }}
      />
    </div>
  );
}
