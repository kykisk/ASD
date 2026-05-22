import { useState, useCallback } from 'react';
import {
  App,
  Card,
  Tag,
  Typography,
  Form,
  Input,
  InputNumber,
  Slider,
  Switch,
  Select,
  Button,
  Space,
  Row,
  Col,
  Modal,
  Popconfirm,
  Empty,
  Spin,
  Badge,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarFilled,
  StarOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import {
  useAiConfigs,
  useCreateAiConfig,
  useUpdateAiConfig,
  useDeleteAiConfig,
  useSetDefaultAiConfig,
  useTestAiConfig,
  type AiProvider,
  type AiConfigItem,
  type CreateAiConfigInput,
  type UpdateAiConfigInput,
} from '../hooks/use-ai-config';

const { Title, Text } = Typography;

const PROVIDER_LABELS: Record<AiProvider, string> = {
  CLAUDE_BEDROCK: 'Claude Bedrock (AWS)',
  CLAUDE_DIRECT: 'Claude Direct (Anthropic)',
  GEMINI: 'Gemini (Google)',
  OPENAI: 'OpenAI',
};

const REGION_OPTIONS = [
  { value: 'us-east-1', label: 'us-east-1 (Virginia)' },
  { value: 'us-west-2', label: 'us-west-2 (Oregon)' },
  { value: 'ap-northeast-2', label: 'ap-northeast-2 (Seoul)' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
  { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
];

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '없음';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function ConfigCard({
  config,
  onEdit,
  onTest,
  onDelete,
  onSetDefault,
  isTesting,
}: {
  config: AiConfigItem;
  onEdit: (config: AiConfigItem) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isTesting: boolean;
}) {
  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        borderLeft: config.isDefault ? '3px solid #14b8a6' : '3px solid transparent',
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <Row align="middle" justify="space-between" wrap={false}>
        <Col flex="auto">
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space size={8} align="center">
              {config.isDefault ? (
                <StarFilled style={{ color: '#14b8a6', fontSize: 14 }} />
              ) : (
                <StarOutlined style={{ color: '#d9d9d9', fontSize: 14 }} />
              )}
              <Text strong style={{ fontSize: 15 }}>{config.name}</Text>
              <Badge
                status={config.isActive ? 'success' : 'default'}
                text={config.isActive ? '활성' : '비활성'}
              />
              {config.isDefault && (
                <Tag color="cyan" style={{ marginLeft: 4 }}>기본</Tag>
              )}
            </Space>
            <Space size={8} style={{ marginLeft: 22 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {PROVIDER_LABELS[config.provider]}
              </Text>
              {config.modelId && (
                <>
                  <Text type="secondary" style={{ fontSize: 13 }}>·</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>{config.modelId}</Text>
                </>
              )}
            </Space>
            {config.lastTestedAt && (
              <Space size={8} style={{ marginLeft: 22 }}>
                {config.lastTestSuccess ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  마지막 테스트: {config.lastTestSuccess ? '성공' : '실패'} · {formatRelativeTime(config.lastTestedAt)}
                </Text>
              </Space>
            )}
          </Space>
        </Col>
        <Col>
          <Space size={4}>
            {!config.isDefault && (
              <Button size="small" type="text" onClick={() => onSetDefault(config.id)}>
                기본으로 설정
              </Button>
            )}
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(config)}
            />
            <Button
              size="small"
              type="text"
              icon={<ThunderboltOutlined />}
              loading={isTesting}
              onClick={() => onTest(config.id)}
            />
            <Popconfirm
              title="이 설정을 삭제하시겠습니까?"
              onConfirm={() => onDelete(config.id)}
              okText="삭제"
              cancelText="취소"
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

function ConfigFormModal({
  open,
  editingConfig,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  editingConfig: AiConfigItem | null;
  onClose: () => void;
  onSubmit: (values: CreateAiConfigInput | UpdateAiConfigInput) => void;
  isLoading: boolean;
}) {
  const [form] = Form.useForm();
  const isEditing = editingConfig !== null;

  const provider: AiProvider | undefined = Form.useWatch('provider', form);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== '' && v !== undefined && v !== null),
      );
      onSubmit(cleaned as CreateAiConfigInput | UpdateAiConfigInput);
    });
  };

  const initialValues = editingConfig
    ? {
        name: editingConfig.name,
        provider: editingConfig.provider,
        modelId: editingConfig.modelId ?? '',
        maxTokens: editingConfig.maxTokens,
        temperature: editingConfig.temperature,
        dailyBudgetLimit: editingConfig.dailyBudgetLimit,
        isActive: editingConfig.isActive,
        isDefault: editingConfig.isDefault,
      }
    : {
        maxTokens: 4096,
        temperature: 0.7,
        dailyBudgetLimit: 100,
        isActive: false,
        isDefault: false,
      };

  return (
    <Modal
      title={isEditing ? `설정 편집: ${editingConfig.name}` : '새 AI 설정 추가'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isLoading}
      okText="저장"
      cancelText="취소"
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        style={{ marginTop: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="설정 이름"
              name="name"
              rules={[{ required: true, message: '이름을 입력하세요' }]}
            >
              <Input placeholder="Bedrock Sonnet 4.5" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="프로바이더"
              name="provider"
              rules={[{ required: !isEditing, message: '프로바이더를 선택하세요' }]}
            >
              <Select
                disabled={isEditing}
                placeholder="프로바이더 선택"
                options={Object.entries(PROVIDER_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {(provider === 'CLAUDE_BEDROCK' || editingConfig?.provider === 'CLAUDE_BEDROCK') && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              Claude Bedrock 설정
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="AWS Region" name="region">
                  <Select options={REGION_OPTIONS} placeholder="리전 선택" allowClear />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Model ID" name="modelId">
                  <Input placeholder="us.anthropic.claude-sonnet-4-5-20250514-v1:0" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Access Key ID" name="accessKeyId">
                  <Input.Password placeholder={editingConfig?.maskedAccessKeyId || 'AKIA...'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Secret Key" name="secretKey">
                  <Input.Password placeholder="••••••••" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {(provider === 'CLAUDE_DIRECT' || editingConfig?.provider === 'CLAUDE_DIRECT') && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              Claude Direct 설정
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="API Key" name="apiKey">
                  <Input.Password placeholder={editingConfig?.maskedApiKey || 'sk-ant-...'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Model ID" name="modelId">
                  <Input placeholder="claude-sonnet-4-20250514" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {(provider === 'GEMINI' || editingConfig?.provider === 'GEMINI') && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              Gemini 설정
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="API Key" name="apiKey">
                  <Input.Password placeholder={editingConfig?.maskedApiKey || 'AIza...'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Model ID" name="modelId">
                  <Input placeholder="gemini-2.0-flash" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {(provider === 'OPENAI' || editingConfig?.provider === 'OPENAI') && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              OpenAI 설정
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="API Key" name="apiKey">
                  <Input.Password placeholder={editingConfig?.maskedApiKey || 'sk-...'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Model ID" name="modelId">
                  <Input placeholder="gpt-4o" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Text type="secondary" style={{ display: 'block', marginBottom: 12, marginTop: 8, fontSize: 13 }}>
          공통 설정
        </Text>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Max Tokens" name="maxTokens">
              <InputNumber min={100} max={32000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Temperature" name="temperature">
              <Slider min={0} max={2} step={0.1} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="일일 예산 (원)" name="dailyBudgetLimit">
              <InputNumber min={1} max={10000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="활성화" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="기본 설정" name="isDefault" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

export function AiSettingsPage() {
  const { message } = App.useApp();
  const { data: configs = [], isLoading } = useAiConfigs();
  const createMutation = useCreateAiConfig();
  const updateMutation = useUpdateAiConfig();
  const deleteMutation = useDeleteAiConfig();
  const setDefaultMutation = useSetDefaultAiConfig();
  const testMutation = useTestAiConfig();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AiConfigItem | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setEditingConfig(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((config: AiConfigItem) => {
    setEditingConfig(config);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingConfig(null);
  }, []);

  const handleModalSubmit = useCallback(
    (values: CreateAiConfigInput | UpdateAiConfigInput) => {
      if (editingConfig) {
        updateMutation.mutate(
          { id: editingConfig.id, data: values as UpdateAiConfigInput },
          {
            onSuccess: () => {
              message.success('설정이 저장되었습니다.');
              handleModalClose();
            },
            onError: () => message.error('저장에 실패했습니다.'),
          },
        );
      } else {
        createMutation.mutate(values as CreateAiConfigInput, {
          onSuccess: () => {
            message.success('새 설정이 추가되었습니다.');
            handleModalClose();
          },
          onError: () => message.error('추가에 실패했습니다.'),
        });
      }
    },
    [editingConfig, updateMutation, createMutation],
  );

  const handleTest = useCallback(
    (id: string) => {
      setTestingId(id);
      testMutation.mutate(id, {
        onSuccess: (result) => {
          setTestingId(null);
          if (result.success) {
            message.success(`연결 성공 (${result.latencyMs}ms)`);
          } else {
            message.error(`연결 실패: ${result.error || '설정을 확인해주세요.'}`);
          }
        },
        onError: () => {
          setTestingId(null);
          message.error('연결 테스트에 실패했습니다.');
        },
      });
    },
    [testMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => message.success('설정이 삭제되었습니다.'),
        onError: () => message.error('삭제에 실패했습니다.'),
      });
    },
    [deleteMutation],
  );

  const handleSetDefault = useCallback(
    (id: string) => {
      setDefaultMutation.mutate(id, {
        onSuccess: () => message.success('기본 프로바이더가 변경되었습니다.'),
        onError: () => message.error('설정 변경에 실패했습니다.'),
      });
    },
    [setDefaultMutation],
  );

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <CloudOutlined style={{ fontSize: 22, color: '#14b8a6' }} />
            <Title level={4} style={{ margin: 0 }}>AI 프로바이더 설정</Title>
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            style={{ backgroundColor: '#14b8a6', borderColor: '#14b8a6' }}
          >
            새 설정 추가
          </Button>
        </Col>
      </Row>

      {configs.length === 0 ? (
        <Empty
          description="등록된 AI 설정이 없습니다"
          style={{ padding: 48 }}
        >
          <Button type="primary" onClick={handleCreate}>
            첫 설정 추가하기
          </Button>
        </Empty>
      ) : (
        configs.map((config) => (
          <ConfigCard
            key={config.id}
            config={config}
            onEdit={handleEdit}
            onTest={handleTest}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            isTesting={testingId === config.id}
          />
        ))
      )}

      <ConfigFormModal
        open={modalOpen}
        editingConfig={editingConfig}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
