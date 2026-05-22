# AutiCare — Agent Knowledge Base

> AI 에이전트가 이 프로젝트에서 작업할 때 반드시 읽어야 하는 문서입니다.
> 이 프로젝트는 자폐 아동 가정치료 지원 시스템입니다.

| 항목 | 내용 |
|------|------|
| 현재 Phase | **Phase 1 완료 + 검증 완료. Phase 2 시작 전** |
| 최종 업데이트 | 2026-05-20 |
| 총 커밋 | 42개 |
| 테스트 | 145개 통과 |

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | AutiCare |
| 목적 | 자폐 아동 가정치료를 지원하는 부모용 웹/모바일 앱 |
| 기술 스택 | NestJS 11 + React 18 + React Native (Expo) + PostgreSQL 16 + Redis 7 |
| 모노레포 | Nx 20 + pnpm |
| 현재 Phase | **Phase 2 시작 예정 (AI Integration)** |

---

## 2. 디렉토리 구조

```
ASD/
├── SPEC/                          # 프로젝트 문서
│   ├── SPEC.md                    # 요구사항 정의서
│   ├── IMPLEMENTATION_PLAN.md     # 구현 계획 (Phase 1-5)
│   ├── RISK_ANALYSIS.md           # 리스크 분석 + 결정사항
│   ├── CONVENTIONS.md             # 기술 규약 (코딩 컨벤션)
│   ├── DESIGN_GUIDE.md            # UI/UX 디자인 가이드 (승인됨)
│   └── ARCHITECTURE.md            # 서버 아키텍처 문서
└── auticare/                      # 코드 베이스
    ├── apps/
    │   ├── api/                   # NestJS REST API (:3000)
    │   ├── web/                   # React 18 + Vite (:4200)
    │   └── admin/                 # React + Ant Design (:4300)
    ├── libs/
    │   ├── shared/types/          # 공용 TypeScript 타입
    │   ├── shared/dto/            # Zod 스키마 + NestJS DTO
    │   ├── shared/validators/     # 공용 Zod 검증 규칙
    │   ├── shared/utils/          # 공용 유틸리티
    │   ├── shared/constants/      # 공용 상수
    │   ├── encryption/            # AES-256-GCM 암호화 서비스
    │   ├── prisma-client/         # PrismaService + NestJS 모듈
    │   └── api-client/            # Axios 래퍼 (JWT 자동 갱신)
    ├── docker/
    │   └── docker-compose.yml     # PostgreSQL 16 + Redis 7
    └── SPEC/ → (위 SPEC 폴더 참조)
```

---

## 3. 실행 명령어

```bash
# 의존성 설치 (pnpm PATH 설정 필요)
export PATH="$HOME/.local/node_modules/.bin:$PATH"

# Docker (PostgreSQL + Redis) 시작
pnpm docker:up

# 개발 서버 실행
pnpm nx serve api       # API :3000
pnpm nx serve web       # Web :4200
pnpm nx serve admin     # Admin :4300

# 빌드
pnpm nx build api
pnpm nx build web
pnpm nx build admin

# 테스트
pnpm nx test api
pnpm nx test encryption

# E2E 테스트 (별도 실행, 실제 DB 필요)
pnpm test:e2e

# Prisma
pnpm prisma generate --schema=libs/prisma-client/prisma/schema.prisma
pnpm prisma migrate dev --schema=libs/prisma-client/prisma/schema.prisma --name <name>
pnpm prisma studio
```

---

## 4. 핵심 기술 규약

### 4.1 임포트 규칙 (CRITICAL)
- **ESM 프로젝트**: 모든 상대 임포트에 `.js` 확장자 필수
  ```typescript
  // ✅ 올바름
  import { AuthService } from './auth.service.js';
  // ❌ 잘못됨
  import { AuthService } from './auth.service';
  ```
- 절대 임포트 (path aliases)는 확장자 불필요: `import { X } from '@auticare/dto'`

### 4.2 DTO 패턴
```typescript
// Zod 스키마 → TypeScript 타입 → NestJS DTO 클래스
const createFooSchema = z.object({ name: z.string().min(1) });
export type CreateFooInput = z.infer<typeof createFooSchema>;
export class CreateFooDto extends createZodDto(createFooSchema) {}
```

