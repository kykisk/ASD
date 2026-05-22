import { useEffect, useState } from 'react';
import { App, Card, Typography, Select, Button, Table, Spin, Tag, Alert } from 'antd';
import { SaveOutlined, ThunderboltOutlined, StarOutlined } from '@ant-design/icons';
import { useAiConfigs, type AiConfigItem } from '../hooks/use-ai-config';
import {
  useAiFeatureConfig,
  useSaveAiFeatureConfig,
  type AiFeatureMapping,
} from '../hooks/use-ai-feature-config';

const { Title, Text } = Typography;

const FEATURE_LABELS: Record<string, string> = {
  CURRICULUM: '커리큘럼 생성',
  INSIGHT: 'AI 인사이트 (주간분석)',
  SCHEDULE_SUGGEST: '스케줄 제안',
  QUESTIONNAIRE_GENERATE: '질문지 AI 생성',
  QUESTIONNAIRE_FILTER: '질문지 라이선스 필터',
};

const FEATURE_RECOMMENDATIONS: Record<string, { tier: 'QUALITY' | 'FAST'; reason: string }> = {
  CURRICULUM: { tier: 'QUALITY', reason: '발달 수준 이해 + 구체적 활동 설계 필요' },
  INSIGHT: { tier: 'QUALITY', reason: '따뜻한 한국어 톤 + 분석 정확도' },
  SCHEDULE_SUGGEST: { tier: 'FAST', reason: '구조적 입출력, 복잡한 추론 불필요' },
  QUESTIONNAIRE_GENERATE: { tier: 'FAST', reason: '패턴 기반 질문 생성' },
  QUESTIONNAIRE_FILTER: { tier: 'QUALITY', reason: '저작권 유사도 뉘앙스 판단 필요' },
};

export function AiFeatureConfigPage() {
  const { message } = App.useApp();
  const { data: featureConfig, isLoading: loadingFeatures } = useAiFeatureConfig();
  const { data: aiConfigs, isLoading: loadingConfigs } = useAiConfigs();
  const saveMutation = useSaveAiFeatureConfig();

  const [mappings, setMappings] = useState<AiFeatureMapping[]>([]);

  useEffect(() => {
    if (featureConfig && Array.isArray(featureConfig)) {
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
      render: (feature: string) => (
        <div>
          <div style={{ fontWeight: 600 }}>{FEATURE_LABELS[feature] ?? feature}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {FEATURE_RECOMMENDATIONS[feature]?.reason}
          </Text>
        </div>
      ),
    },
    {
      title: '추천 등급',
      dataIndex: 'feature',
      key: 'recommendation',
      width: 120,
      render: (feature: string) => {
        const rec = FEATURE_RECOMMENDATIONS[feature];
        if (!rec) return '-';
        return rec.tier === 'QUALITY' ? (
          <Tag icon={<StarOutlined />} color="blue">Quality</Tag>
        ) : (
          <Tag icon={<ThunderboltOutlined />} color="green">Fast</Tag>
        );
      },
    },
    {
      title: '사용할 AI 설정',
      dataIndex: 'configId',
      key: 'configId',
      width: 300,
      render: (_: string | null, record: AiFeatureMapping) => (
        <Select
          style={{ width: '100%' }}
          value={record.configId ?? undefined}
          placeholder="(기본 설정 사용)"
          allowClear
          onChange={(value) => handleChange(record.feature, value ?? null)}
          options={activeConfigs.map((c: AiConfigItem) => ({
            value: c.id,
            label: c.name,
          }))}
        />
      ),
    },
  ];

  return (
    <Card>
      <Title level={4}>기능별 AI 모델 설정</Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        message="모델 등급 가이드"
        description={
          <div style={{ fontSize: 13 }}>
            <p style={{ margin: '4px 0' }}>
              <Tag color="blue">Quality</Tag> <b>Sonnet급</b> — 품질 중심. 느리지만 정확 (8~15초). 커리큘럼, 인사이트, 필터링에 적합.
            </p>
            <p style={{ margin: '4px 0' }}>
              <Tag color="green">Fast</Tag> <b>Haiku급</b> — 속도 중심. 빠르고 저렴 (2~5초). 구조적 생성, 간단한 분석에 적합.
            </p>
            <p style={{ margin: '4px 0', color: '#6B7B8D' }}>
              미지정 시 ★ 기본 프로바이더가 사용됩니다.
            </p>
          </div>
        }
      />
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
