# AutiCare — Agent Knowledge Base

> AI 에이전트가 이 프로젝트에서 작업할 때 반드시 읽어야 하는 문서입니다.
> 이 프로젝트는 자폐 아동 가정치료 지원 시스템입니다.

| 항목          | 내용                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| 현재 Phase    | **Phase 5 완료 + 수업 피드백 + 복약 관리 + 피드백 기반 성장추적 + UX 개선** |
| 최종 업데이트 | 2026-06-11                                                                  |
| 총 커밋       | 221개                                                                       |
| 테스트        | 282개 통과 (3개 기존 사전 실패)                                             |

---

## 1. 프로젝트 개요

| 항목       | 내용                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| 프로젝트명 | AutiCare                                                                    |
| 목적       | 자폐 아동 가정치료를 지원하는 부모용 웹/모바일 앱                           |
| 기술 스택  | NestJS 11 + React 18 + React Native (Expo SDK 55) + PostgreSQL 16 + Redis 7 |
| 모노레포   | Nx 20 + pnpm                                                                |
| 현재 Phase | **Phase 4 시작 예정 (Expansion)**                                           |

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
    │   ├── api/                   # NestJS REST API (:3100)
    │   ├── web/                   # React 18 + Vite (:4200)
    │   ├── admin/                 # React + Ant Design (:4300)
    │   └── mobile/                # React Native + Expo SDK 55 (:8081 web)
    ├── libs/
    │   ├── shared/types/          # 공용 TypeScript 타입
    │   ├── shared/dto/            # Zod 스키마 + NestJS DTO
    │   ├── shared/validators/     # 공용 Zod 검증 규칙
    │   ├── shared/utils/          # 공용 유틸리티
    │   ├── shared/constants/      # 공용 상수
    │   ├── encryption/            # AES-256-GCM 암호화 서비스
    │   ├── prisma-client/         # PrismaService + NestJS 모듈
    │   └── api-client/            # Axios 래퍼 (JWT 자동 갱신, mobile 지원)
    ├── docker/
    │   └── docker-compose.yml     # PostgreSQL 16 + Redis 7
    └── scripts/
        ├── start-*.sh             # 각 서비스 시작
        ├── restart-*.sh           # 각 서비스 재시작
        ├── status.sh              # 전체 상태 확인
        └── stop-servers.sh        # 전체 종료
```

---

## 3. 실행 명령어

```bash
# 의존성 설치 (pnpm PATH 설정 필요)
export PATH="$HOME/.local/node_modules/.bin:$PATH"

# Docker (PostgreSQL + Redis) 시작
pnpm docker:up

# 개발 서버 실행 (스크립트 사용 권장)
./scripts/start-db.sh      # DB (제일 먼저)
./scripts/start-api.sh     # 백엔드 :3100
./scripts/start-web.sh     # 프론트엔드 :4200
./scripts/start-admin.sh   # Admin :4300 (선택)
./scripts/start-mobile.sh  # 모바일 웹 :8081 (expo export 빌드, 2~3분)

# 재시작
./scripts/restart-api.sh
./scripts/restart-mobile.sh

# 전체 상태 확인 (api/web/admin/mobile 모두)
./scripts/status.sh

# 빌드
pnpm nx build api
pnpm nx build web
pnpm nx build admin

# 테스트
pnpm nx test api          # 244개 통과
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
- **모바일 앱** (`apps/mobile/`): 동일하게 `.js` 확장자 필수

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

모듈별 접두사: AUTH*, USER*, FAMILY*, CHILD*, SCHEDULE*, QUESTIONNAIRE*, ASSESSMENT*, CURRICULUM*, AI*, FILE*, SYSTEM\_

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

| 모델              | 목적                                          |
| ----------------- | --------------------------------------------- |
| User              | 사용자 계정 (이메일/비밀번호/OAuth)           |
| OAuthAccount      | OAuth 연동 계정 (Google/Kakao/Apple)          |
| RefreshToken      | JWT 리프레시 토큰 (SHA-256 해시 저장)         |
| AuditLog          | 모든 변경 작업 감사 로그                      |
| Family            | 가족 그룹                                     |
| FamilyMember      | 가족 멤버십 (User ↔ Family)                   |
| Child             | 아이 프로필 (name/birthDate는 AES-256 암호화) |
| Schedule          | 일정 (반복 규칙 포함)                         |
| Questionnaire     | 질문지 (비라이선스/라이선스)                  |
| QuestionnaireItem | 질문지 문항                                   |
| Assessment        | 평가 기록                                     |
| AssessmentScore   | 문항별 점수 (1-5)                             |
| MediaAttachment   | S3 미디어 파일 메타데이터                     |
| LegalConsent      | 법적 동의 기록 (IP, 타임스탬프, 버전)         |
| AiConfig          | AI 프로바이더 설정 (API 키 암호화 저장)       |
| **DeviceToken**   | **FCM 디바이스 토큰 (Phase 3 신규)**          |

---

## 6. 디자인 시스템 (승인됨)

**프리뷰 URL**: `http://localhost:4200/design-preview`

```css
--primary: #5b8a72; /* Sage Green — 주 색상 */
--primary-light: #e8f5ee;
--primary-dark: #3d6b54;
--background: #fdfbf7; /* 따뜻한 오프화이트 */
--card: #ffffff;
--card-border: #e8e4df;
--text: #2c3e50; /* 블루그레이 (순수 검정 사용 금지) */
--text-secondary: #6b7b8d;
--text-muted: #94a3b4;

/* 발달 영역 색상 */
--domain-communication: #7b9fd4;
--domain-social: #e8a87c;
--domain-motor: #9b8ec4;
--domain-cognitive: #7ec8c8;
--domain-emotional: #f2b880;

/* 평가 척도 색상 */
--score-5: #7bc67e; /* 매우 좋음 */
--score-4: #a8d8a8; /* 좋음 */
--score-3: #f5d76e; /* 보통 */
--score-2: #f0a86e; /* 노력 필요 */
--score-1: #e88b8b; /* 관심 필요 */
```

**규칙**:

- 카드: 16px radius, white bg, #E8E4DF border, sage shadow
- 버튼: 48px height, 12px radius
- 감정 톤: 격려적, 죄책감 없음 ("하락" 대신 "조금 더 신경써요")
- Admin 패널: Ant Design, teal #14b8a6 유지
- **모바일**: `apps/mobile/constants/theme.ts` 에서 동일 색상 상수 정의

---

## 7. Phase 1 완료 현황 (8주 MVP)

| 주차     | 구현 내용                                                                                        | 테스트 |
| -------- | ------------------------------------------------------------------------------------------------ | ------ |
| Week 1   | Nx 모노레포, Docker, AES-256-GCM 암호화, JWT 인증, OAuth(Google/Kakao/Apple), Web/Admin 스캐폴드 | 35     |
| Week 2   | 가족/아이 CRUD, PII 암호화, OAuth UI, 프로필 설정                                                | 61     |
| Week 3-4 | 스케줄 CRUD + 반복 규칙 + 충돌 감지 + 커스텀 캘린더                                              | 75     |
| Week 5-6 | 질문지(CSV/Excel 임포트), 평가(5점 척도), 트렌드 계산, S3 업로드, 법적 동의                      | 116    |
| Week 7   | 대시보드 집계, 성장 차트(라인/레이더/비교), 마일스톤                                             | 130    |
| Week 8   | AI 설정(암호화), 보안 강화(Rate Limit+Helmet+입력살균), Redis 캐싱, E2E, Admin 완성, UI 폴리시   | 145    |

