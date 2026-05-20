HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- "phase1 구현해볼까" → Phase 1 전체 구현 완료
- Phase 1 검증 진행 중 다수 버그 발견 및 수정
- "Phase2로 바로가지말고 먼저 답변해줘" → JWT TTL 조정 + 문서 업데이트 + 반복일정 수정방식 결정 후 Phase 2

GOAL
----
반복 일정 수정 방식을 결정한 후 Phase 2 (AI Integration) 개발 시작.

WORK COMPLETED
--------------
Phase 1 전체 구현 (8주, 145개 테스트 통과)
Phase 1 검증 및 버그 수정 완료:
  - CRITICAL: 7개 컨트롤러 /v1/v1/ 이중 prefix 수정
  - familyId JWT 토큰에 포함 (가족 생성 후 페이지들이 familyId=null로 동작)
  - 모든 페이지에서 user.familyId -> useMyFamily().data?.id 교체 (ChildrenPage, QuestionnairePage, GrowthPage, ChildSwitcher)
  - Assessment, Schedule, Growth 훅들 mock -> 실제 API 연결
  - API/프론트 타입 불일치 수정 (totalScore, domains, DomainTimeSeries 등)
  - Prisma phone 필드 누락 추가 + 마이그레이션
  - 반복 일정 occurrence ID 처리 (realId = id.split('_')[0])
  - Rate limiting 개발환경 비활성화
  - JWT 만료 시 AUTH_002 반환 -> 프론트 자동 갱신
  - 로그아웃 onError 핸들러 추가
  - Assessment 질문지 자동 생성 (orderIndex 누락 수정)
  - TimePicker native -> 커스텀 선택기
  - 평가 히스토리 -> 평가 페이지 내 패널로 통합
  - 전화번호 자동 포맷
JWT TTL: 15분(900s) -> 8시간(28800s) (개발환경 .env)
AGENTS.md 업데이트 (검증에서 발견된 패턴들)
HANDOFF.md 업데이트 (이 파일)

CURRENT STATE
-------------
Phase 1 완료, 검증 완료
빌드: api OK, web OK, admin OK
테스트: 145개 통과
JWT TTL: 8시간 (개발환경)
반복 일정 수정 방식: 미결정 (현재 원본 전체 수정됨)
Phase 2 대기 중

PENDING TASKS
-------------
1. 반복 일정 수정 방식 결정 및 구현 (결정 대기 중)
2. Phase 2 시작: AI Integration (Week 9-14)
   Week 9-10: AI Provider 어댑터, 커리큘럼 생성 엔진
   Week 11-12: AI 질문지 생성/필터링, 스케줄 AI 제안
   Week 13-14: AI 인사이트, 스마트 알림, 월간 PDF

KEY FILES
---------
- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 2 Week 9-14 상세 계획
- ASD/auticare/AGENTS.md - Phase 2 개발 시 필수 참조
- ASD/auticare/apps/api/src/app/app.module.ts - 모듈 등록 허브
- ASD/auticare/libs/prisma-client/prisma/schema.prisma - DB 스키마
- ASD/auticare/apps/api/src/auth/auth.service.ts - JWT 생성 로직
- ASD/auticare/apps/web/src/hooks/ - 프론트 API 훅 (타입 불일치 주의)
- ASD/auticare/apps/api/src/schedules/schedules.service.ts - 반복 일정 로직

IMPORTANT DECISIONS
-------------------
- JWT Access TTL: 개발=8시간(28800), 프로덕션=15분(900) (.env으로 제어)
- user.familyId(JWT) 사용 금지 -> useMyFamily() API 호출 필수
- 스키마 변경 순서: migrate -> generate -> build -> restart
- @Controller('v1/...') 절대 금지 (global prefix v1과 이중 등록됨)
- 반복 일정 수정: 현재 원본 전체 수정. 세분화 방식 미결정

EXPLICIT CONSTRAINTS
--------------------
- 모든 답변 한국어
- 충돌 금지 포트: 3000, 4173, 5432
- ESM 프로젝트: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- Mock 훅 패턴 (setTimeout + 가짜 ID) 금지. 반드시 실제 API 호출
- 명시적 요청 없이 커밋 금지

CONTEXT FOR CONTINUATION
------------------------
Phase 2 시작 시:
1. SPEC/IMPLEMENTATION_PLAN.md Week 9-10 먼저 읽기
2. AI Provider 어댑터: apps/api/src/ai-config/ 기반으로 구현
   AiConfig 모델 (암호화된 API 키) 이미 DB에 있음
   어드민에서 AI 설정 UI 이미 있음
3. 커리큘럼 생성: 야간 배치 + 사용자 요청 시 두 가지
4. 새 훅/컴포넌트 작성 시 백엔드 service interface 먼저 확인 후 프론트 타입 작성 (타입 불일치 주의)
5. 반복 일정 수정 방식이 결정되면 schedules.service.ts의 update 메서드 수정
