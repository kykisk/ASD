import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Badge,
  Space,
  Popconfirm,
  message,
  Typography,
  DatePicker,
  Tag,
} from 'antd';
import { PlusOutlined, CheckCircleOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../services/api';

const { Title } = Typography;

type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
type LicensedTool = 'M_CHAT_R_F' | 'CARS_2' | 'ABC' | 'ADOS_2' | 'SCQ';

interface LicenseRow {
  id: string;
  tool: LicensedTool;
  status: LicenseStatus;
  activatedAt: string;
  expiresAt: string | null;
  notes: string | null;
  family: { id: string; name: string };
}

interface FamilyOption {
  id: string;
  name: string;
}

const TOOL_LABELS: Record<LicensedTool, string> = {
  M_CHAT_R_F: 'M-CHAT-R/F',
  CARS_2: 'CARS-2',
  ABC: 'ABC',
  ADOS_2: 'ADOS-2',
  SCQ: 'SCQ',
};

const STATUS_BADGE: Record<
  LicenseStatus,
  { status: 'success' | 'error' | 'default'; text: string }
> = {
  ACTIVE: { status: 'success', text: '활성' },
  EXPIRED: { status: 'error', text: '만료' },
  REVOKED: { status: 'default', text: '취소됨' },
};

export function LicenseManagementPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [form] = Form.useForm();

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/licenses', { params: { limit: 100 } });
      const data = res.data.data ?? res.data;
      setLicenses(Array.isArray(data) ? data : (data.items ?? []));
    } catch {
      message.error('라이선스 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFamilies = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/families');
      setFamilies(res.data.data ?? res.data ?? []);
    } catch {
      message.error('가족 목록을 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    fetchLicenses();
    fetchFamilies();
  }, [fetchLicenses, fetchFamilies]);

  const handleRegister = async (values: {
    tool: LicensedTool;
    familyId: string;
    licenseKey: string;
    expiresAt?: { toISOString: () => string };
    notes?: string;
  }) => {
    setRegistering(true);
    try {
      await adminApi.post('/admin/licenses', {
        tool: values.tool,
        familyId: values.familyId,
        licenseKey: values.licenseKey,
        expiresAt: values.expiresAt?.toISOString(),
        notes: values.notes,
      });
      message.success('라이선스가 등록되었습니다.');
      setRegisterOpen(false);
      form.resetFields();
      fetchLicenses();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      message.error(msg ?? '라이선스 등록에 실패했습니다.');
    } finally {
      setRegistering(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await adminApi.patch(`/admin/licenses/${id}/activate`);
      message.success('라이선스가 활성화되었습니다.');
      fetchLicenses();
    } catch {
      message.error('활성화에 실패했습니다.');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await adminApi.patch(`/admin/licenses/${id}/revoke`);
      message.success('라이선스가 취소되었습니다.');
      fetchLicenses();
    } catch {
      message.error('취소에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.delete(`/admin/licenses/${id}`);
      message.success('라이선스가 삭제되었습니다.');
      fetchLicenses();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  const filtered =
    statusFilter === 'ALL' ? licenses : licenses.filter((l) => l.status === statusFilter);

  const columns: ColumnsType<LicenseRow> = [
    {
      title: '도구',
      dataIndex: 'tool',
      key: 'tool',
      width: 130,
      render: (t: LicensedTool) => <Tag color="blue">{TOOL_LABELS[t] ?? t}</Tag>,
    },
    {
      title: '가족',
      key: 'family',
      width: 160,
      render: (_: unknown, r: LicenseRow) => r.family?.name ?? r.family?.id ?? '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: LicenseStatus) => (
        <Badge status={STATUS_BADGE[s]?.status ?? 'default'} text={STATUS_BADGE[s]?.text ?? s} />
      ),
    },
    {
      title: '만료일',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 130,
      render: (v: string | null) =>
        v ? (
          new Date(v).toLocaleDateString('ko-KR')
        ) : (
          <span style={{ color: '#94a3b4' }}>없음</span>
        ),
    },
    {
      title: '등록일',
      dataIndex: 'activatedAt',
      key: 'activatedAt',
      width: 130,
      render: (v: string) => new Date(v).toLocaleDateString('ko-KR'),
    },
    {
      title: '메모',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_: unknown, r: LicenseRow) => (
        <Space size="small">
          {r.status !== 'ACTIVE' && (
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(r.id)}
            >
              활성화
            </Button>
          )}
          {r.status === 'ACTIVE' && (
            <Popconfirm
              title="라이선스를 취소하시겠습니까?"
              onConfirm={() => handleRevoke(r.id)}
              okText="취소"
              cancelText="돌아가기"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<StopOutlined />} danger>
                취소
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="라이선스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
            onConfirm={() => handleDelete(r.id)}
            okText="삭제"
            cancelText="돌아가기"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          라이선스 관리
        </Title>
        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            size="small"
            options={[
              { value: 'ALL', label: '전체' },
              { value: 'ACTIVE', label: '활성' },
              { value: 'EXPIRED', label: '만료' },
              { value: 'REVOKED', label: '취소됨' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRegisterOpen(true)}>
            라이선스 등록
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15, showTotal: (t) => `총 ${t}건` }}
        size="small"
        locale={{ emptyText: '등록된 라이선스가 없습니다' }}
      />

      <Modal
        title="라이선스 등록"
        open={registerOpen}
        onCancel={() => {
          setRegisterOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="등록"
        cancelText="취소"
        confirmLoading={registering}
      >
        <Form form={form} layout="vertical" onFinish={handleRegister} style={{ marginTop: 16 }}>
          <Form.Item
            label="도구"
            name="tool"
            rules={[{ required: true, message: '도구를 선택하세요' }]}
          >
            <Select
              placeholder="도구 선택"
              options={Object.entries(TOOL_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item
            label="가족"
            name="familyId"
            rules={[{ required: true, message: '가족을 선택하세요' }]}
          >
            <Select
              placeholder="가족 선택"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={families.map((f) => ({ value: f.id, label: f.name }))}
            />
          </Form.Item>
          <Form.Item
            label="라이선스 키"
            name="licenseKey"
            rules={[{ required: true, message: '라이선스 키를 입력하세요' }]}
          >
            <Input.Password placeholder="라이선스 키 입력 (SHA-256으로 해시 저장됨)" />
          </Form.Item>
          <Form.Item label="만료일 (선택)" name="expiresAt">
            <DatePicker style={{ width: '100%' }} placeholder="만료일 없음 = 무기한" />
          </Form.Item>
          <Form.Item label="메모 (선택)" name="notes">
            <Input.TextArea rows={2} placeholder="관리자 메모" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
