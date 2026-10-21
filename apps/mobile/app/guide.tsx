import { View, Text, StyleSheet, ScrollView, Image, type ImageSourcePropType } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

// 스크린샷은 scripts/guide-screenshots.mjs 로 다시 찍는다
const SHOTS = {
  today: require('../assets/guide/today.png') as ImageSourcePropType,
  activity: require('../assets/guide/activity.png') as ImageSourcePropType,
  record: require('../assets/guide/record.png') as ImageSourcePropType,
};

const DAILY_FLOW = [
  {
    title: '낮에 활동하고 결과 누르기',
    body: '오늘 화면의 활동을 눌러 방법을 보고, 해본 뒤 결과를 한 번 눌러요.',
  },
  {
    title: '저녁에 오늘 하루 기록 1분',
    body: '아이 상태 5가지, 있었던 일, 센터 수업 내용을 한 화면에 적어요.',
  },
  {
    title: '다음 날 아침, 새 활동 확인',
    body: '새벽 4시에 AI가 어제 기록을 보고 쉽게 또는 한 단계 높여 새 활동을 만들어요.',
  },
];

const SECTIONS: Array<{ title: string; shot?: keyof typeof SHOTS; points: string[] }> = [
  {
    title: '오늘 화면',
    shot: 'today',
    points: [
      '앱을 열면 바로 보이는 화면이에요.',
      '오늘 집에서 할 활동과 진행률(예: 2 / 4 완료)이 보여요.',
      '기록을 마치면 "오늘 하루 기록하기" 버튼이 "오늘 기록 완료"로 바뀌어요.',
      '아래에는 이번 주에 무엇이 달라졌는지 AI가 쉬운 말로 정리해 줘요.',
    ],
  },
  {
    title: '활동하고 기록하기',
    shot: 'activity',
    points: [
      '준비물, 하는 방법, "이러면 성공이에요"를 보고 따라 하면 돼요.',
      '해본 뒤 잘했어요 · 조금 했어요 · 못 했어요 중 하나를 누르면 바로 저장돼요.',
      '한 줄 메모를 남기면 AI가 다음 활동을 만들 때 참고해요. 예: "집게는 아파해서 종이 찢기만 했어요"',
      '잘못 눌렀다면 다른 결과를 다시 누르면 고쳐져요. 못 한 날은 "오늘은 건너뛰기".',
    ],
  },
  {
    title: '오늘 하루 기록',
    shot: 'record',
    points: [
      '오늘 아이가 어땠는지 5가지 영역을 1(힘들었어요)~5(아주 좋았어요)로 눌러요. 모르는 영역은 비워둬도 돼요.',
      '센터 수업이 있었다면 스위치를 켜고 수업 종류와 선생님 말씀을 적어요.',
      '힘든 행동이 있었다면 스위치를 켜고 어떤 일이었는지 한 줄 적어요.',
      '하루에 여러 번 저장해도 괜찮아요. 점수는 하루 한 번만 받아요.',
    ],
  },
  {
    title: '메뉴 둘러보기',
    points: [
      '아래 탭은 매일 쓰는 메뉴예요: 오늘 · 커리큘럼 · 성장 · 논문 · 더보기',
      '성장: 변화 그래프, 날짜별 기록 모아보기, AI 주간 요약을 위쪽 버튼으로 바꿔 봐요.',
      '논문: 아이에게 맞는 해외 논문을 한국어로 요약해 보여줘요.',
      '더보기: 일정 달력, 아이 · 가족, 임상 평가 · 감각 특성 · 월간 보고서, 복약 기록, 마음 체크인 · 힘든 순간 가이드',
    ],
  },
  {
    title: '가족과 함께 쓰기',
    points: [
      '더보기 › 가족 초대 · 관리에서 배우자를 초대하면 같은 아이의 기록을 함께 보고 적을 수 있어요.',
      '누가 기록하든 다음 날 활동에 모두 반영돼요.',
    ],
  },
];

const FAQ = [
  {
    q: '오늘 활동이 안 보여요',
    a: '오늘 화면의 "오늘 활동 만들기"를 누르면 30초 정도 뒤에 만들어져요.',
  },
  {
    q: '휴대폰 홈 화면에 앱처럼 두고 싶어요',
    a: '브라우저 메뉴(공유 버튼)에서 "홈 화면에 추가"를 누르세요.',
  },
  {
    q: '접속할 때 이메일 코드를 물어봐요',
    a: '가족만 들어올 수 있게 한 보안 확인이에요. 한 달에 한 번 정도 메일로 온 6자리 코드를 넣으면 돼요.',
  },
  {
    q: '예전 홈 화면(대시보드)은 어디 있나요?',
    a: '오늘 화면 맨 아래 "자세한 대시보드 보기"에서 볼 수 있어요.',
  },
];

export default function GuideScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        AutiCare는 집에서 아이와 함께할 활동을 매일 추천하고, 기록할수록 아이에게 더 잘 맞춰져요.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>하루 사용 흐름</Text>
        {DAILY_FLOW.map((step, i) => (
          <View key={step.title} style={styles.flowRow}>
            <View style={styles.flowNum}>
              <Text style={styles.flowNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.flowTitle}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.shot && (
            <Image
              source={SHOTS[section.shot]}
              style={styles.shot}
              resizeMode="contain"
              accessibilityLabel={`${section.title} 화면 예시`}
            />
          )}
          {section.points.map((p) => (
            <View key={p} style={styles.pointRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[styles.body, { flex: 1 }]}>{p}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
        {FAQ.map((item) => (
          <View key={item.q} style={styles.faq}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.body}>{item.a}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  lead: { fontSize: fontSize.md, color: colors.text, lineHeight: 24 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  flowRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flowNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowNumText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  flowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  section: { gap: 10 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  shot: {
    width: '100%',
    height: 520,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  pointRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: fontSize.sm, color: colors.primaryDark, lineHeight: 22 },
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  faq: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: 14,
    gap: 4,
  },
  faqQ: { fontSize: 15, fontWeight: '700', color: colors.text },
});
