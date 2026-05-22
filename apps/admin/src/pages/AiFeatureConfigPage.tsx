import { useEffect, useState } from 'react';
import { App, Card, Typography, Select, Button, Table, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAiConfigs, type AiConfigItem } from '../hooks/use-ai-config';
import {
  useAiFeatureConfig,
  useSaveAiFeatureConfig,
  type AiFeatureMapping,
} from '../hooks/use-ai-feature-config';

const { Title } = Typography;

const FEATURE_LABELS: Record<string, string> = {
  CURRICULUM: '커리큘럼 생성',
  INSIGHT: 'AI 인사이트 (주간분석)',
  SCHEDULE_SUGGEST: '스케줄 제안',
  QUESTIONNAIRE_GENERATE: '질문지 AI 생성',
  QUESTIONNAIRE_FILTER: '질문지 라이선스 필터',
};

export function AiFeatureConfigPage() {
  const { message } = App.useApp();
  const { data: featureConfig, isLoading: loadingFeatures } = useAiFeatureConfig();
  const { data: aiConfigs, isLoading: loadingConfigs } = useAiConfigs();
  const saveMutation = useSaveAiFeatureConfig();

  const [mappings, setMappings] = useState<AiFeatureMapping[]>([]);

  useEffect(() => {
    if (featureConfig) {
      setMappings(featureConfig);
    }
  }, [featureConfig]);

  const handleChange = (feature: string, configId: string | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.feature === feature ? { ...m, configId } : m)),
    );
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(mappings);
      message.success('기능별 AI 설정이 저장되었습니다');
    } catch {
      message.error('저장에 실패했습니다');
    }
  };

  if (loadingFeatures || loadingConfigs) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const activeConfigs = (aiConfigs ?? []).filter((c: AiConfigItem) => c.isActive);

  const columns = [
    {
      title: '기능',
      dataIndex: 'feature',
      key: 'feature',
      render: (feature: string) => FEATURE_LABELS[feature] ?? feature,
    },
    {
      title: '사용할 AI 설정',
      dataIndex: 'configId',
      key: 'configId',
      render: (_: string | null, record: AiFeatureMapping) => (
        <Select
          style={{ width: 280 }}
          value={record.configId ?? undefined}
          placeholder="(기본 설정 사용)"
          allowClear
          onChange={(value) => handleChange(record.feature, value ?? null)}
          options={[
            ...activeConfigs.map((c: AiConfigItem) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
      ),
    },
  ];

  return (
    <Card>
      <Title level={4}>기능별 AI 모델 설정</Title>
      <Table
        dataSource={mappings}
        columns={columns}
        rowKey="feature"
        pagination={false}
        style={{ marginBottom: 24 }}
      />
      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSave}
        loading={saveMutation.isPending}
      >
        저장
      </Button>
    </Card>
  );
}
