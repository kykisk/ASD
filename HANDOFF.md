HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- "phase1 구현해볼까" → Phase 1 전체 구현 완료 (8주)
- Phase 1 검증: 다수 버그 발견 및 수정 완료
- "Admin 나머지테스트는 Phase2하고 하자"
- "Agent.md와 Handsoff.md 업데이트해주고 Git에 commit&Push해줘"

GOAL
----
Phase 2 (AI Integration) 개발 시작. Admin AI 설정 페이지 실제 API 연결부터 시작 권장.

WORK COMPLETED
--------------
Phase 1 전체 구현 (8주, 145개 테스트)
Phase 1 검증 완료 + 버그 수정 (42개 커밋):

[CRITICAL 버그 수정]
- 7개 컨트롤러 /v1/v1/ 이중 prefix → 대시보드/스케줄/평가 등 404 반환하던 문제
- familyId JWT 미포함 → 가족 생성 후 모든 페이지 오동작
- Assessment/Schedule/Growth 훅 전체 mock → 실제 API 연결
- API/프론트 타입 불일치 다수 수정

[기능 추가]
- 반복 일정 수정: C안 구현 (이 날만 / 전체 반복 일정)
  - DB: exceptedDates 필드 추가
  - RecurringEditDialog 컴포넌트
- 평가 히스토리 → 평가 페이지 내 패널로 통합
- 전화번호 자동 포맷 (010-xxxx-xxxx)
- TimePicker native → 커스텀 드롭다운 (5분 단위)

[설정 변경]
- JWT Access TTL: 15분 → 8시간 (개발환경 .env)
- Rate limiting: 개발환경 비활성화 (Vite proxy가 모든 요청을 127.0.0.1로 전달)

CURRENT STATE
-------------
- Phase 1: 완료 + 검증 완료
- 빌드: api ✅ web ✅ admin ✅
- 테스트: 145개 통과
- Git: 43개 커밋, remote: git@github.com:kykisk/ASD.git (master 브랜치 push 완료)
- SSH: ~/.ssh/id_ed25519 (EC2 전용, GitHub에 auticare-ec2 등록됨)
- Admin 페이지: 로그인만 테스트 완료. AI 설정 등 나머지 Phase 2에서 테스트

PENDING TASKS
-------------
1. [즉시] Admin AI 설정 페이지 실제 API 연결 (Phase 2 첫 작업 권장)
2. Phase 2 Week 9-10: AI Provider 어댑터, 커리큘럼 생성 엔진
3. Phase 2 Week 11-12: AI 질문지, 스케줄 AI 제안
4. Phase 2 Week 13-14: AI 인사이트, 스마트 알림, PDF 보고서

KEY FILES
---------
- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 2 Week 9-14 상세 태스크
- ASD/auticare/AGENTS.md - Phase 2 개발 필수 참조 (패턴 주의사항)
- ASD/auticare/apps/api/src/ai-config/ - AI 설정 모듈 (이미 CRUD 구현됨)
- ASD/auticare/apps/admin/src/pages/AiSettingsPage.tsx - AI 설정 UI (mock → 실제 연결 필요)
- ASD/auticare/apps/admin/src/hooks/use-ai-config.ts - AI 설정 훅 (mock)
- ASD/auticare/libs/prisma-client/prisma/schema.prisma - DB 스키마 (AiConfig 모델 있음)
- ASD/auticare/apps/api/src/schedules/schedules.service.ts - 반복 일정 로직

IMPORTANT DECISIONS
-------------------
- JWT Access TTL: 개발=8시간(28800s), 프로덕션=15분(900s)
- user.familyId(JWT) 사용 금지 → useMyFamily().data?.id 필수
- 스키마 변경: migrate → generate → build → restart (순서 중요)
- @Controller('v1/...') 절대 금지 (global prefix v1과 이중 등록)
- 반복 일정 수정: THIS_ONLY(예외 날짜+새 스케줄) / ALL(원본 수정)
- 어드민 패널: Ant Design + teal #14b8a6 (web과 별도 디자인 유지)

EXPLICIT CONSTRAINTS
--------------------
- 모든 답변 한국어
- 충돌 금지 포트: 3000, 4173, 5432
- ESM: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- Mock 훅 패턴 (setTimeout + 가짜 ID) 절대 금지 → 반드시 실제 API
- 새 훅/컴포넌트 작성 시 백엔드 service interface 먼저 확인 (타입 불일치 주의)
- 명시적 요청 없이 커밋 금지

CONTEXT FOR CONTINUATION
------------------------
Phase 2 첫 번째 작업:
1. Admin AI 설정 페이지 실제 API 연결:
   - apps/admin/src/hooks/use-ai-config.ts mock 제거 → adminApi 실제 호출
   - GET /v1/admin/ai-config (목록), PUT /v1/admin/ai-config/:provider (저장)
   - GET /v1/admin/ai-config/:provider/test (연결 테스트)

2. AI Provider 어댑터 설계 (Week 9-10):
   - apps/api/src/ai-config/ai-config.service.ts에 getDecryptedConfig() 있음
   - 4개 프로바이더 각각 어댑터 구현 후 AIService 파사드로 통합
   - 개발 시 .env의 ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY 사용

3. 타입 불일치 방지:
   - 백엔드 interface 먼저 작성 → 프론트 타입 동일하게 작성
   - 특히 응답 필드명 주의 (예: totalScore vs overallScore 등)
