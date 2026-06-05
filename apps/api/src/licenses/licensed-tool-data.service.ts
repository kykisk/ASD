import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { LicensedTool } from '@auticare/prisma-client';

interface ItemDefinition {
  domain: string;
  text: string;
  description?: string;
  weight?: number;
}

interface ToolSchema {
  name: string;
  description: string;
  domains: string[];
  items: ItemDefinition[];
}

const TOOL_SCHEMAS: Record<LicensedTool, ToolSchema> = {
  M_CHAT_R_F: {
    name: 'M-CHAT-R/F (수정된 자폐 체크리스트)',
    description: '18~24개월 영아의 자폐 스펙트럼 장애 조기 선별 도구 (데모 데이터)',
    domains: ['SOCIAL', 'COMMUNICATION', 'COGNITIVE'],
    items: [
      {
        domain: 'SOCIAL',
        text: '이름을 부르면 반응합니까?',
        description: '친숙한 목소리로 이름을 부를 때 고개를 돌리거나 반응하는지 확인',
      },
      {
        domain: 'SOCIAL',
        text: '사람들에게 관심을 보입니까?',
        description: '다른 사람에게 접근하거나 상호작용을 시도하는지 확인',
      },
      {
        domain: 'SOCIAL',
        text: '사회적 미소를 보입니까?',
        description: '사람을 보고 웃거나 표정으로 반응하는지 확인',
      },
      {
        domain: 'SOCIAL',
        text: '다른 아이들에게 관심을 보입니까?',
        description: '다른 아이들을 쳐다보거나 따라가려는지 확인',
      },
      {
        domain: 'COMMUNICATION',
        text: '물건이나 관심 있는 것을 손가락으로 가리킵니까?',
        description: '요구가 아닌 관심 공유를 위한 지시적 가리키기',
      },
      {
        domain: 'COMMUNICATION',
        text: '장난감이나 물건을 가져와 보여줍니까?',
        description: '단순히 원하는 것이 아닌 보여주기 위해 가져오는지',
      },
      {
        domain: 'COMMUNICATION',
        text: '눈 맞춤을 적절히 합니까?',
        description: '대화 중 자연스러운 눈 맞춤이 있는지 확인',
      },
      {
        domain: 'COMMUNICATION',
        text: '부모가 가리키는 곳을 바라봅니까?',
        description: '공동 주의(joint attention)가 가능한지 확인',
      },
      {
        domain: 'COMMUNICATION',
        text: '두 단어 이상을 연결하여 말합니까?',
        description: '예: "엄마 줘", "물 마셔" 등 두 단어 조합',
      },
      {
        domain: 'COMMUNICATION',
        text: '의미 있는 단어를 사용합니까?',
        description: '의사소통 목적으로 단어를 사용하는지 확인',
      },
      {
        domain: 'COGNITIVE',
        text: '가상 놀이(상상 놀이)를 합니까?',
        description: '인형에게 밥을 먹이거나 전화 통화 흉내 등',
      },
      {
        domain: 'COGNITIVE',
        text: '놀이에서 다른 사람을 모방합니까?',
        description: '다른 사람의 행동을 따라 하는지 확인',
      },
      {
        domain: 'COGNITIVE',
        text: '여러 개의 물건을 묶거나 정렬하여 놉니까?',
        description: '기능적이지 않은 반복 행동이 아닌 조직적 놀이',
      },
      {
        domain: 'COGNITIVE',
        text: '보이지 않는 물건을 찾습니까?',
        description: '물건이 숨겨질 때 찾으러 가는지 (대상 영속성)',
      },
      {
        domain: 'SOCIAL',
        text: '다른 사람의 고통에 반응합니까?',
        description: '누군가 우는 소리나 아픈 모습에 관심을 보이는지',
      },
      {
        domain: 'SOCIAL',
        text: '처음 보는 상황에서 부모를 확인합니까?',
        description: '낯선 상황에서 눈으로 부모를 찾거나 확인하는지',
      },
      {
        domain: 'COMMUNICATION',
        text: '부모와 번갈아 가며 소리나 행동을 주고받습니까?',
        description: '대화처럼 주고받는 상호작용(vocalization turn-taking)',
      },
      {
        domain: 'MOTOR',
        text: '특이한 손이나 손가락 움직임을 보입니까?',
        description: '손 펄럭이기, 손가락 반복 동작 등 이상한 손 움직임',
      },
      {
        domain: 'COGNITIVE',
        text: '여러 개의 물건에 지나치게 집착합니까?',
        description: '장난감 정렬, 줄 세우기 등 특정 행동에 과도한 집착',
      },
      {
        domain: 'SOCIAL',
        text: '낯선 환경에서 극도로 불안해합니까?',
        description: '일상의 변화나 낯선 곳에서 과도한 불안 반응',
      },
    ],
  },

  CARS_2: {
    name: 'CARS-2 (아동기 자폐 평가 척도)',
    description: '자폐 스펙트럼 장애의 존재 여부 및 중증도를 평가하는 임상 척도 (데모 데이터)',
    domains: ['SOCIAL', 'COMMUNICATION', 'MOTOR', 'COGNITIVE', 'EMOTIONAL'],
    items: [
      {
        domain: 'SOCIAL',
        text: '사람과의 관계',
        description: '1=정상 범위, 2=경미한 이상, 3=중등도 이상, 4=심각한 이상',
        weight: 1.0,
      },
      {
        domain: 'COGNITIVE',
        text: '모방 능력',
        description: '동작, 소리, 단어를 모방하는 능력',
        weight: 1.0,
      },
      {
        domain: 'EMOTIONAL',
        text: '정서적 반응',
        description: '상황에 적절한 정서 반응의 유무',
        weight: 1.0,
      },
      {
        domain: 'MOTOR',
        text: '신체 사용',
        description: '자기 신체 사용의 이상함 (예: 특이한 자세, 상동 행동)',
        weight: 1.0,
      },
      {
        domain: 'COGNITIVE',
        text: '물체 사용',
        description: '장난감 및 물체 사용의 적절성과 흥미',
        weight: 1.0,
      },
      {
        domain: 'COGNITIVE',
        text: '변화에 대한 적응',
        description: '일과나 환경 변화에 대한 저항 정도',
        weight: 1.0,
      },
      {
        domain: 'SOCIAL',
        text: '시각적 반응',
        description: '눈 맞춤 및 시각적 자극에 대한 반응',
        weight: 1.0,
      },
      {
        domain: 'COMMUNICATION',
        text: '청각적 반응',
        description: '소리 및 언어 자극에 대한 반응',
        weight: 1.0,
      },
      {
        domain: 'COGNITIVE',
        text: '미각/후각/촉각 반응',
        description: '감각 자극에 대한 비정상적 반응',
        weight: 1.0,
      },
      {
        domain: 'EMOTIONAL',
        text: '두려움 및 불안',
        description: '두려움의 수준과 무해한 자극에 대한 두려움',
        weight: 1.0,
      },
      {
        domain: 'COMMUNICATION',
        text: '언어적 의사소통',
        description: '언어 사용의 양과 질, 메아리 현상 유무',
        weight: 1.0,
      },
      {
        domain: 'COMMUNICATION',
        text: '비언어적 의사소통',
        description: '제스처, 표정, 지시 등 비언어 소통 능력',
        weight: 1.0,
      },
      {
        domain: 'MOTOR',
        text: '활동 수준',
        description: '과활동 또는 저활동, 비정상적인 활동 패턴',
        weight: 1.0,
      },
      {
        domain: 'COGNITIVE',
        text: '지적 기능의 일관성',
        description: '지적 기능의 불균형 또는 비일관성',
        weight: 1.0,
      },
      {
        domain: 'SOCIAL',
        text: '전반적 인상',
        description: '임상가의 자폐 증상에 대한 전반적 평가',
        weight: 1.0,
      },
    ],
  },

  ABC: {
    name: 'ABC (이상행동 체크리스트)',
    description: '지적장애 및 발달장애인의 이상행동을 평가하는 5개 하위 척도 (데모 데이터)',
    domains: ['EMOTIONAL', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'COMMUNICATION'],
    items: [
      { domain: 'EMOTIONAL', text: '별다른 이유 없이 소리를 지르거나 비명을 지른다', weight: 1.0 },
      {
        domain: 'EMOTIONAL',
        text: '자신을 해치거나 다치게 하는 행동을 한다 (예: 머리 박기, 물어뜯기)',
        weight: 1.0,
      },
      { domain: 'EMOTIONAL', text: '요구가 좌절되면 심하게 울거나 발버둥 친다', weight: 1.0 },
      {
        domain: 'EMOTIONAL',
        text: '공격적인 행동을 한다 (타인을 때리거나 물거나 긁는다)',
        weight: 1.0,
      },
      { domain: 'EMOTIONAL', text: '물건을 던지거나 부순다', weight: 1.0 },
      { domain: 'EMOTIONAL', text: '쉽게 기분이 변하고 예측하기 어렵다', weight: 1.0 },
      { domain: 'EMOTIONAL', text: '과민하고 작은 자극에도 강하게 반응한다', weight: 1.0 },
      { domain: 'SOCIAL', text: '타인과의 상호작용을 피하거나 거부한다', weight: 1.0 },
      { domain: 'SOCIAL', text: '다른 사람들에 무관심하고 혼자 있으려 한다', weight: 1.0 },
      { domain: 'SOCIAL', text: '사회 활동에 참여하지 않으려 한다', weight: 1.0 },
      { domain: 'SOCIAL', text: '눈 맞춤을 피하거나 거의 하지 않는다', weight: 1.0 },
      { domain: 'SOCIAL', text: '표정이 적거나 감정 표현을 거의 하지 않는다', weight: 1.0 },
      { domain: 'MOTOR', text: '손이나 손가락을 반복적으로 펄럭인다', weight: 1.0 },
      { domain: 'MOTOR', text: '몸을 앞뒤로 반복적으로 흔든다', weight: 1.0 },
      { domain: 'MOTOR', text: '특정 자세를 유지하거나 반복적인 움직임을 보인다', weight: 1.0 },
      { domain: 'MOTOR', text: '발끝으로 걷는다', weight: 1.0 },
      { domain: 'MOTOR', text: '물체를 반복적으로 돌리거나 두드린다', weight: 1.0 },
      { domain: 'COGNITIVE', text: '주의가 산만하고 과제에 집중하지 못한다', weight: 1.0 },
      {
        domain: 'COGNITIVE',
        text: '한 자리에 가만히 있지 못하고 지속적으로 움직인다',
        weight: 1.0,
      },
      { domain: 'COGNITIVE', text: '충동적으로 행동하고 결과를 생각하지 않는다', weight: 1.0 },
      { domain: 'COGNITIVE', text: '지시를 따르지 않으려 하거나 무시한다', weight: 1.0 },
      { domain: 'COGNITIVE', text: '활동 간 전환이 어렵고 고집이 강하다', weight: 1.0 },
      {
        domain: 'COMMUNICATION',
        text: '반향어(에코랄리아)를 보인다 (들은 말을 반복)',
        weight: 1.0,
      },
      { domain: 'COMMUNICATION', text: '부적절한 상황에서 웃거나 낄낄거린다', weight: 1.0 },
      {
        domain: 'COMMUNICATION',
        text: '의사소통이 어렵고 말이나 언어 발달이 지연되어 있다',
        weight: 1.0,
      },
    ],
  },

  ADOS_2: {
    name: 'ADOS-2 (자폐 관찰 진단)',
    description: '전문가 관찰 기반 자폐 진단 도구 (데모 데이터 - 전문가 전용)',
    domains: ['SOCIAL', 'COMMUNICATION', 'MOTOR'],
    items: [
      { domain: 'SOCIAL', text: '[전문가 관찰] 자유 놀이에서의 사회적 접근', weight: 1.0 },
      { domain: 'COMMUNICATION', text: '[전문가 관찰] 언어적 의사소통 시도', weight: 1.0 },
      { domain: 'SOCIAL', text: '[전문가 관찰] 공동 주의 및 시선 지시', weight: 1.0 },
    ],
  },

  SCQ: {
    name: 'SCQ (사회적 의사소통 질문지)',
    description: '사회적 의사소통 문제 선별 도구 (데모 데이터)',
    domains: ['COMMUNICATION', 'SOCIAL'],
    items: [
      {
        domain: 'COMMUNICATION',
        text: '현재 단어를 사용하여 의사소통합니까? (메아리 아닌 자발어)',
        weight: 1.0,
      },
      { domain: 'SOCIAL', text: '대화 중 얼굴 표정이나 몸짓을 사용합니까?', weight: 1.0 },
      { domain: 'COMMUNICATION', text: '대화를 시작하고 유지할 수 있습니까?', weight: 1.0 },
    ],
  },
};

@Injectable()
export class LicensedToolDataService {
  constructor(private readonly prisma: PrismaService) {}

  getSchema(tool: LicensedTool): ToolSchema {
    return TOOL_SCHEMAS[tool];
  }

  async createForFamily(familyId: string, tool: LicensedTool, createdBy: string): Promise<string> {
    const schema = TOOL_SCHEMAS[tool];

    const existing = await this.prisma.questionnaire.findFirst({
      where: { familyId, type: 'LICENSED', licensedTool: tool },
    });
    if (existing) return existing.id;

    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        familyId,
        type: 'LICENSED',
        licensedTool: tool,
        name: schema.name,
        description: schema.description,
        domains: schema.domains,
        isActive: true,
        createdBy,
        items: {
          create: schema.items.map((item, idx) => ({
            domain: item.domain,
            text: item.text,
            description: item.description ?? null,
            orderIndex: idx,
            weight: item.weight ?? 1.0,
          })),
        },
      },
    });

    return questionnaire.id;
  }

  async removeForFamily(familyId: string, tool: LicensedTool): Promise<void> {
    await this.prisma.questionnaire.deleteMany({
      where: { familyId, type: 'LICENSED', licensedTool: tool },
    });
  }
}
