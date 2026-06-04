# AutiCare — Agent Knowledge Base

> AI 에이전트가 이 프로젝트에서 작업할 때 반드시 읽어야 하는 문서입니다.
> 이 프로젝트는 자폐 아동 가정치료 지원 시스템입니다.

| 항목          | 내용                                |
| ------------- | ----------------------------------- |
| 현재 Phase    | **Phase 3 검증 완료. Phase 4 시작** |
| 최종 업데이트 | 2026-06-04                          |
| 총 커밋       | 121개                               |
| 테스트        | 244개 통과                          |

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

## 12. 커밋 컨벤션

```
feat(scope): 새 기능 추가
fix(scope): 버그 수정
test(scope): 테스트 추가/수정
refactor(scope): 리팩터링
docs(scope): 문서 수정
chore(scope): 기타 작업
```

스코프 목록: scaffold, prisma, encryption, auth, users, families, children, schedules, questionnaires, assessments, curricula, activities, dashboard, notifications, reports, research, wellbeing, emergency, sensory, licenses, admin, ai-provider, ai-config, ai-service, api-client, cache, security, consent, gdpr, uploads, web, mobile, infra, e2e, deps, config
