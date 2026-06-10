# 수업 피드백 (SessionFeedback) 구현 계획

## 0. 사전분석 — 리스크 및 모호점

### 숨은 의도 (Hidden Intentions)

- 단순 피드백 기록이 아닌, **치료사별/수업별 진전 패턴을 AI가 자동 감지**하는 시스템
- 장기적으로는 치료사 변경, 센터 변경 판단 근거 제공
- 커리큘럼 AI가 "어제 ABA에서 턴테이킹 연습했으니 오늘 가정 활동도 연계" 같은 맥락형 제안 가능

### 모호점 (해결 필요)

| #   | 모호점                                    | 결정                                                          |
| --- | ----------------------------------------- | ------------------------------------------------------------- |
| 1   | 피드백 작성자 = 부모만? 치료사도?         | **부모만** (치료사 앱은 스코프 외)                            |
| 2   | 피드백 = 치료사가 말해준 걸 부모가 기록?  | **예** — 치료사 구두 피드백을 부모가 텍스트로 입력            |
| 3   | 기존 5도메인 일일체크와 중복?             | **아님** — 일일체크=부모 자체 관찰, 피드백=치료사 전문가 의견 |
| 4   | 일정에 "완료" 상태가 없는데?              | **scheduleId + sessionDate로 연결** (완료 상태 불필요)        |
| 5   | 반복일정 연결 시 occurrence ID 패턴 사용? | **아님** — scheduleId(원본) + sessionDate(날짜)로 충분        |
| 6   | sessionType 자유입력 시 오타/중복?        | **미리정의 목록 + 커스텀 입력** 하이브리드                    |

### UX 마찰 리스크

- **핵심 위험**: 매일 입력 → 피로 → 이탈
- **완화책**:
  - 최소 필수 = rating(1탭) + content(1줄도 OK)
  - 이전 입력에서 sessionType/therapistName 자동완성
  - 일정 완료 시 Push 알림 → "수업 어땠나요?" 원탭 진입

### AI 실패점

| 리스크                       | 완화                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| 초기 데이터 부족 (첫 주 5건) | 최소 2주(10건+) 축적 후 AI 요약 시작                           |
| 자유 텍스트 품질 편차        | 구조화 필드(rating, progress, challenges) 우선, content는 보조 |
| 요약 시 중요 뉘앙스 소실     | "challenges" 필드는 별도 추출하여 프롬프트에 직접 포함         |
| 치료사마다 다른 용어 사용    | AI에게 "ABA/VB/DTT 등 동일 도메인으로 통합 해석" 지시          |

---

## 1. 데이터 모델

### 1.1 SessionFeedback (신규)

```prisma
model SessionFeedback {
  id            String   @id @default(cuid())
  childId       String
  familyId      String
  userId        String   // 작성자 (부모)

  // 수업 정보
  sessionDate   DateTime               // 수업 실시일 (DATE만 사용)
  sessionType   String                 // 'ABA', '언어치료', '감각통합', '작업치료', '행동치료', 기타
  therapistName String?                // 선생님 이름 (자동완성용)
  institution   String?                // 센터명 (자동완성용)
  durationMin   Int?                   // 수업 시간 (분)

  // 일정 연결 (옵션)
  scheduleId    String?                // 기존 Schedule과 연결 (null=비등록 수업)

  // 피드백 핵심
  rating        Int                    // 1-5 전반적 수업 만족도
  content       String                 // 치료사 피드백 본문 (핵심 필드)
  progress      String?                // 잘한 점 / 진전사항
  challenges    String?                // 어려웠던 점
  homeWork      String?                // 가정 연습 과제
  parentNote    String?                // 부모 추가 메모

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  child         Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  schedule      Schedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)

  @@index([childId, sessionDate])
  @@index([familyId, sessionDate])
  @@index([childId, sessionType])
}
```

### 1.2 FeedbackDigest (주간 AI 요약 저장)

