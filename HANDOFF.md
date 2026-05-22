HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- "phase1 구현해볼까" → Phase 1 전체 구현 완료 (8주)
- "go" × 6 → Phase 2 전체 구현 완료 (6주)
- Phase 2 검증: 다수 버그 발견 및 수정 완료
- "Phase2 테스트는 이만하면 된거같아. AGENTS.md와 HANDOFF.md 업데이트해주고 Git에 commit&push해줘"

GOAL
----
Phase 3 (Mobile, React Native + Expo) 개발 시작.

WORK COMPLETED
--------------
Phase 1 전체 구현 + 검증 (8주, 145→218 테스트)
Phase 2 전체 구현 + 검증 (6주, 218 테스트):

[Phase 2 핵심 구현]
- 4개 AI 프로바이더 (Bedrock/Claude/Gemini/OpenAI) + AIService 파사드
- 커리큘럼 생성 엔진 + 야간 배치 (03:00 KST)
- AI 질문지 필터 (라이선스 유사도) + 생성
- AI 스케줄 제안 (평가 추세 기반)
- AI 주간 인사이트 (Redis 24h 캐시)
- 알림 시스템 (5개 타입) + 트리거 연결
- 월간 PDF 보고서 (Puppeteer)
- Family AI Tier (DISABLED/BASIC/STANDARD/UNLIMITED)
- 기능별 AI 모델 매핑 (Admin UI)
- A기능: 아이 발달 수준 + 센터 정보 → 커리큘럼/질문지 프롬프트 반영

[Phase 2 검증 수정]
- AI 응답 래핑 불일치 (data.data vs data.data.generated)
- orderIndex 누락 → 질문지 저장 400
- originalIndex vs index 필드명 불일치 → 필터 배지 미표시
- familyId 미전달 → AI 생성 500
- 알림 트리거 정의만 됨 (연결 안 됨) → 연결 완료
- Claude 최신 모델 temperature deprecated → 조건부 처리
- 질문지 편집 모달 useState 초기화 문제 → useEffect 수정

CURRENT STATE
-------------
- Phase 1 + Phase 2: 완료 + 검증 완료
- 빌드: api ✅ web ✅ admin ✅
- 테스트: 218개 통과
- Git: 79개 커밋, master 브랜치 push 완료
- AI 설정: Bedrock Sonnet 활성화됨
- 알림: 트리거 4개 연결 완료 (본인 제외 옵션 포함)

PENDING TASKS
-------------
1. Phase 3: Mobile (React Native + Expo SDK 52)
   Week 15: Expo scaffold, 인증, 보안 토큰
   Week 16-18: 주요 화면 (대시보드, 커리큘럼, 평가, 일정, 성장)
   Week 19: FCM 푸시 알림
   Week 20: 오프라인 지원, EAS Build

KEY FILES
---------
- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 3 Week 15-20 상세 태스크
- ASD/auticare/AGENTS.md - Phase 3 개발 필수 참조
- ASD/auticare/apps/api/src/ai/ - AI 서비스 (AIService, 비용 추적)
- ASD/auticare/apps/api/src/curriculum/ - 커리큘럼 엔진
- ASD/auticare/apps/api/src/notifications/ - 알림 시스템
- ASD/auticare/apps/web/src/hooks/use-curriculum.ts - getAiErrorMessage() 공용 에러 처리
- ASD/auticare/libs/ai-provider/ - 4개 AI 프로바이더 구현

IMPORTANT DECISIONS
-------------------
- AI 모델: Quality(Sonnet)=커리큘럼/인사이트/필터, Fast(Haiku)=스케줄제안/질문지생성
- Family AI Tier: STANDARD(20회/일) 기본값. Admin에서 조정 가능
- 알림 본인 제외: 사용자 행동 트리거는 자신 제외, 배치 작업은 전체
- temperature: 최신 Claude 모델(Sonnet 4.5+)에서 temperature 파라미터 제거 필요
- 발달 수준 A기능: Phase 4에서 구조화 체크리스트로 고도화 예정

EXPLICIT CONSTRAINTS
--------------------
- 모든 답변 한국어
- 충돌 금지 포트: 3000, 4173, 5432
- ESM: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- Mock 훅 패턴 절대 금지 → 반드시 실제 API 호출
- 새 훅/컴포넌트 작성 시 백엔드 service interface 먼저 확인 (타입 불일치 주의)
- AI 기능: 반드시 .catch(() => {}) — 알림/AI 실패가 주 기능 차단하면 안 됨
- orderIndex: items 배열 저장 시 항상 idx 값 포함

CONTEXT FOR CONTINUATION
------------------------
Phase 3 시작 시:
1. SPEC/IMPLEMENTATION_PLAN.md Week 15-20 읽기
2. Expo 프로젝트 생성: apps/mobile/ 아래
3. 기존 api-client (libs/api-client)를 React Native용으로 확장 (expo-secure-store 토큰)
4. 알림: FCM 연동 → NotificationTriggerService에 FCM send 추가 (P3-014)
5. API 변경 없음 — 모바일은 기존 엔드포인트 그대로 사용
6. 사전 필요: .env에 FCM 키, EAS 계정