### 4.3 API 응답 형식
```typescript
// 성공
{ success: true, data: T, meta?: PaginationMeta }
// 에러
{ success: false, error: { code: string, message: string, details?: [] }, timestamp, path, requestId }
```

### 4.4 에러 코드 패턴
```typescript
throw new ApiException(401, 'AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다');
```
모듈별 접두사: AUTH_, USER_, FAMILY_, CHILD_, SCHEDULE_, QUESTIONNAIRE_, ASSESSMENT_, CURRICULUM_, AI_, FILE_, SYSTEM_

### 4.5 PII 암호화
아이 이름, 생년월일은 반드시 EncryptionService를 통해 암호화:
```typescript
const encrypted = await this.encryptionService.encryptPii({ name, birthDate });
// DB 저장: nameEnc, encIv, encAuthTag, encSalt
// 응답: 반드시 복호화 후 반환
```

### 4.6 인증 가드
- `JwtAuthGuard`: 전역 적용 (AppModule)
- `@Public()`: 인증 불필요 엔드포인트에 사용
- `@Roles(UserRole.SYSTEM_ADMIN)`: 역할 제한
- `@CurrentUser()`: 현재 사용자 추출 (payload: `{ id, role, familyId? }`)

---

## 5. 데이터베이스 스키마 (Prisma 모델 목록)

| 모델 | 목적 |
|------|------|
| User | 사용자 계정 (이메일/비밀번호/OAuth) |
| OAuthAccount | OAuth 연동 계정 (Google/Kakao/Apple) |
| RefreshToken | JWT 리프레시 토큰 (SHA-256 해시 저장) |
| AuditLog | 모든 변경 작업 감사 로그 |
| Family | 가족 그룹 |
| FamilyMember | 가족 멤버십 (User ↔ Family) |
| Child | 아이 프로필 (name/birthDate는 AES-256 암호화) |
| Schedule | 일정 (반복 규칙 포함) |
| Questionnaire | 질문지 (비라이선스/라이선스) |
| QuestionnaireItem | 질문지 문항 |
| Assessment | 평가 기록 |
| AssessmentScore | 문항별 점수 (1-5) |
| MediaAttachment | S3 미디어 파일 메타데이터 |
| LegalConsent | 법적 동의 기록 (IP, 타임스탬프, 버전) |
| AiConfig | AI 프로바이더 설정 (API 키 암호화 저장) |

---

## 6. 디자인 시스템 (승인됨)

**프리뷰 URL**: `http://localhost:4200/design-preview`

```css
--primary: #5B8A72;          /* Sage Green — 주 색상 */
--primary-light: #E8F5EE;
--primary-dark: #3D6B54;
--background: #FDFBF7;       /* 따뜻한 오프화이트 */
--card: #FFFFFF;
--card-border: #E8E4DF;
--text: #2C3E50;              /* 블루그레이 (순수 검정 사용 금지) */
--text-secondary: #6B7B8D;
--text-muted: #94A3B4;

/* 발달 영역 색상 */
--domain-communication: #7B9FD4;
--domain-social: #E8A87C;
--domain-motor: #9B8EC4;
--domain-cognitive: #7EC8C8;
--domain-emotional: #F2B880;

/* 평가 척도 색상 */
--score-5: #7BC67E;  /* 매우 좋음 */
--score-4: #A8D8A8;  /* 좋음 */
--score-3: #F5D76E;  /* 보통 */
--score-2: #F0A86E;  /* 노력 필요 */
--score-1: #E88B8B;  /* 관심 필요 */
```

**규칙**:
- 카드: 16px radius, white bg, #E8E4DF border, sage shadow
- 버튼: 48px height, 12px radius
- 감정 톤: 격려적, 죄책감 없음 ("하락" 대신 "조금 더 신경써요")
- Admin 패널: Ant Design, teal #14b8a6 유지

---

## 7. Phase 1 완료 현황 (8주 MVP)