```prisma
model FeedbackDigest {
  id           String   @id @default(cuid())
  childId      String
  familyId     String
  weekKey      String   // '2026-W24' 형식 (중복 방지)

  // AI 생성 요약
  summary      String   // 전체 주간 요약 텍스트
  bySessionType Json    // { "ABA": { count, avgRating, keyProgress, keyChallenges }, ... }
  highlights   String[] // 주요 진전 포인트
  concerns     String[] // 주의 필요 사항
  homeWorkSummary String? // 가정 연습 종합

  feedbackCount Int     // 해당 주 피드백 수
  periodStart  DateTime
  periodEnd    DateTime

  createdAt    DateTime @default(now())

  child        Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  family       Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)

  @@unique([childId, weekKey])
  @@index([familyId, weekKey])
}
```

### 1.3 Schedule 모델 수정

```prisma
// Schedule 모델에 relation 추가만
model Schedule {
  // ... 기존 필드 유지
  feedbacks    SessionFeedback[]  // 새 relation
}
```

### 1.4 Child 모델 수정

```prisma
// Child 모델에 relation 추가만
model Child {
  // ... 기존 필드 유지
  sessionFeedbacks  SessionFeedback[]
  feedbackDigests   FeedbackDigest[]
}
```

---

## 2. API 엔드포인트

### 2.1 SessionFeedback CRUD

| Method   | Path                                                | 설명                                                      |
| -------- | --------------------------------------------------- | --------------------------------------------------------- |
| `POST`   | `/children/:childId/session-feedbacks`              | 피드백 생성                                               |
| `GET`    | `/children/:childId/session-feedbacks`              | 목록 조회 (페이지네이션, 날짜 필터)                       |
| `GET`    | `/children/:childId/session-feedbacks/stats`        | 통계 (수업별 빈도, 평균 rating, 최근 30일)                |
| `GET`    | `/children/:childId/session-feedbacks/autocomplete` | 자동완성 (therapistName, institution, sessionType 고유값) |
| `PATCH`  | `/session-feedbacks/:id`                            | 수정                                                      |
| `DELETE` | `/session-feedbacks/:id`                            | 삭제                                                      |

### 2.2 FeedbackDigest

| Method | Path                                           | 설명                      |
| ------ | ---------------------------------------------- | ------------------------- |
| `GET`  | `/children/:childId/feedback-digests`          | 주간 요약 목록 (최근 N주) |
| `POST` | `/children/:childId/feedback-digests/generate` | 수동 요약 생성 (현재 주)  |

### 2.3 쿼리 파라미터

```
GET /children/:childId/session-feedbacks
  ?from=2026-06-01&to=2026-06-30   // 날짜 필터
  ?sessionType=ABA                   // 수업 종류 필터
  ?page=1&limit=20                   // 페이지네이션
  ?scheduleId=xxx                    // 특정 일정의 피드백만
```

---

## 3. AI 통합 파이프라인

### 3.1 Layer 1: Raw Storage

- 사용자가 매일 입력하는 그대로 DB 저장
- 검색/필터/통계는 DB 쿼리로 처리 (AI 불필요)

### 3.2 Layer 2: Weekly Condensation (배치)

**트리거**: `0 21 * * 0` (일요일 21:00, insights-batch 직후)

**로직**:

```typescript
// FeedbackDigestService.generateWeekly(childId)
1. 해당 주 SessionFeedback 조회 (sessionDate 기준 월~일)
2. 최소 3건 미만이면 skip (데이터 부족)
3. sessionType별 그룹핑:
   - count, avgRating
   - progress 필드 모아서 concatenate (각 100자 truncate)
   - challenges 필드 모아서 concatenate (각 100자 truncate)
   - homeWork 필드 모아서 concatenate (각 80자 truncate)
4. AI 호출 (feature: 'FEEDBACK_DIGEST'):
   시스템 프롬프트: "치료 피드백 분석 전문가. 주간 피드백을 분석하여..."
   유저 프롬프트: 구조화된 수업별 데이터 전달
5. AI 응답 → Zod 검증 → FeedbackDigest upsert (weekKey 기준)
```

**AI 입력 크기 제어**:

- 피드백 content: 각 150자 truncate
- progress/challenges: 각 100자 truncate
- 주당 최대 20건 피드백만 (나머지는 rating 통계로만 반영)
- 총 프롬프트: ~800-1200 토큰 (주간 데이터 전체)

### 3.3 Layer 3: Curriculum Prompt Injection

**수정 대상**: `CurriculumPromptService.buildCurriculumPrompt()`

**추가 섹션** (8번째 데이터 소스):

```
## 최근 수업 피드백 요약
- ABA (3회, 평균 4.2/5): 진전="모방 행동 증가", 과제="눈맞춤 유지"
- 언어치료 (2회, 평균 3.8/5): 진전="2어절 조합 시도", 과제="발음 명료도"
[가정연습] 매일 10분 모방 놀이, 그림카드 3장 명명하기
```

**데이터 소스**: FeedbackDigest (최신 1-2주) 또는 최근 7일 raw 피드백 (digest 없을 시 fallback)

**토큰 예산**: 최대 200 토큰 (전체 커리큘럼 프롬프트의 ~5%)

### 3.4 Insights 연동

**수정 대상**: `InsightsService.generateWeeklyInsight()`

**추가**: 30일 피드백 통계를 인사이트 프롬프트에 포함

- sessionType별 빈도 변화 (수업 횟수 증감)
- 평균 rating 추이 (향상/하락)
- 주요 challenges 키워드

---

## 4. 웹 UI

### 4.1 진입점

**일정 페이지** (`/schedule`):

- 일정 카드에 "피드백" 버튼 추가 (해당 날짜 이후만 활성)
- 캘린더 아래 "+ 수업 피드백 추가" 버튼 (비등록 수업용)

**사이드바**: 치료 관리 그룹에 "수업 피드백" 메뉴 추가 (`/session-feedback`)

### 4.2 수업 피드백 페이지 (`/session-feedback`)

**2탭 구조**:

- **피드백 목록**: 날짜순 카드 리스트 + 필터(수업 종류, 기간) + 통계 요약 상단
- **주간 AI 요약**: FeedbackDigest 카드 리스트 (주차별 펼치기/접기)

### 4.3 피드백 작성 모달/폼

**필수 필드**:

- 수업 종류 (드롭다운: 기본 목록 + 커스텀 입력)
- 수업일 (기본: 오늘)
- 전반적 평가 (별점 1-5)
- 치료사 피드백 (텍스트)

**선택 필드** (접힌 상태로 시작):

- 잘한 점
- 어려웠던 점
- 가정 연습 과제
- 선생님 이름 (자동완성)
- 센터명 (자동완성)
- 수업 시간
- 일정 연결 (오늘 일정 목록에서 선택)

---

## 5. 모바일 UI

### 5.1 진입점

**홈 대시보드**: "오늘 수업" 섹션 아래 "피드백 작성" 퀵 버튼

**일정 탭**: 완료 시간 지난 일정에 피드백 아이콘

**더보기 탭**: "수업 피드백" 메뉴 항목 추가

### 5.2 피드백 화면 (`/session-feedback`)

**3탭** (clinical.tsx 패턴 재사용):

- **최근**: 최근 7일 피드백 카드
- **전체**: 페이지네이션 + 필터
- **AI 요약**: 주간 다이제스트 목록

### 5.3 작성 화면

- 별점 터치 (1탭)
- 수업 종류 선택 (칩/태그 UI)
- 피드백 본문 (필수, placeholder="선생님이 뭐라고 하셨나요?")
- 선택 필드 (아코디언 "더 입력하기")
- 저장 버튼

### 5.4 자동완성 UX

- therapistName: 이전 입력값에서 제안
- sessionType: 최근 사용 순으로 정렬
- institution: 이전 입력값에서 제안
- 일정 연결: 해당 날짜 일정 자동 추천 (category=THERAPY인 것 우선)

---

## 6. 배치 서비스

### 6.1 FeedbackDigestBatchService

```
Cron: 0 21 * * 0 (일요일 21:00)
```