**최종 테스트**: 154개 (API: 145개, Encryption: 9개)

---

## 8. 알려진 이슈 / 주의사항

### 8.1 familyId JWT 이슈 (수정됨)

`generateTokens()`에서 FamilyMember 테이블을 조회해 familyId를 JWT에 포함. **중요**: 모든 페이지에서 `user.familyId` (JWT값) 대신 `useMyFamily().data?.id` 를 사용해야 함. JWT의 familyId는 가족 생성 후 재로그인 전까지 null임.

### 8.2 포트 맵 (충돌 금지 포트: 3000, 4173, 5432)

| 서비스                       | 포트     |
| ---------------------------- | -------- |
| API (dev)                    | **3100** |
| Web (dev)                    | 4200     |
| Web (preview)                | 4201     |
| Admin (dev)                  | 4300     |
| Admin (preview)              | 4301     |
| **Mobile Web (expo export)** | **8081** |
| PostgreSQL                   | 5433     |
| Redis                        | 6380     |

**절대 사용 금지**: 3000, 4173, 5432 (다른 시스템 점유)

### 8.3 JWT TTL 설정

| 환경     | TTL             | 설정                        |
| -------- | --------------- | --------------------------- |
| 개발     | 8시간 (28800초) | `.env` JWT_ACCESS_TTL=28800 |
| 프로덕션 | 15분 (900초)    | JWT_ACCESS_TTL=900          |

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
assessment.overallScore; // 실제: assessment.totalScore
aggregated.domainScores; // 실제: aggregated.domains
growth.entries; // 실제: growth.domains (DomainTimeSeries[])
growth.summary; // 존재하지 않음

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
./scripts/start-mobile.sh  # 모바일 웹 (expo export, 2~3분 빌드)
./scripts/restart-api.sh   # 백엔드만 재시작
./scripts/restart-mobile.sh # 모바일 재빌드 + 재시작
./scripts/restart-fe.sh    # 프론트엔드 둘 다 재시작
./scripts/status.sh        # 전체 상태 확인 (mobile 포함)
./scripts/stop-servers.sh  # 전체 종료 (mobile 포함)
```

### 8.11 Prisma 스키마 위치

표준 위치(`prisma/`)가 아닌 `libs/prisma-client/prisma/`에 있으므로 모든 prisma 명령에 `--schema` 플래그 필수.

### 8.12 Git 설정

| 항목           | 값                              |
| -------------- | ------------------------------- |
| Remote         | `git@github.com:kykisk/ASD.git` |
| 브랜치         | `master`                        |
| SSH 키 위치    | `~/.ssh/id_ed25519` (EC2 전용)  |
| GitHub 등록 키 | `auticare-ec2` (Title)          |

```bash
# 현재 EC2에서 push 방법
cd /home/ec2-user/workspace/ASD/auticare
git add .
git commit -m "..."
git push origin master
```

SSH 키는 이 EC2 인스턴스 전용으로 생성됨. 다른 시스템 영향 없음.

### 8.13 모바일 웹 실행 방식 (CRITICAL)

`expo start --web` (dev server) 는 **Expo SDK 55에서 Metro 미들웨어 체인을 우회**하여 번들 경로 문제가 발생함. 반드시 **정적 빌드 방식** 사용:

```bash
./scripts/start-mobile.sh
# 내부적으로: expo export --platform web → Node.js 정적 서버
```

- 코드 변경 후 반드시 `./scripts/restart-mobile.sh` 로 재빌드
- 빌드 소요 시간: 2~3분
- 웹 접속: `http://localhost:8081` 또는 `http://3.35.36.62:8081`

### 8.14 모바일 SplashScreen (CRITICAL)

`SplashScreen.preventAutoHideAsync()` 는 웹에서 흰 화면을 유발하므로 반드시 플랫폼 분기:

```typescript
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}
// hideAsync도 동일하게 분기
```

---

## 9. Phase 2 완료 현황 (AI Integration, 6주)

| 주차       | 구현 내용                                                                          | 테스트 |
| ---------- | ---------------------------------------------------------------------------------- | ------ |
| Week 9-10  | AI 4개 프로바이더, AIService 파사드, Zod 검증, 비용 추적, 커리큘럼 엔진, 야간 배치 | 183    |
| Week 11-12 | AI 질문지 필터/생성, AI 스케줄 제안                                                | 195    |
| Week 13-14 | AI 인사이트, 알림 시스템, PDF 보고서                                               | 218    |

### Phase 2 검증에서 발견된 패턴 (CRITICAL)

| #   | 패턴                       | 증상                                 | 해결                                               |
| --- | -------------------------- | ------------------------------------ | -------------------------------------------------- |
| 1   | **AI 응답 래핑**           | `data.data` vs `data.data.generated` | API 반환 구조 먼저 확인                            |
| 2   | **orderIndex 누락**        | 질문지 저장 400 에러                 | 모든 items 배열에 `orderIndex: idx` 필수           |
| 3   | **필드명 불일치**          | AI 필터 배지 미표시                  | `originalIndex` vs `index` 등 API 스키마 먼저 확인 |
| 4   | **familyId 미전달**        | 질문지 AI 생성 500 에러              | useMyFamily() 사용해서 항상 전달                   |
| 5   | **트리거 정의만 됨**       | 알림 안 옴                           | 서비스 메서드 작성 후 실제 호출 연결 필수          |
| 6   | **temperature deprecated** | Bedrock 503                          | 최신 Claude 모델은 temperature 파라미터 제거       |
| 7   | **daily budget**           | 503 모든 기능                        | Admin AI 설정에서 일일 예산 한도 올리기            |

### Phase 2 추가 기능 (계획 외)

- **Family AI Tier** (DISABLED/BASIC/STANDARD/UNLIMITED) — 가족별 AI 접근 제어
- **기능별 AI 모델 매핑** (Admin) — 커리큘럼=Sonnet, 스케줄=Haiku 등 개별 설정
- **A기능**: 아이 프로필에 발달 수준 + 센터 정보 → AI 프롬프트 반영
- **알림 본인 제외**: 사용자 행동 트리거는 자신 제외, 배치는 전체

---

## 10. Phase 3 완료 현황 (Mobile, 6주)

### 10.1 Week 15 — Expo 스캐폴드

- Expo SDK 55 + expo-router + Zustand + TanStack Query 설정
- `apps/mobile/` 전체 구조 (metro.config.js, app.config.ts, babel.config.js)
- `expo-secure-store` 기반 JWT 토큰 저장 (`lib/token-storage.ts`)
- `@auticare/api-client` 연동 (`clientType: 'mobile'`)
- 인증 화면 (로그인, 회원가입)
- 5탭 내비게이션 (홈, 커리큘럼, 평가, 성장, 더보기)

### 10.2 Week 16-18 — 주요 기능 화면

- **홈 대시보드**: 실데이터 (일정, 주간 진행률, 평가, 알림)
- **커리큘럼**: 오늘 커리큘럼 + 활동 카드 (펼치기/닫기) + 활동 로그
- **평가**: 질문지 선택기 + 문항별 1-5 점수 + 제출
- **성장**: 도메인별 progress bar + 트렌드 화살표
- **일정**: 주간 캘린더 + 생성/편집 모달
- **아이 전환 모달**: 다자녀 지원
- 8개 실데이터 훅 (`use-dashboard`, `use-curricula`, `use-assessments`, `use-schedules`, `use-growth` 등)

