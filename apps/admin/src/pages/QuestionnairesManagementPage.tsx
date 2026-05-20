import { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Button,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  OrderedListOutlined,
  EyeOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

type QuestionnaireDomain = '의사소통' | '사회성' | '행동' | '감각' | '인지' | '일상생활';
type QuestionnaireStatus = 'active' | 'disabled';

interface Questionnaire {
  id: string;
  name: string;
  familyName: string;
  domain: QuestionnaireDomain;
  questionCount: number;
  createdAt: string;
  status: QuestionnaireStatus;
}

const DOMAINS: QuestionnaireDomain[] = ['의사소통', '사회성', '행동', '감각', '인지', '일상생활'];

const MOCK_DATA: Questionnaire[] = [
  { id: '1', name: '사회적 상호작용 평가', familyName: '박지혜 가족', domain: '사회성', questionCount: 25, createdAt: '2025-04-10T09:00:00Z', status: 'active' },
  { id: '2', name: '의사소통 능력 체크리스트', familyName: '이민호 가족', domain: '의사소통', questionCount: 30, createdAt: '2025-04-12T14:00:00Z', status: 'active' },
  { id: '3', name: '행동 패턴 관찰 기록', familyName: '최유나 가족', domain: '행동', questionCount: 20, createdAt: '2025-04-15T10:30:00Z', status: 'active' },
  { id: '4', name: '감각 민감도 설문', familyName: '정시우 가족', domain: '감각', questionCount: 35, createdAt: '2025-04-18T08:00:00Z', status: 'disabled' },
  { id: '5', name: '인지 발달 평가지', familyName: '김수진 가족', domain: '인지', questionCount: 28, createdAt: '2025-04-20T11:15:00Z', status: 'active' },
  { id: '6', name: '일상생활 자립도 평가', familyName: '오준혁 가족', domain: '일상생활', questionCount: 22, createdAt: '2025-04-22T13:45:00Z', status: 'active' },
  { id: '7', name: '또래 관계 설문', familyName: '한소연 가족', domain: '사회성', questionCount: 18, createdAt: '2025-04-25T09:30:00Z', status: 'active' },
  { id: '8', name: '언어 표현 능력 평가', familyName: '윤도현 가족', domain: '의사소통', questionCount: 32, createdAt: '2025-04-28T15:00:00Z', status: 'disabled' },
  { id: '9', name: '반복 행동 모니터링', familyName: '서민지 가족', domain: '행동', questionCount: 15, createdAt: '2025-05-01T10:00:00Z', status: 'active' },
  { id: '10', name: '청각 민감도 체크', familyName: '강현주 가족', domain: '감각', questionCount: 20, createdAt: '2025-05-03T11:00:00Z', status: 'active' },
  { id: '11', name: '문제 해결 능력 평가', familyName: '신우진 가족', domain: '인지', questionCount: 24, createdAt: '2025-05-05T08:30:00Z', status: 'active' },
  { id: '12', name: '식사 자립도 평가', familyName: '임하영 가족', domain: '일상생활', questionCount: 16, createdAt: '2025-05-07T14:20:00Z', status: 'active' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function QuestionnairesManagementPage() {
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<QuestionnaireDomain | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    let result = MOCK_DATA;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }
    if (domainFilter !== 'ALL') {
      result = result.filter((item) => item.domain === domainFilter);
    }
    return result;
  }, [search, domainFilter]);

  const stats = useMemo(() => ({
    total: MOCK_DATA.length,
    active: MOCK_DATA.filter((q) => q.status === 'active').length,
    totalQuestions: MOCK_DATA.reduce((sum, q) => sum + q.questionCount, 0),
  }), []);

  const columns: ColumnsType<Questionnaire> = [
    { title: '이름', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '가족', dataIndex: 'familyName', key: 'familyName', width: 130 },
    {
      title: '영역',
      dataIndex: 'domain',
      key: 'domain',
      width: 100,
      render: (domain: QuestionnaireDomain) => <Tag color="cyan">{domain}</Tag>,
    },
    { title: '문항수', dataIndex: 'questionCount', key: 'questionCount', width: 80, align: 'center' },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: formatDate,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: QuestionnaireStatus) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => message.info(`${record.name} 상세 보기 (추후 구현)`)}
          />
          <Button
            type="text"
            size="small"
            danger={record.status === 'active'}
            icon={<StopOutlined />}
            onClick={() =>
              message.success(
                record.status === 'active'
                  ? `${record.name} 비활성화됨`
                  : `${record.name} 활성화됨`,
              )
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        질문지 관리
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="총 질문지"
              value={stats.total}
              prefix={<FileTextOutlined style={{ color: '#14b8a6' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="활성 질문지"
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="총 문항수"
              value={stats.totalQuestions}
              prefix={<OrderedListOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Space wrap size="middle" style={{ marginBottom: 16 }}>
        <Input
          placeholder="질문지 이름 검색"
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          value={domainFilter}
          onChange={setDomainFilter}
          style={{ width: 140 }}
          options={[
            { value: 'ALL', label: '전체 영역' },
            ...DOMAINS.map((d) => ({ value: d, label: d })),
          ]}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (t) => `총 ${t}건` }}
        scroll={{ x: 800 }}
        size="middle"
        locale={{ emptyText: '질문지가 없습니다.' }}
      />
    </div>
  );
}