1. 모든 활성 아이(hasFamily) 조회
2. 각 아이별:
   - 해당 주 피드백 count 확인
   - 3건 미만 → skip
   - 기존 weekKey digest 존재 → skip (중복 방지)
   - AI 요약 생성 → FeedbackDigest upsert
3. BatchJob 진행률 업데이트
4. 완료 알림 (Admin)

### 6.2 AI Feature Config

```
Feature key: 'FEEDBACK_DIGEST'
추천 모델: Haiku (비용 효율, 요약 작업에 충분)
일일 예산: 가족당 1회/주 (자동 배치)
```

---

## 7. 대시보드 연동

### 7.1 새 Alert 타입

```typescript
// NO_FEEDBACK_3_DAYS: 3일 이상 피드백 미입력 시
{
  type: 'FEEDBACK_REMINDER',
  message: '3일간 수업 피드백을 입력하지 않았어요',
  severity: 'info'
}
```

### 7.2 대시보드 위젯 (선택)

- "이번 주 수업": N회 수업 / M건 피드백 작성
- 평균 rating 트렌드 (최근 4주 미니 차트)

---

## 8. 구현 순서 (태스크)

| #   | 태스크                                        | 의존성       | 예상 난이도 |
| --- | --------------------------------------------- | ------------ | ----------- |
| 1   | Prisma 모델 추가 + 마이그레이션               | 없음         | 낮음        |
| 2   | SessionFeedback CRUD 서비스 + 컨트롤러 + DTOs | #1           | 중간        |
| 3   | Autocomplete 엔드포인트 (DISTINCT 쿼리)       | #2           | 낮음        |
| 4   | FeedbackDigest 모델 + AI 요약 서비스          | #1, AI서비스 | 중간        |
| 5   | FeedbackDigest 배치 서비스 (cron)             | #4           | 낮음        |
| 6   | CurriculumPrompt 연동 (8번째 소스)            | #2           | 낮음        |
| 7   | InsightsService 연동                          | #2           | 낮음        |
| 8   | 웹 UI: 피드백 페이지 + 작성 모달              | #2           | 중간        |
| 9   | 웹 UI: 일정 페이지 피드백 CTA                 | #8           | 낮음        |
| 10  | 모바일: 피드백 화면 + 작성폼                  | #2           | 중간        |
| 11  | 모바일: 일정 탭 연동                          | #10          | 낮음        |
| 12  | Dashboard alert + 위젯                        | #2           | 낮음        |
| 13  | 테스트 (API 단위 테스트)                      | #2,#4        | 중간        |
| 14  | AGENTS.md 업데이트                            | 전체         | 낮음        |

**크리티컬 패스**: #1 → #2 → #4 → #6 (AI 연동까지)
**병렬 가능**: #8+#10 (웹/모바일 UI), #3+#7+#12 (부가 연동)

---

## 9. 스코프 제외 (의도적)

| 제외 항목               | 이유                              |
| ----------------------- | --------------------------------- |
| 치료사 직접 입력        | 별도 앱 필요, Phase 7+            |
| 음성 입력 (STT)         | expo-speech 불안정, 후속          |
| 사진/동영상 첨부        | S3 비용 + 복잡도, 후속            |
| 수업별 세부 스킬 트래킹 | 도메인별은 기존 assessment로 충분 |
| 치료사 간 비교 분석     | 민감 데이터, 법적 검토 필요       |
| 센터 평가/리뷰 기능     | 서비스 취지와 다름                |

---

## 10. 성공 기준

| 지표          | 목표                                       |
| ------------- | ------------------------------------------ |
| API 응답 시간 | 목록 조회 < 200ms (인덱스 활용)            |
| 작성 완료율   | 필수 필드만으로 10초 이내 작성 가능        |
| AI 요약 품질  | 주간 요약이 수업별 진전+과제를 정확히 반영 |
| 프롬프트 토큰 | 커리큘럼 프롬프트에 추가되는 토큰 ≤ 200    |
| 테스트        | 신규 API 테스트 15개+ 추가                 |
| 빌드          | TypeScript 에러 0, 기존 267 테스트 유지    |