| 주차 | 구현 내용 | 테스트 |
|------|----------|--------|
| Week 1 | Nx 모노레포, Docker, AES-256-GCM 암호화, JWT 인증, OAuth(Google/Kakao/Apple), Web/Admin 스캐폴드 | 35 |
| Week 2 | 가족/아이 CRUD, PII 암호화, OAuth UI, 프로필 설정 | 61 |
| Week 3-4 | 스케줄 CRUD + 반복 규칙 + 충돌 감지 + 커스텀 캘린더 | 75 |
| Week 5-6 | 질문지(CSV/Excel 임포트), 평가(5점 척도), 트렌드 계산, S3 업로드, 법적 동의 | 116 |
| Week 7 | 대시보드 집계, 성장 차트(라인/레이더/비교), 마일스톤 | 130 |
| Week 8 | AI 설정(암호화), 보안 강화(Rate Limit+Helmet+입력살균), Redis 캐싱, E2E, Admin 완성, UI 폴리시 | 145 |

**최종 테스트**: 154개 (API: 145개, Encryption: 9개)

---

## 8. 알려진 이슈 / 주의사항

### 8.1 familyId JWT 이슈 (수정됨)
`generateTokens()`에서 FamilyMember 테이블을 조회해 familyId를 JWT에 포함. **중요**: 모든 페이지에서 `user.familyId` (JWT값) 대신 `useMyFamily().data?.id` 를 사용해야 함. JWT의 familyId는 가족 생성 후 재로그인 전까지 null임.

### 8.2 포트 맵 (충돌 금지 포트: 3000, 4173, 5432)

| 서비스 | 포트 |
|--------|------|
| API (dev) | **3100** |
| Web (dev) | 4200 |
| Web (preview) | 4201 |
| Admin (dev) | 4300 |
| Admin (preview) | 4301 |
| PostgreSQL | 5433 |
| Redis | 6380 |

**절대 사용 금지**: 3000, 4173, 5432 (다른 시스템 점유)

### 8.3 JWT TTL 설정

| 환경 | TTL | 설정 |
|------|-----|------|
| 개발 | 8시간 (28800초) | `.env` JWT_ACCESS_TTL=28800 |
| 프로덕션 | 15분 (900초) | JWT_ACCESS_TTL=900 |

### 8.4 스키마 변경 시 순서 (CRITICAL)
```bash
# 반드시 이 순서대로:
pnpm prisma migrate dev --schema=libs/prisma-client/prisma/schema.prisma --name xxx
pnpm prisma generate --schema=libs/prisma-client/prisma/schema.prisma
pnpm nx run api:build --skip-nx-cache
./scripts/restart-api.sh
```
`generate` 누락 시 "Unknown argument" Prisma 런타임 오류 발생.

### 8.5 API 컨트롤러 prefix 규칙 (CRITICAL)
`main.ts`에 `setGlobalPrefix('v1')`이 있으므로 컨트롤러에 절대 `@Controller('v1/...')` 형태 금지.
- ✅ `@Controller('schedules')`
- ❌ `@Controller('v1/schedules')` → `/v1/v1/schedules` 이중 등록됨

### 8.6 프론트엔드 API 타입 불일치 패턴
Phase 1 검증에서 반복 발견된 패턴. 새 훅/컴포넌트 작성 시 반드시 백엔드 service/interface를 먼저 확인:
```typescript
// 잘못된 예 (프론트가 임의로 추측한 타입)
assessment.overallScore  // 실제: assessment.totalScore
aggregated.domainScores  // 실제: aggregated.domains
growth.entries           // 실제: growth.domains (DomainTimeSeries[])
growth.summary           // 존재하지 않음

// 올바른 방법: 백엔드 service 파일에서 interface 확인 후 작성
```

### 8.7 Mock 훅 주의
일부 훅이 Phase 1 구현 시 mock으로 만들어졌다가 나중에 실제 API로 교체됨. 새 훅 작성 시 mock 패턴(`setTimeout`, 가짜 ID 반환) 절대 금지. 반드시 실제 API 호출.

### 8.8 반복 일정 Occurrence ID
반복 일정의 캘린더 표시 항목은 가상 ID: `{realScheduleId}_{date}`. PATCH/DELETE 시 `_` 앞의 실제 ID 추출 필요:
```typescript
const realId = id.includes('_') ? id.split('_')[0] : id;
```

### 8.9 pnpm PATH 설정
스크립트들이 자동 처리하므로 별도 설정 불필요.
수동 실행 시:
```bash
export PATH="$HOME/.local/node_modules/.bin:$PATH"
```