### 10.3 Week 19 — FCM 푸시 알림

**백엔드:**

- `DeviceToken` Prisma 모델 추가 (migration: `20260526010102_add_device_tokens`)
- `PushService`: Firebase Admin SDK, 자격증명 미설정 시 graceful skip
- 만료 토큰 자동 삭제 (`messaging/registration-token-not-registered`)
- `NotificationsService.create()` → 푸시 fire-and-forget 연결
- `POST /v1/notifications/device-token` (등록)
- `DELETE /v1/notifications/device-token` (해제)

**모바일:**

- `use-push-notifications.ts`: 권한 요청 → Expo 토큰 발급 → 백엔드 등록
- 알림 탭 핸들러: 타입별 화면 이동 (CURRICULUM_READY→/curriculum 등)
- `use-notifications.ts`: 알림 목록/읽음 처리 훅

**FCM 활성화:** `.env`에 추가 시 즉시 동작

```env
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

### 10.4 Week 20 — 완성

- **More 탭 하위 화면**: child-profile, family, settings, reports (실API 연동)
- **오프라인 지원**: OfflineBanner + `networkMode: 'offlineFirst'`
- **EAS Build 설정**: `eas.json` (development/preview/production)
- **Maestro E2E**: `.maestro/` 5개 flow (login, register, navigation, more, logout)
- **성능**: SplashScreen 제어 (`Platform.OS !== 'web'` 분기)

### 10.5 Phase 3 테스트 현황

| 파일                               | 신규 테스트 | 내용                                                  |
| ---------------------------------- | ----------- | ----------------------------------------------------- |
| `push.service.spec.ts`             | 11개        | FCM 초기화, 토큰 등록/해제, 멀티캐스트, 만료토큰 정리 |
| `notifications.controller.spec.ts` | 10개        | device-token 엔드포인트 6개 + 기존 엔드포인트         |
| `notifications.service.spec.ts`    | 수정        | PushService mock 추가                                 |

**누적 테스트**: 218 → **244개** (모두 통과)

### 10.6 Phase 3 AI 커리큘럼 프롬프트 확장 로드맵

```
Phase 2 (완료): 월령 + 평가 점수 + 발달 수준 메모 + 센터/치료 정보
Phase 4 추가:  감각프로필(P4-022) + 마일스톤(P4-023) + 구조화 체크리스트(P4-024)
Phase 5 추가:  라이선스 도구 점수(P5-017) + 자동 발달 수준 업데이트(P5-018)
```

### 10.7 Phase 3 검증 중 발견된 버그 및 수정 이슈 (CRITICAL)

다음 패턴은 Phase 4에서 새 기능 개발 시 반드시 참고:

| #   | 버그                                         | 원인                                                                     | 수정 패턴                                                                       |
| --- | -------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 1   | **일정 API 400**                             | `QueryScheduleDto`가 `z.string().datetime()` 필요한데 `YYYY-MM-DD` 전달  | 반드시 `new Date(date + 'T00:00:00.000Z').toISOString()` 변환 후 전달           |
| 2   | **로그아웃 후 다른 계정에 이전 데이터 표시** | Zustand child.store + TanStack Query 캐시 미초기화                       | logout 시 `childStore.reset()` + `queryClient.clear()` + `clearSelectedChild()` |
| 3   | **질문지 드롭다운 비어있음**                 | `/questionnaires` 엔드포인트 없음, 실제는 `/families/:id/questionnaires` | 새 API 훅 작성 전 컨트롤러 경로 반드시 확인                                     |
| 4   | **familyId가 JWT에 null**                    | 가족 생성 후 재로그인 전까지 JWT에 familyId=null                         | JWT 대신 `child.store.familyId` (fetchChildren 시 저장) 사용                    |
| 5   | **커리큘럼 엔드포인트 404**                  | `/curricula/today` (복수) vs `/curriculum/today` (단수)                  | 컨트롤러 실제 경로 확인 필수                                                    |
| 6   | **확인 다이얼로그 웹 무반응**                | `Alert.alert`은 웹에서 no-op                                             | 반드시 `Platform.OS === 'web' ? window.confirm() : Alert.alert()` 분기          |
| 7   | **저장 후 화면 미갱신**                      | React Query 캐시 invalidation만으로는 Zustand store 미갱신               | mutation `onSuccess`에서 `fetchChildren(familyId)` 직접 호출                    |
| 8   | **보고서 목록 빈 배열**                      | Phase 2에서 Report DB 저장 누락 (P2-039 미완)                            | `Report` Prisma 모델 추가 + upsert 구현으로 수정 완료                           |
| 9   | **일정 탭 없음**                             | P3-010 구현 누락                                                         | `schedule.tsx` + `_layout.tsx` 탭 추가로 수정 완료                              |
| 10  | **커리큘럼 완료 후 히스토리 미반영**         | `invalidateQueries` 비동기 → 탭 전환 시 구버전 캐시 표시                 | `setQueriesData`로 즉시 캐시 업데이트 후 invalidate                             |

### 10.8 모바일 웹 (브라우저) 주의사항

웹 브라우저에서 테스트 시 동작 불가 기능:

- `Alert.alert` → `window.alert/confirm` 으로 교체 필요
- `expo-secure-store` → `localStorage` fallback 필요 (token-storage.ts 구현됨)
- `SplashScreen` → `Platform.OS !== 'web'` 분기 필수
- Pull to Refresh → 웹에서 불가 (모바일 전용)
- 푸시 알림 → 웹에서 불가

---

## 11. Phase 4 작업 계획 (Expansion)

SPEC/IMPLEMENTATION_PLAN.md 11절 참조.

### 11.0 Phase 3 이연 항목 처리 현황

| 항목                  | 이전 상태 | 현재 상태                                                    |
| --------------------- | --------- | ------------------------------------------------------------ |
| 보고서 DB 저장        | ❌ 미구현 | ✅ **완료** (Report 모델 + upsert + listReports + getReport) |
| 일정 탭 모바일        | ❌ 누락   | ✅ **완료** (schedule.tsx 추가)                              |
| 아이 삭제 모바일      | ❌ 없음   | ✅ **완료** (child-profile 삭제 버튼)                        |
| 아이 정보 편집 모바일 | ❌ 없음   | ✅ **완료** (useUpdateChild 훅)                              |
| 가족 편집 모바일      | ❌ 없음   | ✅ **완료** (useUpdateFamily/InviteMember 등)                |
| 커리큘럼 완료 액션    | ❌ 없음   | ✅ **완료** (PATCH /curricula/:id/complete)                  |
| 커리큘럼 히스토리 탭  | ❌ 없음   | ✅ **완료** (오늘/히스토리 탭 추가)                          |
| GDPR 내보내기 모바일  | ❌ 미구현 | 🔄 **Phase 4** (settings.tsx에 Phase 4 배지)                 |
| 아이 추가 모바일      | ❌ 미구현 | 🔄 **Phase 4**                                               |

### 11.1 Phase 4 기능 영역 (P4-001~025)

| 영역                   | 태스크     | 핵심 내용                                                         |
| ---------------------- | ---------- | ----------------------------------------------------------------- |
| **부모 웰빙**          | P4-001~004 | `ParentWellbeing` 모델, 무드 체크인, 번아웃 감지, AI 격려 메시지  |
| **비상 가이드**        | P4-005~008 | `EmergencyEvent` 모델, 단계별 대응 가이드, 진정 타이머, 패턴 분석 |
| **감각 프로파일**      | P4-009~011 | `SensoryProfile` 모델, 6채널 평가, 레이더 차트                    |
| **연구 자동 수집**     | P4-012~018 | PubMed API, AI 한국어 요약, 아이 프로파일 매칭, 주간 배치         |
| **가족 협업**          | P4-019~021 | 역할 분담, 활동 로그 댓글                                         |
| **AI 프롬프트 고도화** | P4-022~025 | 감각프로필+마일스톤 반영, 발달수준 구조화                         |

### 11.2 Phase 4 이연된 항목 (여전히 미구현)

| 항목                              | 현재 상태                        | Phase 4 작업 내용                    |
| --------------------------------- | -------------------------------- | ------------------------------------ |
| **GDPR 데이터 내보내기 (모바일)** | settings.tsx에 Phase 4 배지 표시 | expo-file-system + expo-sharing 구현 |
| **아이 추가 (모바일)**            | 웹에서만 가능                    | More 탭 또는 child-profile에 추가 폼 |

### 11.3 현재 UI 처리 방식 (Phase 4 미구현 기능 표시)

```tsx
// 미구현 기능은 Phase 4 배지로 표시 (apps/mobile/app/settings.tsx 스타일 재사용)
<View style={styles.phase4Row}>
  <Text style={styles.actionLabel}>기능명</Text>
  <View style={styles.phase4Badge}>
    <Text style={styles.phase4BadgeText}>Phase 4</Text>
  </View>
