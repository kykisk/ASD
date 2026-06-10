# 복약 관리 (Medication Management) 구현 계획

## 0. 사전분석 — 리스크 및 결정사항

### 핵심 결정

- **AI 약물 추천/처방 제안 절대 금지** — 의료법 위반, 앱스토어 리젝 리스크
- 기능 범위: 의사가 처방한 약물 기록 + 복용 관리 + 반응 관찰 + 진료 요약 보조
- 면책 고지 문구 필수: "이 기능은 복약 기록 보조 도구이며 의료적 판단을 대체하지 않습니다"

### 모호점 해결

| #                      | 결정사항                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| 알림(FCM) 포함 여부    | **제외** — FCM 미설정 환경, Phase 2로 이연                        |
| 약물 데이터베이스 연동 | **제외** — 자유 텍스트 입력으로 충분                              |
| 복용 기록 단위         | 1일 1회 기준 (다회 투약은 메모로)                                 |
| 진료 요약 AI 생성      | **제외** — 텍스트 집계만, AI 없이 구현                            |
| 이상반응 체크리스트    | 고정 목록: 발진, 식욕감소, 수면변화, 과잉행동, 무기력, 구토, 기타 |

---

## 1. 데이터 모델

### 1.1 Medication (약물 정보)

```prisma
model Medication {
  id             String    @id @default(cuid())
  childId        String
  familyId       String

  name           String                // 약물명 (예: 리스페리돈)
  dosage         String?               // 용량 (예: 0.5mg)
  method         String?               // 투약 방법 (예: 경구)
  prescribedBy   String?               // 처방 의사/병원
  startDate      DateTime              // 복약 시작일
  endDate        DateTime?             // 복약 종료일 (null=현재 복용 중)
  frequency      String?               // 복약 주기 (예: 하루 2회 식후)
  notes          String?               // 메모
  isActive       Boolean   @default(true)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  child          Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  family         Family    @relation(fields: [familyId], references: [id], onDelete: Cascade)
  logs           MedicationLog[]
  reactions      MedicationReaction[]

  @@index([childId, isActive])
  @@index([familyId])
}
```

### 1.2 MedicationLog (일별 복용 기록)

```prisma
model MedicationLog {
  id             String    @id @default(cuid())
  medicationId   String
  childId        String
  familyId       String

  logDate        DateTime              // 복용 날짜
  taken          Boolean               // 복용 여부
  takenAt        DateTime?             // 실제 복용 시간
  skippedReason  String?               // 미복용 사유

  createdAt      DateTime  @default(now())

  medication     Medication @relation(fields: [medicationId], references: [id], onDelete: Cascade)
  child          Child      @relation(fields: [childId], references: [id], onDelete: Cascade)
  family         Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)

  @@unique([medicationId, logDate])
  @@index([childId, logDate])
}
```

### 1.3 MedicationReaction (반응 기록)

```prisma
model MedicationReaction {
  id             String    @id @default(cuid())
  medicationId   String
  childId        String
  familyId       String

  observedAt     DateTime              // 관찰 날짜
  moodScore      Int?                  // 기분/활동성 1-5
  notes          String?               // 행동 변화 자유 메모
  sideEffects    String[]              // 이상반응 체크리스트
  hasAnySideEffect Boolean @default(false)

  createdAt      DateTime  @default(now())

  medication     Medication @relation(fields: [medicationId], references: [id], onDelete: Cascade)
  child          Child      @relation(fields: [childId], references: [id], onDelete: Cascade)
  family         Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)

  @@index([medicationId, observedAt])
  @@index([childId, observedAt])
}
```

### 1.4 기존 모델 relation 추가

```prisma
// Child 모델에 추가
medications        Medication[]
medicationLogs     MedicationLog[]
medicationReactions MedicationReaction[]

// Family 모델에 추가
medications        Medication[]
medicationLogs     MedicationLog[]
medicationReactions MedicationReaction[]
```

---

## 2. API 엔드포인트

### 2.1 Medication CRUD

| Method   | Path                             | 설명                        |
| -------- | -------------------------------- | --------------------------- |
| `POST`   | `/children/:childId/medications` | 약물 등록                   |
| `GET`    | `/children/:childId/medications` | 목록 조회 (isActive 필터)   |
| `PATCH`  | `/medications/:id`               | 수정                        |
| `DELETE` | `/medications/:id`               | 삭제 (soft: isActive=false) |

