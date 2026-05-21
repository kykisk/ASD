import { useState, useCallback } from 'react';
import {
  Card,
  Tag,
  Typography,
  Collapse,
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
  message,
  Radio,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import {
  useAiConfigs,
  UpsertAiConfigInput,
  useUpsertAiConfig,
  useTestConnection,
  type AiProvider,
  type AiProviderConfig,
} from '../hooks/use-ai-config';

const { Title, Text } = Typography;

const PROVIDER_LABELS: Record<AiProvider, string> = {
  'CLAUDE_BEDROCK': 'Claude Bedrock (AWS)',
  'CLAUDE_DIRECT': 'Claude Direct (Anthropic)',
  'GEMINI': 'Gemini (Google)',
  'OPENAI': 'OpenAI',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProviderCard({
  config,
  onSetDefault,
}: {
  config: AiProviderConfig;
  onSetDefault: (provider: AiProvider) => void;
}) {
  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Row align="middle" justify="space-between">
        <Col>
          <Space>
            <CloudOutlined style={{ fontSize: 18, color: '#14b8a6' }} />
            <Text strong>{PROVIDER_LABELS[config.provider]}</Text>
            <Tag color={config.isActive ? 'success' : 'error'}>
              {config.isActive ? '활성' : '비활성'}
            </Tag>
            {config.isDefault && <Tag color="processing">기본 프로바이더</Tag>}
          </Space>
        </Col>
        <Col>
          <Space size="small">
            {config.lastTestedAt && (
              <>
                {config.lastTestSuccess ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDateTime(config.lastTestedAt)}
                </Text>
              </>
            )}
            {!config.isDefault && config.isActive && (
              <Button size="small" type="link" onClick={() => onSetDefault(config.provider)}>
                기본으로 설정
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

function ProviderConfigForm({
  config,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: {
  config: AiProviderConfig;
  onSave: (provider: AiProvider, values: Record<string, unknown>) => void;
  onTest: (provider: AiProvider) => void;
  isSaving: boolean;
  isTesting: boolean;
}) {
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(config.provider, values);
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        region: '',
        accessKeyId: '',
        secretKey: '',
        apiKey: '',
        modelId: config.modelId ?? '',
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        dailyBudgetLimit: config.dailyBudgetLimit,
        isActive: config.isActive,
      }}
      size="middle"
    >
      {config.provider === 'CLAUDE_BEDROCK' && (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="AWS Region" name="region" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'us-east-1', label: 'us-east-1' },
                    { value: 'us-west-2', label: 'us-west-2' },
                    { value: 'ap-northeast-2', label: 'ap-northeast-2' },
                    { value: 'eu-west-1', label: 'eu-west-1' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Model ID" name="modelId" rules={[{ required: true }]}>
                <Input placeholder="claude-sonnet-4-20250514" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="AWS Access Key ID" name="accessKeyId">
                <Input.Password placeholder="AKIA..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="AWS Secret Key" name="secretKey">
                <Input.Password placeholder="••••••••" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {config.provider === 'CLAUDE_DIRECT' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="API Key" name="apiKey" rules={[{ required: true }]}>
              <Input.Password placeholder="sk-ant-..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Model ID" name="modelId" rules={[{ required: true }]}>
              <Input placeholder="claude-sonnet-4-20250514" />
            </Form.Item>
          </Col>
        </Row>
      )}

      {config.provider === 'GEMINI' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="API Key" name="apiKey" rules={[{ required: true }]}>
              <Input.Password placeholder="AIza..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Model ID" name="modelId" rules={[{ required: true }]}>
              <Input placeholder="gemini-2.0-flash" />
            </Form.Item>
          </Col>
        </Row>
      )}

      {config.provider === 'OPENAI' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="API Key" name="apiKey" rules={[{ required: true }]}>
              <Input.Password placeholder="sk-..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Model ID" name="modelId" rules={[{ required: true }]}>
              <Input placeholder="gpt-4o" />
            </Form.Item>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Max Tokens" name="maxTokens" rules={[{ required: true }]}>
            <InputNumber min={100} max={32000} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Temperature" name="temperature">
            <Slider min={0} max={2} step={0.1} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="일일 예산 한도 (원)" name="dailyBudgetLimit">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16} align="middle">
        <Col span={6}>
          <Form.Item label="활성화" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={18} style={{ textAlign: 'right' }}>
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => onTest(config.provider)}
              loading={isTesting}
            >
              연결 테스트
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={isSaving}
            >
              저장
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );
}

export function AiSettingsPage() {
  const { data: configs = [], isLoading } = useAiConfigs();
  const upsert = useUpsertAiConfig();
  const test = useTestConnection();
  const [testingProvider, setTestingProvider] = useState<AiProvider | null>(null);
  const [savingProvider, setSavingProvider] = useState<AiProvider | null>(null);

  const handleSetDefault = useCallback(
    (provider: AiProvider) => {
      upsert.mutate({ provider, data: { isDefault: true } });
      message.success(`${PROVIDER_LABELS[provider]}이(가) 기본 프로바이더로 설정되었습니다.`);
    },
    [upsert],
  );

  const handleSave = useCallback(
    async (provider: AiProvider, values: Record<string, unknown>) => {
      setSavingProvider(provider);
      upsert.mutate({ provider, data: values as UpsertAiConfigInput }, {
        onSuccess: () => {
          setSavingProvider(null);
          message.success(`${PROVIDER_LABELS[provider]} 설정이 저장되었습니다.`);
        },
        onError: () => {
          setSavingProvider(null);
          message.error('저장에 실패했습니다.');
        },
      });
    },
    [upsert],
  );

  const handleTest = useCallback(
    async (provider: AiProvider) => {
      setTestingProvider(provider);
      test.mutate(provider, {
        onSuccess: (result) => {
          setTestingProvider(null);
          if (result.success) {
            message.success(`연결 성공 (${result.latencyMs}ms)`);
          } else {
            message.error(`연결 실패: ${result.error || '프로바이더 설정을 확인해주세요.'}`);
          }
        },
        onError: () => {
          setTestingProvider(null);
          message.error('연결 테스트에 실패했습니다.');
        },
      });
    },
    [test],
  );

  if (isLoading) {
    return <div style={{ padding: 24 }}>로딩 중...</div>;
  }

  const ALL_PROVIDERS: AiProvider[] = ['CLAUDE_BEDROCK', 'CLAUDE_DIRECT', 'GEMINI', 'OPENAI'];
  const displayConfigs = ALL_PROVIDERS.map((provider) => {
    const existing = configs.find((c) => c.provider === provider);
    return existing ?? {
      provider,
      isActive: false,
      isDefault: false,
      lastTestedAt: null,
      lastTestSuccess: null,
      modelId: null,
      maxTokens: 4096,
      temperature: 0.7,
      dailyBudgetLimit: 100,
    } as AiProviderConfig;
  });

  const collapseItems = displayConfigs.map((config) => ({
    key: config.provider,
    label: (
      <Space>
        <Text strong>{PROVIDER_LABELS[config.provider]}</Text>
        <Tag color={config.isActive ? 'success' : 'default'}>
          {config.isActive ? '활성' : '비활성'}
        </Tag>
      </Space>
    ),
    children: (
      <ProviderConfigForm
        config={config}
        onSave={handleSave}
        onTest={handleTest}
        isSaving={savingProvider === config.provider}
        isTesting={testingProvider === config.provider}
      />
    ),
  }));

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        AI 설정
      </Title>

      <div style={{ marginBottom: 24 }}>
        {configs.map((config) => (
          <ProviderCard key={config.provider} config={config} onSetDefault={handleSetDefault} />
        ))}
      </div>

      <Title level={5} style={{ marginBottom: 12 }}>
        프로바이더 설정
      </Title>
      <Collapse items={collapseItems} defaultActiveKey={['claude-bedrock']} />

      <div style={{ marginTop: 24 }}>
        <Text type="secondary">
          기본 프로바이더 선택:
        </Text>
        <Radio.Group
          value={configs.find((c) => c.isDefault)?.provider}
          onChange={(e) => handleSetDefault(e.target.value)}
          style={{ marginLeft: 12 }}
        >
          {configs
            .filter((c) => c.isActive)
            .map((c) => (
              <Radio key={c.provider} value={c.provider}>
                {PROVIDER_LABELS[c.provider]}
              </Radio>
            ))}
        </Radio.Group>
      </div>
    </div>
  );
}