</View>
```

---

## 12. Phase 4 완료 현황 (Expansion)

### 12.1 구현 완료 기능

| 영역                   | 내용                                                                    | 상태 |
| ---------------------- | ----------------------------------------------------------------------- | ---- |
| **부모 웰빙**          | ParentWellbeing 모델, 무드 체크인 CRUD, 번아웃 감지, AI 격려 메시지     | ✅   |
| **비상 가이드**        | 5종 가이드 데이터, EmergencyEvent 로그, AI 패턴 분석                    | ✅   |
| **감각 프로파일**      | SensoryProfile 모델, 6채널 CRUD, AI 활동 추천                           | ✅   |
| **연구 자동 수집**     | PubMed API, AI 한국어 요약, 가족 매칭, 주간 배치, **아카이브/히스토리** | ✅   |
| **가족 협업**          | RoleAssignment CRUD, ActivityComment                                    | ✅   |
| **AI 프롬프트 고도화** | 감각프로필+마일스톤+발달수준 구조화 반영                                | ✅   |
| **AI 맞춤 요약**       | 북마크 논문 기반 개인화 요약, 히스토리 저장/조회                        | ✅   |

### 12.2 Phase 4 검증 중 발견된 버그 (CRITICAL)

| #   | 버그                             | 원인                                                                      | 수정                                                       |
| --- | -------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | **연구 피드 빈 배열**            | `childId` 파라미터로 필터링 시 `childId=null` 레코드 미포함               | `OR [childId, null]` 조건으로 수정                         |
| 2   | **Phase 4 API 전부 빈 결과**     | `user.familyId` JWT null → FamilyResolverService 미적용                   | 모든 Phase 4 컨트롤러에 `FamilyResolverService` 적용       |
| 3   | **AI digest 500**                | `Child.name` 필드 없음 (암호화된 `nameEnc`)                               | `name` 제거, `diagnosisName`만 사용                        |
| 4   | **AI digest 500**                | `Child.birthDate` 필드 없음 (암호화된 `birthDateEnc`)                     | `birthDate` 제거, 나이 계산 제거                           |
| 5   | **AI digest JSON 파싱 오류**     | AI 응답 마크다운이 JSON 안에 포함되어 파싱 실패                           | JSON 요청 제거 → 평문 텍스트 요청으로 변경                 |
| 6   | **관리자 배치 실행 무반응**      | admin.controller의 가짜 stub이 실제 ResearchBatchService 가로챔           | admin.module에 ResearchModule import, 실제 서비스 DI       |
| 7   | **Express ETag 304**             | Express 기본 ETag가 빈 응답 캐시 → 데이터 추가돼도 304 반환               | `main.ts`에 `app.set('etag', false)` 추가                  |
| 8   | **서버 재시작 후 데이터 미표시** | JWT familyId=null, React Query 캐시 stale                                 | `AppInitializer` 컴포넌트 추가 (웹 앱 진입 시 자동 동기화) |
| 9   | **모바일 연구 화면 오류**        | `ResearchMatch` 타입이 flat인데 실제 API는 중첩 구조 (`item.article.xxx`) | 타입 수정 + `tags ?? []` null 방어                         |

### 12.3 연구(Research) 모듈 상세 구조

```
ResearchArticle: PubMed 논문 (pubmedId UNIQUE)
  └── ResearchUserMatch: 가족별 매칭 (isBookmarked, isRead, isArchived)
        └── ResearchDigest: AI 맞춤 요약 히스토리 (familyId, childId)