### 2.2 MedicationLog

| Method | Path                                 | 설명                                     |
| ------ | ------------------------------------ | ---------------------------------------- |
| `POST` | `/medications/:id/logs`              | 복용 기록 생성/업데이트 (upsert by date) |
| `GET`  | `/children/:childId/medication-logs` | 기간별 복용 기록 조회                    |

### 2.3 MedicationReaction

| Method | Path                         | 설명             |
| ------ | ---------------------------- | ---------------- |
| `POST` | `/medications/:id/reactions` | 반응 기록 생성   |
| `GET`  | `/medications/:id/reactions` | 약물별 반응 이력 |

### 2.4 진료 요약

| Method | Path                                    | 설명                      |
| ------ | --------------------------------------- | ------------------------- |
| `GET`  | `/children/:childId/medication-summary` | 기간별 복용률 + 반응 집계 |

---

## 3. 웹 UI

### 3.1 진입점

- 사이드바 신규 그룹 **"건강 관리"** 추가
- 하위: **복약 관리** (`/medication`)

### 3.2 페이지 구조 (`/medication`)

**3탭:**

- **약물 목록**: 현재 복용 중인 약물 카드 리스트 + "약물 추가" 버튼 + 종료된 약물 접기
- **복용 기록**: 월간 캘린더 뷰 — 날짜별 복용 여부(✅/❌) + 클릭 시 기록 입력
- **진료 요약**: 기간 선택 → 약물별 복용률, 이상반응 이력, 메모 요약 → 클립보드 복사

### 3.3 약물 등록 모달

- 약물명 (필수), 용량, 투약 방법, 처방 병원/의사, 시작일, 종료일, 복약 주기, 메모
- 하단 면책 고지 문구

### 3.4 복용 기록 입력

- 복용 여부 토글
- 복용 시간 (선택)
- 반응 빠른 기록 (기분 척도 1-5 + 이상반응 체크)

---

## 4. 모바일 UI

### 4.1 진입점

- More 탭 신규 그룹 **"건강 관리"** 추가
- 하위: **복약 관리** (`/medication`)

### 4.2 화면 구조 (`/medication`)

**3탭 (clinical.tsx 패턴 재사용):**

- **오늘**: 오늘 복용해야 할 약물 목록 + 복용 체크
- **기록**: 최근 30일 복용 이력 + 반응 메모
- **약물 관리**: 등록된 약물 목록 + CRUD

---

## 5. 면책 고지 (CRITICAL)

모든 약물 등록/조회 화면 상단에 표시:

> ⚠️ 이 기능은 의사가 처방한 약물의 복용을 기록하는 보조 도구입니다. 약물 추가 또는 변경은 반드시 전문 의료진과 상담하세요.

---

## 6. 구현 태스크 순서

| #   | 태스크                                | 의존성 | 난이도 |
| --- | ------------------------------------- | ------ | ------ |
| 1   | Prisma 모델 3개 + migrate + generate  | 없음   | 낮음   |
| 2   | medications CRUD 서비스+컨트롤러+모듈 | #1     | 중간   |
| 3   | medication-logs upsert + 조회         | #1     | 낮음   |
| 4   | medication-reactions CRUD             | #1     | 낮음   |
| 5   | medication-summary 집계 엔드포인트    | #2,3,4 | 중간   |
| 6   | 웹 UI (3탭 페이지 + 모달)             | #2-5   | 중간   |
| 7   | 웹 사이드바 "건강 관리" 그룹 추가     | #6     | 낮음   |
| 8   | 모바일 UI (3탭 화면)                  | #2-5   | 중간   |
| 9   | 모바일 more.tsx 그룹 추가             | #8     | 낮음   |
| 10  | AGENTS.md + HANDOFF.md 업데이트       | 전체   | 낮음   |

**크리티컬 패스**: #1 → #2 → #3 → #4 → #5 → #6/#8 병렬

---

## 7. 성공 기준

| 지표        | 목표                             |
| ----------- | -------------------------------- |
| 빌드        | TypeScript 에러 0, API 빌드 성공 |
| 기존 테스트 | 282개 통과 유지                  |
| 면책 고지   | 모든 화면에 표시                 |
| 약물 CRUD   | 등록/수정/삭제/조회 정상 동작    |
| 복용 기록   | 날짜별 upsert 정상 동작          |
| 진료 요약   | 복용률 계산 정확                 |
