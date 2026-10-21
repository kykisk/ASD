import { useState } from 'react';
import { App, Button, Card, Empty, Progress, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useJobRuns,
  useJobs,
  useRunJob,
  type BatchRun,
  type JobInfo,
} from '../hooks/use-admin-ops';
import { BATCH_STATUS, batchStatusKey, duration, firstError, kstShort } from '../lib/labels';

const { Title, Text } = Typography;

function StatusTag({ run }: { run: BatchRun | null }) {
  if (!run) return <Tag>기록 없음</Tag>;
  const s = BATCH_STATUS[batchStatusKey(run)] ?? BATCH_STATUS['PENDING'];
  return <Tag color={s.color}>{s.label}</Tag>;
}

/** 작업마다 세는 단위가 다름 (논문 수집은 total=검색어 수, processed=새 논문 수) */
function runCount(run: BatchRun) {
  const fail = run.failedItems ? ` · 실패 ${run.failedItems}` : '';
  switch (run.type) {
    case 'RESEARCH_COLLECTION':
      return `검색어 ${run.totalItems}개 · 논문 ${run.processedItems}편${fail}`;
    case 'CURRICULUM_GENERATION':
      return `${run.processedItems} / ${run.totalItems}명${fail}`;
    case 'RESEARCH_RESUMMARY':
      return `${run.processedItems} / ${run.totalItems}편${fail}`;
    default:
      return `${run.processedItems} / ${run.totalItems}건${fail}`;
  }
}

export function JobsPage() {
  const { message, modal } = App.useApp();
  const { data: jobs = [], isLoading } = useJobs();
  const runJob = useRunJob();
  const [selected, setSelected] = useState<string>('CURRICULUM_GENERATION');
  const { data: runs = [], isLoading: runsLoading } = useJobRuns(selected);
  const selectedJob = jobs.find((j) => j.type === selected);

  const confirmRun = (job: JobInfo) => {
    modal.confirm({
      title: `${job.name}을(를) 지금 실행할까요?`,
      content: `${job.description}. AI 호출이 생길 수 있어요. 결과는 아래 실행 기록에서 확인해요.`,
      okText: '지금 실행',
      cancelText: '취소',
      onOk: async () => {
        try {
          await runJob.mutateAsync(job.type);
          setSelected(job.type);
          message.success('시작했어요. 끝나면 실행 기록에 표시돼요.');
        } catch {
          message.error('실행하지 못했어요. 다시 시도해주세요.');
        }
      },
    });
  };

  const columns: ColumnsType<JobInfo> = [
    {
      title: '작업',
      dataIndex: 'name',
      width: 280,
      render: (_, j) => (
        <div>
          <div style={{ fontWeight: 500 }}>{j.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {j.description}
          </Text>
        </div>
      ),
    },
    { title: '언제', dataIndex: 'schedule', width: 130 },
    {
      title: '마지막 실행',
      key: 'last',
      render: (_, j) => {
        const r = j.lastRun;
        if (!r) return <StatusTag run={null} />;
        if (r.status === 'RUNNING') {
          const pct = r.totalItems ? Math.round((r.processedItems / r.totalItems) * 100) : 0;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusTag run={r} />
              <Progress percent={pct} size="small" style={{ width: 120, margin: 0 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.processedItems}/{r.totalItems}
              </Text>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <StatusTag run={r} />
            <span>
              {kstShort(r.startedAt ?? r.createdAt)} · {runCount(r)}
            </span>
          </div>
        );
      },
    },
    {
      title: '다음 실행',
      dataIndex: 'nextRunAt',
      width: 120,
      render: (iso: string | null) => <Text type="secondary">{iso ? kstShort(iso) : '-'}</Text>,
    },
    {
      title: '',
      key: 'run',
      width: 110,
      render: (_, j) => (
        <Button
          size="small"
          disabled={j.lastRun?.status === 'RUNNING'}
          onClick={(e) => {
            e.stopPropagation();
            confirmRun(j);
          }}
        >
          지금 실행
        </Button>
      ),
    },
  ];

  const runColumns: ColumnsType<BatchRun> = [
    {
      title: '시작',
      key: 'at',
      width: 120,
      render: (_, r) => kstShort(r.startedAt ?? r.createdAt),
    },
    { title: '상태', key: 'status', width: 100, render: (_, r) => <StatusTag run={r} /> },
    { title: '처리', key: 'count', width: 170, render: (_, r) => runCount(r) },
    {
      title: '메모',
      key: 'note',
      render: (_, r) => {
        const err = firstError(r.errors);
        return (
          <Text type="secondary" ellipsis title={err || undefined}>
            {err || (r.completedAt ? `걸린 시간 ${duration(r.startedAt, r.completedAt)}` : '')}
          </Text>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          자동 작업
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          정해진 시간에 서버가 알아서 하는 일이에요. 실패하면 운영 현황에도 표시돼요. 시간은 모두
          한국 시간.
        </Text>
      </div>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="type"
          columns={columns}
          dataSource={jobs}
          loading={isLoading}
          pagination={false}
          size="middle"
          scroll={{ x: 900 }}
          onRow={(j) => ({
            onClick: () => setSelected(j.type),
            style: { cursor: 'pointer', background: j.type === selected ? '#F0FDFA' : undefined },
          })}
        />
      </Card>

      <Card size="small" title={`실행 기록 · ${selectedJob?.name ?? ''}`}>
        {runs.length === 0 && !runsLoading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="아직 실행 기록이 없어요" />
        ) : (
          <Table
            rowKey="id"
            columns={runColumns}
            dataSource={runs}
            loading={runsLoading}
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