수집: PubMed eutils API → AI 한국어 요약 → 가족별 매칭 저장
아카이브: 90일 이상 비북마크 → isArchived=true (숨김, 복원 가능)
삭제: 아카이브된 항목 명시적 삭제 (DELETE /research/archived)
날짜 필터: 최근 2년 이내 논문만 수집 (datetype=pdat)
```

**웹 연구 페이지 4탭:** 추천 | 북마크 | 아카이브 | AI 요약 히스토리

### 12.4 FamilyResolverService (CRITICAL — Phase 4 전체에 적용)

`apps/api/src/common/services/family-resolver.service.ts`

```typescript
async resolve(userId: string, jwtFamilyId: string | null | undefined): Promise<string | null> {
  if (jwtFamilyId) return jwtFamilyId;                    // JWT 빠른 경로
  const member = await this.prisma.familyMember.findFirst({ where: { userId } });
  return member?.familyId ?? null;                         // DB fallback
}
```

**모든 Phase 4 컨트롤러**에서 `user.familyId` 직접 사용 금지. 반드시 위 서비스 사용.

### 12.5 AppInitializer (웹 앱 자동 동기화)

`apps/web/src/components/AppInitializer.tsx`

앱 진입 시 자동으로:

1. `GET /users/me` → 최신 유저 정보
2. `GET /families/my` → familyId 확보 (JWT null이어도 OK)
3. auth store + child store 업데이트
4. `queryClient.invalidateQueries()` → 서버 재시작 후 stale 캐시 제거
5. `window.focus` 이벤트 → 탭 전환 후 자동 refetch

**효과:** 서버 재시작 후 로그아웃 없이 페이지 새로고침만 하면 데이터 정상 표시

### 12.6 웹 사이드바 그룹 구조

아코디언 방식 (클릭으로 펼치기/접기):

- **치료 관리**: 대시보드, 커리큘럼, 일정, 평가 입력, 성장 기록, AI 분석
- **도구**: 질문지, 보고서, **감각 프로파일** (치료 보조 측정 도구로 재분류)
- **부모 지원**: 웰빙 체크인, 비상 가이드, 연구 자료
- **가족**: 아이 관리, 가족 관리, 가족 협업

**모바일 More 탭 그룹:**

- **치료 도구**: 아이 프로필, 감각 프로파일, 보고서
- **부모 지원**: 웰빙 체크인, 비상 가이드, 연구 브리핑
- **가족**: 가족 설정, 설정

---

## 13. Phase 4 UX 개선 현황 (2026-06-05)

### 13.1 이번 세션 완료 항목

| 항목                          | 내용                                                                 | 파일                                                                |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **모바일 AI 요약/히스토리**   | research.tsx 3탭(추천/북마크/AI요약) + 생성 버튼 + DigestHistoryCard | `apps/mobile/app/research.tsx`, `apps/mobile/hooks/use-research.ts` |
| **감각 프로파일 활용 가이드** | 작성 시 어디에 활용되는지 인라인 카드 (웹+모바일)                    | `SensoryProfilePage.tsx`, `sensory-profile.tsx`                     |
| **감각 프로파일 → 도구 이동** | 부모 지원 → 도구 그룹으로 재분류                                     | `AppLayout.tsx`, `more.tsx`                                         |
| **대시보드 연구 티커**        | 히어로 배너 아래 뉴스 티커 (5초 자동 전환, AI요약 표시)              | `DashboardPage.tsx`                                                 |
| **연구 요약 재처리**          | 요약 없는 논문 일괄 재처리 (Admin) + 실시간 진행률                   | `research.service.ts`, `admin.controller.ts`, `MonitoringPage.tsx`  |

### 13.2 대시보드 연구 티커 (ResearchTicker)

`apps/web/src/pages/DashboardPage.tsx`

- `useResearchFeed(selectedChildId)` 데이터 사용, `publishedAt` 기준 최신순 정렬
- 5초마다 fade 전환 (useState + useEffect setInterval)
- 텍스트: `koreanSummary` 우선, 없으면 `title`
- 우측 `✨ AI 요약` 배지 표시
- 클릭 → `/research` 이동
- 연구 데이터 없으면 렌더링 안 됨

### 13.3 연구 요약 재처리 (Admin)

`POST /v1/admin/research/re-summarize`

- `koreanSummary IS NULL` 논문 전체 조회 → `RESEARCH_RESUMMARY` BatchJob 생성 → 즉시 `{ jobId, total }` 반환 (fire-and-forget)
- 논문마다 `processedItems` 업데이트 → Admin 프론트 2초 폴링
- 버튼 텍스트 실시간: `재처리 중 (15/22)`
- 완료 시 alert + 배치 이력 자동 갱신

### 13.4 연구 데이터 품질 이슈 (CRITICAL)

수집된 논문 중 `koreanSummary`가 null인 경우 원인:

- PubMed 배치 실행 당시 AI 예산 초과 또는 AI 응답 JSON 파싱 실패
- `abstract`는 존재하지만 `summarizeArticle()`이 null 반환 시 silent skip
- **해결**: Admin → 모니터링 → "요약 재처리" 버튼 (실시간 진행률 표시)

---

## 14. 배포 계획 (운영 전 참조)

`ASD/auticare/DEPLOYMENT_GUIDE.md` 참조.

### 요약

| 단계               | 환경                    | 방식                                     |
| ------------------ | ----------------------- | ---------------------------------------- |
| 개발/테스트 (현재) | 회사 EC2                | 현행 유지                                |
| MVP 출시           | 클라우드 PaaS           | Railway + Vercel + Expo EAS (월 1~3만원) |
| 정식 서비스        | 온프레미스 or AWS Seoul | 미니서버 or EC2 + RDS (데이터 규정 고려) |

### 핵심 고려사항

- **개인정보보호법(PIPA)**: 자폐 진단 등 민감정보 처리 → 국내 저장 요건 확인 필요
- **앱스토어 비용**: Apple $99/년, Google Play $25 일회성
- **미니서버 손익분기**: 약 12~18개월 (중고 미니PC 기준)

---

## 16. Phase 5 — Licensing (시작)

### 16.1 스코프

표준화 임상 평가도구 라이선스 관리 + 채점 + 법적 동의 체계.
구현 도구: **M-CHAT-R/F + CARS-2 + ABC** (데모 데이터, 운영 전 실제 데이터로 교체)

### 16.2 태스크 목록

| ID         | 내용                                  | 상태 |
| ---------- | ------------------------------------- | ---- |
| P5-001     | License 스키마 (Prisma 신규)          | ✅   |
| P5-002     | 라이선스 CRUD 모듈                    | ✅   |
| P5-003     | 라이선스 검증 미들웨어                | ✅   |
| P5-004     | 법적 동의 강화                        | ✅   |
| P5-005     | M-CHAT-R/F + CARS-2 + ABC 문항 데이터 | ✅   |
| P5-006     | 채점 알고리즘                         | ✅   |
| P5-007     | 점수 해석 서비스                      | ✅   |
| P5-008     | Admin 라이선스 관리 페이지            | ✅   |
| P5-009~011 | 웹 UI 흐름 (선택→동의→평가→결과)      | ✅   |
| P5-012     | 모바일 동일 흐름                      | ✅   |
| P5-013~016 | 법적 감사, 테스트, 보안, 문서화       | ✅   |
| P5-017~018 | AI 커리큘럼 라이선스 점수 반영        | ✅   |

### 16.3 결정사항

- 도구 데이터: **데모 데이터**로 구현 (실제 운영 전 교체)
- 구현 도구: **M-CHAT-R/F, CARS-2, ABC** 우선 (ADOS-2, SCQ 이후)

### 16.4 P4 완전 완료 현황

| 항목                          | 상태    |
| ----------------------------- | ------- |
| 아이 추가 (모바일)            | ✅      |
| GDPR 데이터 내보내기 (모바일) | ✅      |
| 연구 자동 아카이브 배치 연결  | ✅      |
| P4 이연 전체                  | ✅ 완료 |

### 16.5 Phase 5 핵심 아키텍처

#### 라이선스 모듈 구조 (`apps/api/src/licenses/`)

| 파일                            | 역할                                                |
| ------------------------------- | --------------------------------------------------- |
| `licenses.service.ts`           | 등록/활성화/취소/검증/만료처리                      |
| `licensed-tool-data.service.ts` | 도구별 데모 문항 정의 + 가족 질문지 생성            |
| `assessment-scoring.service.ts` | M-CHAT/CARS-2/ABC 채점 + 해석 + 발달수준 업데이트   |
| `licenses.controller.ts`        | Admin CRUD + 가족 라이선스 조회 + 채점 엔드포인트   |
| `license.guard.ts`              | `@RequiresLicense(tool)` 데코레이터로 라이선스 검증 |

#### 라이선스 흐름

```
Admin 등록 (POST /admin/licenses)
  → keyHash(SHA-256) 저장
  → 가족용 LICENSED 질문지 자동 생성 (LicensedToolDataService)
      ↓
웹/모바일: 질문지 탭 → 도구 선택
  → 라이선스 확인 (GET /families/:id/licenses/:tool)
  → 동의 모달 (GET /consent/tool/:tool/document → POST /consent/tool/:tool)
  → 평가 폼 (POST /children/:id/assessments)
  → 채점 (POST /assessments/:id/score)
      → child.developmentalLevel 자동 업데이트 (P5-018)
      → 커리큘럼 다음 생성 시 점수 반영 (P5-017)