### 8.10 dev 서버 실행
`scripts/` 폴더의 스크립트 사용:
```bash
./scripts/start-db.sh      # DB (제일 먼저)
./scripts/start-api.sh     # 백엔드
./scripts/start-web.sh     # 프론트엔드 (사용자)
./scripts/start-admin.sh   # 프론트엔드 (관리자, 선택)
./scripts/restart-api.sh   # 백엔드만 재시작
./scripts/restart-fe.sh    # 프론트엔드 둘 다 재시작
./scripts/status.sh        # 전체 상태 확인
```

### 8.11 Prisma 스키마 위치
표준 위치(`prisma/`)가 아닌 `libs/prisma-client/prisma/`에 있으므로 모든 prisma 명령에 `--schema` 플래그 필수.

### 8.12 Git 설정

| 항목 | 값 |
|------|-----|
| Remote | `git@github.com:kykisk/ASD.git` |
| 브랜치 | `master` |
| SSH 키 위치 | `~/.ssh/id_ed25519` (EC2 전용) |
| GitHub 등록 키 | `auticare-ec2` (Title) |

```bash
# 현재 EC2에서 push 방법
cd /home/ec2-user/workspace/ASD/auticare
git add .
git commit -m "..."
git push origin master
```

SSH 키는 이 EC2 인스턴스 전용으로 생성됨. 다른 시스템 영향 없음.

---

## 9. Phase 2 작업 계획 (AI Integration, 6주)

### 9.1 Week 9-10: AI Provider 어댑터 + 커리큘럼 생성 엔진

**이미 구현된 인프라:**
- `AiConfig` DB 모델 (API 키 AES-256 암호화 저장)
- Admin AI 설정 UI (`apps/admin/src/pages/AiSettingsPage.tsx`) — 현재 mock, 실제 API 연결 필요
- `apps/api/src/ai-config/ai-config.service.ts` — CRUD + 복호화

**구현 필요:**
- AI Provider 어댑터 (Claude Bedrock/Direct, Gemini, OpenAI) — provider-agnostic interface
- AIService 파사드 — 설정된 기본 프로바이더로 요청 라우팅
- Zod 기반 출력 검증 (AI 응답 스키마 강제)
- 비용 추적 (일일 호출 수 Redis 카운터)
- 커리큘럼 생성 엔진 (아이 평가 데이터 → 프롬프트 → AI → 커리큘럼)
- 야간 배치 작업 (cron: 새벽 3시, 모든 활성 아이 대상)

### 9.2 Week 11-12: AI 질문지 + 스케줄 AI 제안

- AI 질문지 자동 생성 (영역/연령 기반)
- AI 질문지 필터링 (라이선스 도구 유사도 분석)
- AI 스케줄 수정 제안 (평가 추세 기반)

### 9.3 Week 13-14: 인사이트 + 알림 + PDF

- AI 주간 성장 인사이트 (대시보드 카드)
- 스마트 알림 (평가 예정, 커리큘럼, 마일스톤)
- 월간 PDF 보고서 (Puppeteer)

### 9.4 AI 커리큘럼 프롬프트 데이터 확장 로드맵

커리큘럼 프롬프트(`CurriculumPromptService`)에 포함되는 데이터가 Phase별로 확장됨:

```
Phase 2 (현재): 월령 + 평가 점수 + 발달 수준 메모 + 센터/치료 정보
Phase 4 추가:  감각프로필(P4-022) + 마일스톤(P4-023) + 구조화 체크리스트(P4-024)
Phase 5 추가:  라이선스 도구 점수(P5-017) + 자동 발달 수준 업데이트(P5-018)
```

**구현 원칙**: "있으면 포함, 없으면 생략" → 이후 Phase에서 데이터 추가 시 프롬프트 빌더에 한 섹션만 추가

---

## 10. Git 커밋 컨벤션

```
feat(scope): 새 기능 추가
fix(scope): 버그 수정
test(scope): 테스트 추가/수정
refactor(scope): 리팩터링
docs(scope): 문서 수정
chore(scope): 기타 작업
```

스코프 목록: scaffold, prisma, encryption, auth, users, families, children, schedules, questionnaires, assessments, curricula, activities, dashboard, notifications, reports, research, wellbeing, emergency, sensory, licenses, admin, ai-provider, ai-config, ai-service, api-client, cache, security, consent, gdpr, uploads, web, mobile, infra, e2e, deps, config
