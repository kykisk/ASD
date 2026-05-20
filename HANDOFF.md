HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- "phase1 구현해볼까"
- "Week 1부터 순차 진행"
- "/home/ec2-user/workspace/ASD/auticare"
- "go" (Week 2, 3-4, 5-6, 7, 8 각 주차 진행 명령)
- "UI/UX에 대한 디자인을 따로 하지 않았던거같은데 맞니?"
- "B안으로 프리뷰용 페이지를 만들어줄수있니?"
- "UI 디자인 맘에들어 이대로 진행하자. Design가이드에 업데이트 안되어있으면 업데이트 해주고"
- "지금까지 한내용을 Agent.md파일을 만들어 보관하고 Handoff.md파일도 만들어 내용 적어줘. 그리고 Git에 올리자"

GOAL
----
Phase 1 (8주 MVP) 전체 구현이 완료되었으며, AGENTS.md + HANDOFF.md 작성 후 첫 번째 Git 커밋을 생성하는 것이 다음 단계입니다. 이후 Phase 2 (AI Integration) 작업을 시작할 준비가 된 상태입니다.

WORK COMPLETED
--------------
- Nx 20 모노레포 스캐폴드: apps/api (NestJS 11), apps/web (React 18 + Vite + Tailwind), apps/admin (React + Ant Design), libs/* (shared types/dto/validators/utils/encryption/prisma-client/api-client)
- Docker Compose 설정: PostgreSQL 16 + Redis 7
- AES-256-GCM 암호화 서비스 구현 (HKDF-SHA256 키 유도, 9개 테스트)
- JWT 인증: register/login/logout/refresh + refresh 토큰 로테이션 + Redis 블랙리스트
- OAuth: Google, Kakao, Apple (Passport.js, 조건부 로드)
- 글로벌 파이프/필터/인터셉터: ZodValidationPipe, ApiExceptionFilter, ResponseTransformInterceptor, AuditInterceptor
- 가족/아이 CRUD (PII 암호화: 이름+생년월일), FamilyMember 역할 관리
- 스케줄 CRUD + 반복 규칙(DAILY/WEEKLY/SPECIFIC_DAYS) + 충돌 감지 서비스
- 커스텀 캘린더 뷰(일/주/월, Tailwind, date-fns)
- 질문지 CRUD + CSV/Excel 임포트(papaparse + xlsx) + AI 필터링 준비
- 평가 모듈: CRUD + 트렌드 계산(±5% UP/DOWN/STABLE) + 도메인 집계(가중 평균)
- S3 Presigned URL 업로드/다운로드 (@aws-sdk v3)
- 법적 동의 서비스 (IP, 타임스탬프, 버전 관리)
- 대시보드 집계 서비스 (오늘 일정, 최근 평가, 주간 진행률, 연속 기록, 알림)
- 성장 데이터 서비스 (도메인별 시계열, 주/월 평균)
- Recharts 기반 차트: 성장 라인, SVG 레이더, 바 비교, 마일스톤 타임라인
- AI 설정 모듈: 4개 프로바이더 CRUD, API 키 AES-256 암호화 저장, 마스킹 표시
- 보안 강화: @nestjs/throttler (글로벌 100/분, auth 5/분), Helmet CSP, DOMPurify 입력 살균
- Redis 캐싱: 대시보드 2분 TTL, 스케줄/평가 변경 시 캐시 무효화
- E2E 테스트 스위트 (5개 critical flow: 인증, 가족+아이, 스케줄, 평가, 대시보드)
- GDPR 데이터 내보내기 (GET /v1/users/me/export, 전체 데이터 JSON)
- Admin 패널: 사용자 관리, AI 설정, 질문지 관리, 시스템 모니터링, 감사 로그
- UI 디자인 시안 승인 (Sage Green #5B8A72, 따뜻한 오프화이트 #FDFBF7, 16px 라운드)
- 공통 UI 컴포넌트: Skeleton, ErrorState, EmptyState, LoadingSpinner, PageHeader, Card
- 반응형 AppLayout: 모바일 드로어, 태블릿 아이콘 전용, 데스크톱 풀 사이드바
- 프로젝트 문서 6개 작성: SPEC, IMPLEMENTATION_PLAN, RISK_ANALYSIS, CONVENTIONS, DESIGN_GUIDE, ARCHITECTURE

CURRENT STATE
-------------
- Phase 1 완료 상태, 코드는 /home/ec2-user/workspace/ASD/auticare/
- 빌드 상태: api ✅ web ✅ admin ✅ (모두 성공)
- 테스트 상태: 154개 전체 통과 (api: 145개 / encryption: 9개, 22개 테스트 파일)
- Git: 첫 커밋 아직 없음 (untracked 상태)
- PostgreSQL + Redis: Docker로 실행 중 (localhost:5432, localhost:6379)
- 디자인 시안: localhost:4200/design-preview 에서 확인 가능 (dev server 실행 중)
- pnpm PATH: $HOME/.local/node_modules/.bin:$PATH 필요

PENDING TASKS
-------------
- Git 첫 커밋 생성 (현재 이 handoff 작성 후 진행 예정)
- Phase 2 시작: AI Integration (Week 9-10, AI Provider 어댑터 + 커리큘럼 생성 엔진)
- familyId JWT 이슈 수정 (auth.service.ts generateTokens에 familyId 추가 필요)
- Phase 2 상세: Week 9-10 (AI 어댑터), Week 11-12 (AI 질문지), Week 13-14 (인사이트 + 알림 + PDF)

KEY FILES
---------
- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 1-5 전체 구현 계획 (2609줄)
- ASD/SPEC/CONVENTIONS.md - 기술 규약 (.env.example, 암호화 스펙, 에러 형식, DTO 패턴)
- ASD/SPEC/DESIGN_GUIDE.md - UI/UX 가이드 (승인됨, 색상 토큰 포함)
- ASD/auticare/AGENTS.md - 에이전트용 프로젝트 가이드 (방금 생성)
- ASD/auticare/apps/api/src/app/app.module.ts - 모든 모듈 등록 허브
- ASD/auticare/libs/prisma-client/prisma/schema.prisma - 전체 DB 스키마 (15개 모델)
- ASD/auticare/apps/api/src/auth/auth.service.ts - 인증 핵심 로직
- ASD/auticare/apps/web/src/pages/design-preview/ - 승인된 디자인 시안 (7개 페이지)
- ASD/auticare/apps/web/tailwind.config.ts - Sage Green 디자인 시스템 토큰
- ASD/auticare/docker/docker-compose.yml - PostgreSQL 16 + Redis 7

IMPORTANT DECISIONS
-------------------
- Sage Green (#5B8A72)을 주 색상으로 채택 (기존 Teal에서 변경), web만 적용, admin은 Teal 유지
- ESM 프로젝트: 모든 상대 임포트에 .js 확장자 필수 (vitest는 esbuild, NestJS는 webpack)
- 아이 PII(이름+생년월일) JSON으로 묶어 단일 AES-256-GCM 연산으로 암호화
- JWT 토큰에 familyId 미포함 (알려진 이슈, Phase 2 전 수정 필요)
- Prisma 스키마 위치: libs/prisma-client/prisma/ (표준 prisma/ 아님)
- 테스트: Vitest 사용, esbuild 트랜스폼 제한으로 테스트 파일 내 파라미터 데코레이터 사용 불가
- 디자인 프리뷰는 /design-preview 라우트에 분리 (실제 기능과 독립)
- 평가 트렌드: ±5% 임계값 (UP/DOWN/STABLE), 한국어로 "관심 필요" (빨간색 "하락" 금지)
- E2E 테스트 별도 vitest.e2e.config.ts 분리 (일반 unit test와 혼재 방지)
- Redis 캐싱: 대시보드 2분 TTL, 스케줄/평가 변경 시 delByPattern('dashboard:*')

EXPLICIT CONSTRAINTS
--------------------
- 모든 언어로 물어봐도 한글로 대답
- 감정 톤: 격려적, 죄책감 없음 ("하락" 대신 "조금 더 신경써요", 빨간색 경고 최소화)
- 순수 검정색 텍스트 사용 금지 (항상 #2C3E50 블루그레이)
- 그림자에 회색 금지 (항상 Sage Green 톤 rgba(91,138,114,x))
- as any, @ts-ignore, @ts-expect-error 사용 금지
- 테스트 삭제 금지
- 명시적 요청 없이 커밋 금지
- ESM: 상대 임포트에 .js 확장자 필수

CONTEXT FOR CONTINUATION
------------------------
- Phase 2 시작 전 familyId JWT 이슈 반드시 수정 (apps/api/src/auth/auth.service.ts의 generateTokens 메서드)
- Phase 2는 AI Provider 어댑터부터 시작: IMPLEMENTATION_PLAN.md Week 9-10 참조
- AI 설정(AiConfig)은 이미 DB 스키마와 CRUD API 완성됨, Phase 2에서 실제 AI 호출 연결만 하면 됨
- 새 세션 시작 시 AGENTS.md를 먼저 읽을 것
- dev 서버: nohup으로 백그라운드 실행 필요 (Bash 도구 타임아웃 때문)
- pnpm PATH 설정: export PATH="$HOME/.local/node_modules/.bin:$PATH"
- Prisma 명령: --schema=libs/prisma-client/prisma/schema.prisma 플래그 필수