```

#### 채점 점수 매핑 (DB 1-5 스케일)

| 도구       | UI 버튼               | DB 저장     | 해석             |
| ---------- | --------------------- | ----------- | ---------------- |
| M-CHAT-R/F | 예=정상 / 아니오=이상 | 2 / 4       | ≥3이면 fail      |
| CARS-2     | 1~4 직접              | 1~4         | 합산 15-60점     |
| ABC        | 0~3                   | 1~4 (shift) | 합산, 하위척도별 |

#### 운영 전 필수 교체 항목

- `CONSENT_DOCUMENTS` in `consent.service.ts` — 현재 데모 텍스트, 실제 저작권 문구로 교체
- `TOOL_SCHEMAS` in `licensed-tool-data.service.ts` — 현재 데모 문항, 실제 도구 구매 후 교체

---

## 18. 이번 세션 주요 변경사항 (2026-06-09)

### 18.1 이미지 → 질문지 AI Vision 변환

| 항목           | 내용                                                            |
| -------------- | --------------------------------------------------------------- |
| 백엔드         | `ImageImportService` — Claude Vision (Direct + Bedrock)         |
| 엔드포인트     | `POST /families/:id/questionnaires/from-image`                  |
| 웹 UI          | `ImageImportModal.tsx` — 업로드 + 분석 진행률 + 미리보기 + 저장 |
| 이미지 압축    | 전송 전 1920px 리사이즈 + JPEG 85% (50MB 제한)                  |
| AI feature key | `IMAGE_QUESTIONNAIRE`                                           |

### 18.2 임상 평가 보고서 (ClinicalReport)

새 Prisma 모델 및 완전한 기능 구현:

```
ClinicalReport
├── assessmentTool (도구명)
├── assessmentDate (평가 실시일)
├── evaluatorType (직종)
├── sectionScores: Json (섹션별 점수 배열)
├── totalScore + totalScoreUnit
├── clinicalFindings (소견)
└── source: MANUAL | IMAGE_IMPORT
```

**API**: `GET/POST /children/:id/clinical-reports`, `POST from-image`, `DELETE :id`

**커리큘럼 AI 연동**: `generateAlerts()` + `buildCurriculumPrompt()` 에 임상 보고서 데이터 반영

### 18.3 메뉴 구조 대폭 개선 (일상 관찰 vs 임상 평가 분리)

**핵심 결정**: 부모의 매일 관찰 체크와 공인 임상 평가 도구를 완전히 분리

```
치료 관리 (일상 루틴)          임상 평가 (전문 데이터)
├── 대시보드                  ├── 임상 평가 (/clinical)
├── 커리큘럼                  │     탭: 평가 실행 | 외부 보고서 | 타임라인
├── 일정                      └── 질문지 관리 (/questionnaires)
├── 일일 발달 체크 (구: 평가 입력)
├── 성장 기록 (추이/도메인/마일스톤만)
└── AI 분석
```

**변경 이유**:

- `평가 입력` → `일일 발달 체크` (부모의 비공식 매일 관찰)
- `성장 기록` → 일상 관찰 기반만 (임상 탭 제거)
- `질문지` → `질문지 관리` (커스텀 질문지만, 라이선스 탭 제거)
- 신규 `/clinical` 페이지 → 라이선스 도구 + 외부 보고서 통합

### 18.4 임상 평가 기능 강화

| 기능               | 내용                                                     |
| ------------------ | -------------------------------------------------------- |
| **3탭 구조**       | 평가 실행 (도구카드+이력) / 외부 평가 보고서 / 타임라인  |
| **임상 타임라인**  | 라이선스 도구 평가 + 외부 보고서 통합 시간순 뷰          |
| **재평가 알림**    | M-CHAT 3개월, CARS-2 6개월, ABC/외부보고서 12개월 주기   |
| **대시보드 알림**  | `RE_EVALUATION_DUE` 타입 추가, 🏥 아이콘 + detail 텍스트 |
| **AssessmentForm** | 질문지 선택 제거 → 5개 도메인 일일 체크만                |

### 18.5 대시보드 개선

| 항목           | 내용                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| 도메인 한글화  | `COMMUNICATION→의사소통`, `SOCIAL→사회성`, `OTHER→기타` 등 대소문자 모두 처리 |
| 일정 시간 표시 | `TodaySchedule.time` (KST HH:MM) 필드 추가                                    |
| 재평가 알림    | 임상 도구별 주기 초과 시 대시보드에 자동 표시                                 |

### 18.6 인프라 개선

| 항목              | 내용                                                         |
| ----------------- | ------------------------------------------------------------ |
| 정적 서빙 전환    | `nx serve` → `vite preview` (메모리 1-2GB → ~100MB, 안정적)  |
| Watchdog          | 5분마다 web/admin 헬스체크, 죽으면 자동 재시작 (cron)        |
| JWT 갱신          | 웹/Admin 모두 5분 전 자동 갱신 (탭 복귀 시도 포함)           |
| API body 제한     | 20MB → 50MB (이미지 업로드)                                  |
| 터널 지원         | `.trycloudflare.com` allowedHosts 추가, 120초 proxy timeout  |
| Cloudflare Tunnel | `scripts/tunnel.sh` start/stop/status, 테스트 환경 외부 공유 |

### 18.7 핵심 패턴 (신규)

```
질문지 관리 (/questionnaires)   ← 커스텀 질문지 라이브러리
임상 평가 (/clinical)           ← 라이선스 도구 + 외부 보고서

일일 발달 체크 (/assessment)    ← 부모 매일 관찰 (5도메인 체크만)
성장 기록 (/growth)             ← 일상 데이터 기반 추이/마일스톤

