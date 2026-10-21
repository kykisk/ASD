import { Link } from 'react-router-dom';

// 스크린샷은 scripts/guide-screenshots.mjs 로 다시 찍는다 (public/guide-images)
const DAILY_FLOW = [
  {
    title: '낮에 활동하고 결과 누르기',
    body: '오늘 화면 왼쪽에서 활동을 고르면 오른쪽에 방법이 나와요. 해본 뒤 결과를 한 번 누르면 저장되고 다음 활동으로 넘어가요.',
  },
  {
    title: '저녁에 오늘 하루 기록 1분',
    body: '"오늘 하루 기록하기"를 누르면 창이 열려요. 아이 상태 5가지, 있었던 일, 센터 수업 내용을 한 번에 적어요.',
  },
  {
    title: '다음 날 아침, 새 활동 확인',
    body: '새벽 4시에 AI가 어제 기록을 보고 쉽게 또는 한 단계 높여 새 활동을 만들어요.',
  },
];

const SECTIONS: Array<{ title: string; image?: string; points: string[] }> = [
  {
    title: '오늘 화면',
    image: '/guide-images/today.png',
    points: [
      '로그인하면 바로 열리는 화면이에요. 사이드바의 "오늘"로도 언제든 돌아올 수 있어요.',
      '왼쪽: 오늘 활동 목록과 진행률, 오늘 하루 기록 버튼, 이번 주 AI 요약',
      '오른쪽: 고른 활동의 준비물 · 하는 방법 · 성공 기준. 아래에서 잘했어요 · 조금 했어요 · 못 했어요를 누르고 한 줄 메모를 남겨요.',
      '메모는 AI가 다음 활동을 만들 때 참고해요. 잘못 눌렀다면 다른 결과를 다시 누르면 고쳐져요.',
    ],
  },
  {
    title: '오늘 하루 기록',
    image: '/guide-images/record.png',
    points: [
      '5가지 영역을 1(힘들었어요)~5(아주 좋았어요)로 눌러요. 모르는 영역은 비워둬도 돼요.',
      '센터 수업이 있었다면 스위치를 켜고 수업 종류와 선생님 말씀을 적어요.',
      '힘든 행동이 있었다면 스위치를 켜고 어떤 일이었는지 한 줄 적어요.',
      'Esc 키나 바깥을 누르면 창이 닫혀요. 저장하지 않은 내용은 사라져요.',
    ],
  },
  {
    title: '메뉴 둘러보기',
    points: [
      '사이드바 위쪽은 매일 쓰는 메뉴예요: 오늘 · 커리큘럼 · 일정 · 성장 · 논문',
      '성장: 변화 그래프, 날짜별 기록 모아보기, AI 주간 요약을 탭으로 바꿔 봐요.',
      '논문: 아이에게 맞는 해외 논문을 한국어로 요약해 보여줘요. 북마크하면 맞춤 요약도 만들 수 있어요.',
      '그 아래 "더보기"에는 가끔 쓰는 메뉴가 있어요: 아이 · 가족, 임상 평가 · 감각 특성 · 월간 보고서, 복약 기록, 마음 체크인 · 힘든 순간 가이드',
    ],
  },
  {
    title: '가족과 함께 쓰기',
    points: [
      '사이드바 › 더보기 › 가족 초대 · 관리에서 배우자를 초대하면 같은 아이의 기록을 함께 보고 적을 수 있어요.',
      '휴대폰에서는 m.auticare.app 에서 같은 계정으로 쓰면 돼요. 누가 어디서 기록하든 다음 날 활동에 반영돼요.',
    ],
  },
];

const FAQ = [
  {
    q: '오늘 활동이 안 보여요',
    a: '오늘 화면의 "오늘 활동 만들기"를 누르면 30초 정도 뒤에 만들어져요.',
  },
  {
    q: '커리큘럼 재생성이 안 돼요',
    a: '이미 결과를 기록한 날은 기록을 지키기 위해 다시 만들 수 없어요. 오늘 기록은 다음 날 활동에 반영돼요.',
  },
  {
    q: '접속할 때 이메일 코드를 물어봐요',
    a: '가족만 들어올 수 있게 한 보안 확인이에요. 한 달에 한 번 정도 메일로 온 6자리 코드를 넣으면 돼요.',
  },
  {
    q: '예전 대시보드는 어디 있나요?',
    a: '오늘 화면 아래 "자세한 대시보드 보기"에서 볼 수 있어요.',
  },
];

export function GuidePage() {
  return (
    <div className="max-w-[880px] mx-auto flex flex-col gap-8 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-[26px] font-bold text-neutral-800">사용 가이드</h1>
        <p className="text-[15px] text-neutral-700 leading-relaxed">
          AutiCare는 집에서 아이와 함께할 활동을 매일 추천하고, 기록할수록 아이에게 더 잘 맞춰져요.
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-neutral-800">하루 사용 흐름</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DAILY_FLOW.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-[13px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[15px] font-bold text-neutral-800">{step.title}</span>
              <span className="text-sm text-neutral-700 leading-relaxed">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-neutral-800">{section.title}</h2>
          {section.image && (
            <img
              src={section.image}
              alt={`${section.title} 화면 예시`}
              className="w-full rounded-2xl border border-neutral-200 shadow-sage-sm"
              loading="lazy"
            />
          )}
          <ul className="flex flex-col gap-1.5">
            {section.points.map((p) => (
              <li key={p} className="flex gap-2 text-[15px] text-neutral-800 leading-relaxed">
                <span className="text-primary-600" aria-hidden="true">
                  •
                </span>
                {p}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-neutral-800">자주 묻는 질문</h2>
        {FAQ.map((item) => (
          <details key={item.q} className="bg-white rounded-xl border border-neutral-200 px-5 py-4">
            <summary className="text-[15px] font-bold text-neutral-800 cursor-pointer">
              {item.q}
            </summary>
            <p className="text-sm text-neutral-700 leading-relaxed mt-2">{item.a}</p>
          </details>
        ))}
      </section>

      <Link
        to="/today"
        className="self-center h-12 px-7 rounded-xl bg-primary-700 text-white font-bold flex items-center"
      >
        오늘 화면으로
      </Link>
    </div>
  );
}