vite preview = 빌드 후 정적 서빙 + /v1 proxy
코드 변경 후: rebuild-web.sh → restart-fe.sh
```

---

## 19. 모바일 임상 평가 UI (2026-06-09)

### 19.1 구현 내용

| 항목        | 내용                                               |
| ----------- | -------------------------------------------------- |
| 화면 파일   | `apps/mobile/app/clinical.tsx`                     |
| 훅 파일     | `apps/mobile/hooks/use-clinical-reports.ts`        |
| 라우팅      | More 탭 → "임상 평가" → `/clinical` (Stack push)   |
| 탭 구조     | 평가 실행 / 외부 보고서 / 타임라인 (웹과 동일 3탭) |
| 의존성 추가 | `expo-image-picker` (이미지 업로드)                |

### 19.2 기능 상세

**탭 1 (평가 실행):**

- 5개 도구 카드 (M-CHAT-R/F, CARS-2, ABC 사용 가능 / ADOS-2, SCQ 준비중)
- 카드 탭 → `licensed-assessment` 화면으로 이동 (기존 위저드 재사용)
- 최신 점수 + 심각도 배지 표시
- 저작권 경고 배너
- 라이선스 평가 결과 이력 목록

**탭 2 (외부 보고서):**

- 보고서 목록 (도구명, 날짜, 평가자, 기관, 총점, 섹션 점수, 소견)
- 수동 입력 폼 (펼치기/접기)
- 사진 촬영/갤러리 → AI Vision 추출 (`expo-image-picker` + `from-image` API)
- AI 추출 결과 미리보기 + 수정 후 저장
- 삭제 (Platform 분기 confirm)

**탭 3 (타임라인):**

- 라이선스 도구 평가 + 외부 보고서 통합 시간순 뷰
- 세로 점선 + 컬러 도트 (라이선스=primary, 외부=info)
- 날짜, 도구명, 점수, 심각도 배지

### 19.3 메뉴 변경

- More 탭: "라이선스 도구" → "임상 평가" 로 변경 (통합 페이지가 라이선스 도구 포함)
- 아이콘 동일 유지 (🏥)

---

## 20. 수업 피드백 기능 (2026-06-10)

### 20.1 개요

매일 ABA/언어치료/감각통합 등 수업 후 치료사 피드백을 부모가 기록하는 기능.
3계층 AI 파이프라인으로 방대한 일일 데이터를 커리큘럼 AI에 효율적으로 주입.

### 20.2 신규 Prisma 모델

| 모델              | 목적                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `SessionFeedback` | 수업별 피드백 (rating 1-5, content, progress, challenges, homeWork)   |
| `FeedbackDigest`  | 주간 AI 요약 캐시 (weekKey 기준 upsert, @@unique([childId, weekKey])) |

### 20.3 API 엔드포인트

| Method   | Path                                           | 설명                                           |
| -------- | ---------------------------------------------- | ---------------------------------------------- |
| `POST`   | `/children/:id/session-feedbacks`              | 피드백 생성                                    |
| `GET`    | `/children/:id/session-feedbacks`              | 목록 (페이지네이션, from/to/sessionType 필터)  |
| `GET`    | `/children/:id/session-feedbacks/stats`        | 수업별 통계 (30일)                             |
| `GET`    | `/children/:id/session-feedbacks/autocomplete` | sessionType/therapistName/institution 자동완성 |
| `PATCH`  | `/session-feedbacks/:id`                       | 수정 (본인만)                                  |
| `DELETE` | `/session-feedbacks/:id`                       | 삭제 (본인만)                                  |
| `GET`    | `/children/:id/feedback-digests`               | 주간 요약 목록                                 |
| `POST`   | `/children/:id/feedback-digests/generate`      | 수동 AI 요약 생성                              |

### 20.4 AI 파이프라인

```
Layer 1 (Raw)     → SessionFeedback DB 저장 (매일 입력)
Layer 2 (Weekly)  → FeedbackDigestBatchService (일요일 21:00)
                    최소 3건 이상 → sessionType별 그룹핑 + truncation → AI 호출
                    결과: FeedbackDigest upsert (weekKey 기준)
Layer 3 (Prompt)  → CurriculumPromptService 8번째 소스
                    buildPromptSummary(childId, 7일) → ≤200 토큰으로 압축 주입
```

AI feature key: `FEEDBACK_DIGEST` (Haiku 추천)

### 20.5 대시보드 연동

- `FEEDBACK_REMINDER` alert 타입 추가: 최근 3일 피드백 없으면 표시

### 20.6 모듈 위치

```
apps/api/src/session-feedbacks/
├── session-feedbacks.service.ts      ← CRUD + buildPromptSummary
├── session-feedbacks.controller.ts   ← 8개 엔드포인트
├── session-feedbacks.module.ts
├── feedback-digest.service.ts        ← AI 요약 생성 + weekKey 관리
├── feedback-digest-batch.service.ts  ← node-cron 0 21 * * 0
└── session-feedbacks.service.spec.ts ← 18개 테스트
```

### 20.7 웹 UI

- `/session-feedback` 페이지 (2탭: 피드백 목록 + AI 주간 요약)
- `SessionFeedbackModal.tsx` — 작성 모달 (필수/선택 필드 + 자동완성)
- 사이드바 "치료 관리" 그룹에 "수업 피드백" 메뉴 추가
- `SchedulePage.tsx` — 일정 카드에 "피드백 작성" CTA 버튼

### 20.8 모바일 UI

- `apps/mobile/app/session-feedback.tsx` — 3탭 (최근/전체/AI요약) + 인라인 작성폼
- More 탭 치료 도구 섹션에 "수업 피드백 📝" 메뉴 추가
- `apps/mobile/app/(tabs)/schedule.tsx` — 지난 일정 카드에 피드백 버튼

---

## 21. 복약 관리 기능 (2026-06-10)

### 21.1 개요

의사가 처방한 약물 복용 기록 보조 도구. AI 약물 추천/처방 제안은 절대 금지.
면책 고지 문구 필수 표시.

### 21.2 신규 Prisma 모델

| 모델                 | 목적                                               |
| -------------------- | -------------------------------------------------- |
| `Medication`         | 약물 정보 (soft delete: isActive=false)            |
| `MedicationLog`      | 일별 복용 기록 (@@unique([medicationId, logDate])) |
| `MedicationReaction` | 복용 후 반응 관찰 (기분 척도, 이상반응 체크리스트) |

### 21.3 API 엔드포인트

| Method   | Path                               | 설명                             |
| -------- | ---------------------------------- | -------------------------------- |
| `POST`   | `/children/:id/medications`        | 약물 등록                        |
| `GET`    | `/children/:id/medications`        | 목록 (activeOnly 필터)           |
| `PATCH`  | `/medications/:id`                 | 수정 (isActive 포함)             |
| `DELETE` | `/medications/:id`                 | soft delete (isActive=false)     |
| `POST`   | `/medications/:id/logs`            | 복용 기록 upsert (날짜 기준)     |
| `GET`    | `/children/:id/medication-logs`    | 기간별 복용 이력                 |
| `POST`   | `/medications/:id/reactions`       | 반응 기록                        |
| `GET`    | `/medications/:id/reactions`       | 반응 이력                        |
| `GET`    | `/children/:id/medication-summary` | 복용률 + 반응 집계 (진료 요약용) |

### 21.4 모듈 위치

```
apps/api/src/medications/
├── medications.service.ts    ← CRUD + logs + reactions + summary
├── medications.controller.ts ← 9개 엔드포인트
└── medications.module.ts
```

### 21.5 웹 UI

- 사이드바 "건강 관리" 그룹 (신규) → "복약 관리" (`/medication`)
- 3탭: 약물 목록 / 복용 기록 / 진료 요약
- 면책 고지 배너 상단 상시 노출
- 진료 요약: 복용률 차트 + 이상반응 이력 → 클립보드 복사

### 21.6 모바일 UI

- More 탭 "건강 관리" 그룹 (신규) → "복약 관리 💊"
- 3탭: 오늘 / 기록 / 약물 관리
- 오늘 탭: 오늘 복용 여부 원탭 체크

### 21.7 이상반응 체크리스트

발진, 식욕감소, 수면변화, 과잉행동, 무기력, 구토, 기타

### 21.8 면책 고지 문구 (CRITICAL)

> ⚠️ 이 기능은 의사가 처방한 약물의 복용을 기록하는 보조 도구입니다. 약물 추가 또는 변경은 반드시 전문 의료진과 상담하세요.

---

## 22. 피드백 기반 성장 추적 + 일상/문제행동 기록 (2026-06-11)

### 22.1 핵심 변경

**AS-IS**: 부모 → 매일 5도메인 수동 별점 → Assessment
**TO-BE**: 부모 → 피드백 텍스트 → AI 자동 도메인 추출 → Assessment (하위 시스템 변경 없음)

### 22.2 SessionFeedback 신규 필드

| 필드             | 타입                      | 설명                                                       |
| ---------------- | ------------------------- | ---------------------------------------------------------- |
| `feedbackType`   | String (default: SESSION) | SESSION \| DAILY_LOG \| BEHAVIORAL_ISSUE                   |
| `severity`       | Int?                      | 문제행동 심각도 1-5 (BEHAVIORAL_ISSUE 전용)                |
| `behaviorTags`   | String[]                  | ['발작','자해','공격','탈주','멜트다운','상동행동','기타'] |
| `aiDomainScores` | Json?                     | {"COMMUNICATION":4,"SOCIAL":2,...}                         |
| `aiExtracted`    | Boolean                   | AI 추출 완료 여부                                          |

### 22.3 FeedbackDomainExtractionService

위치: `apps/api/src/session-feedbacks/feedback-domain-extraction.service.ts`

- 피드백 저장 후 **fire-and-forget** 비동기 호출
- AI(FEEDBACK_DOMAIN_EXTRACTION/Haiku)가 content+progress+challenges에서 5도메인 점수 추출
- "AI 발달 추출" 시스템 질문지 getOrCreate (familyId 기준, 공유)
- Assessment + AssessmentScore 자동 생성 → 기존 대시보드/성장/커리큘럼 AI 변경 없이 반영

### 22.4 데이터 윈도우 최적화 (curriculum.service.ts)

| 데이터                   | 변경 전                 | 변경 후             |
| ------------------------ | ----------------------- | ------------------- |
| Assessment (일일/AI추출) | take:10, 날짜 제한 없음 | 30일 이내 + take:15 |
| 임상 보고서              | take:3                  | take:1 (최신 1건)   |

### 22.5 FeedbackDigest 확장

- `behaviorSuggestions: String[]` 필드 추가
- BEHAVIORAL_ISSUE 피드백이 있으면 AI가 문제행동 개선 제안 생성
- CurriculumPromptService에 문제행동 요약 섹션(9번째 소스) 추가

### 22.6 AI feature key

`FEEDBACK_DOMAIN_EXTRACTION` 추가 (Haiku 추천)

### 22.7 UI 변경

- 수업 피드백 작성 폼: feedbackType 선택 탭 (📚 수업 / 📝 일상 / ⚠️ 문제행동)
- BEHAVIORAL_ISSUE 선택 시: severity 1-5 + behaviorTags 체크리스트
- 사이드바: "일일 발달 체크" → "정밀 발달 체크 (선택)"

---

## 23. UX 개선 세션 (2026-06-11)

### 23.1 메뉴 구조 변경

| 변경 전                   | 변경 후                                         |
| ------------------------- | ----------------------------------------------- |
| 수업 피드백               | **일일피드백** (Web 사이드바 + Mobile more.tsx) |
| 임상 평가 (별도 카테고리) | 치료 관리 그룹으로 이동 (일일 발달 체크 아래)   |
| 정밀 발달 체크 (선택)     | **삭제** (AI 자동 추출로 대체, DB/API는 유지)   |
| 질문지 관리 (사용자 메뉴) | Admin 전용으로 이동 (사용자 메뉴에서 제거)      |

### 23.2 일일피드백 페이지 재구성

**3탭 구조 (Web + Mobile 동일):**

| 탭         | 내용                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 수업피드백 | feedbackType=SESSION, 구간 선택 (from~to, 기본 30일), 날짜순 전체 표시 |
| 일상기록   | feedbackType=DAILY_LOG + BEHAVIORAL_ISSUE, 동일 구간 선택              |
| AI주간요약 | FeedbackDigest 목록, 기본 최근 4건(1달), 구간 필터                     |

**모바일 전용:** 7일/30일/3개월 프리셋 버튼 제공

### 23.3 일정 캘린더 피드백 날짜 아이콘

- MonthView / WeekView / DayView 에 연필 아이콘 추가
- 피드백 있는 날짜: **초록색** (`text-[#5B8A72]` + 연초록 배경)
- 피드백 없는 날짜: 회색 (클릭 가능)
- 아이콘 클릭 → 해당 날짜 피드백 팝업 (DateFeedbackPopup)
- SchedulePage에서 당월 피드백 Set 조회 → 각 뷰에 `feedbackDates` prop 전달

### 23.4 일정 날짜 피드백 팝업 (DateFeedbackPopup)

- MonthView 날짜 셀 우상단 아이콘 클릭 → 팝업
- 해당 날짜 피드백 목록 (feedbackType 배지, content 미리보기)
- "+ 피드백 추가" 버튼 → SessionFeedbackModal 오픈
- 빈 날짜: "이 날 기록된 피드백이 없습니다"
- **버그 수정**: `startDate`/`endDate` → `from`/`to` 파라미터 통일

### 23.5 도메인 순서 통일 (Web + Mobile)

```
일상생활(DAILY_LIVING) → 의사소통(COMMUNICATION) → 인지(COGNITIVE)
→ 사회성(SOCIAL) → 운동(MOTOR) → 기타(OTHER)
```

변경 파일:

- Web: `DashboardPage.tsx`, `GrowthPage.tsx`, `GrowthLineChart.tsx`, `MilestoneTimeline.tsx`
- Mobile: `index.tsx` (홈/대시보드), `growth.tsx` (성장 기록)
- 렌더링 시 `sortDomains()` helper 적용 (API 응답 순서에 무관하게 정렬)

### 23.6 커리큘럼 AI 생성 모달

- "✨ AI 커리큘럼 생성하기" 클릭 → 모달 팝업 (직접 생성 X)
- 입력 필드: 🗓️ 이번 달 목표 / 📅 이번 주 목표 / ☀️ 오늘의 목표 / 🎯 포함 활동
- 모두 선택 입력 — 비워도 기존처럼 자동 생성
- 백엔드: `POST /children/:id/curriculum/generate` body에 `userInput` 객체 추가

### 23.7 OAuth 소셜 로그인 (일시 비활성화)

- Google/Kakao/Apple 로그인 버튼 표시되나 클릭 시 "서비스 오픈 후 이용 가능" 안내
- 코드 버그 수정: `auth.module.ts` useFactory 패턴으로 전략 등록 타이밍 수정
- 실제 활성화 방법: `.env`에 OAuth 자격증명 입력 후 재시작

### 23.8 IP + 스크립트 업데이트

- EC2 IP 변경: `3.35.36.62` → `3.38.146.1`
- 신규 스크립트: `scripts/update-ip.sh` — IP 변경 시 `.env` + 스크립트 자동 업데이트

### 23.9 현재 접속 주소

| 서비스 | URL                       |
| ------ | ------------------------- |
| 웹     | http://3.38.146.1:4200    |
| Admin  | http://3.38.146.1:4300    |
| 모바일 | http://3.38.146.1:8081    |
| API    | http://3.38.146.1:3100/v1 |

---

## 17. 커밋 컨벤션

```
feat(scope): 새 기능 추가
fix(scope): 버그 수정
test(scope): 테스트 추가/수정
refactor(scope): 리팩터링
docs(scope): 문서 수정
chore(scope): 기타 작업
```

스코프 목록: scaffold, prisma, encryption, auth, users, families, children, schedules, questionnaires, assessments, curricula, activities, dashboard, notifications, reports, research, wellbeing, emergency, sensory, licenses, admin, ai-provider, ai-config, ai-service, api-client, cache, security, consent, gdpr, uploads, web, mobile, infra, e2e, deps, config
