# 피드백 기반 성장 추적 + 일상/문제행동 기록 구현 계획

## 0. 핵심 변경 요약

### AS-IS (현재)

```
부모 → 매일 5도메인 수동 별점 → Assessment → 대시보드/성장/커리큘럼 AI
```

### TO-BE (변경 후)

```
부모 → 피드백 텍스트 작성 → AI 자동 도메인 추출 → Assessment → (기존 시스템 그대로)
         ↓
      feedbackType: SESSION | DAILY_LOG | BEHAVIORAL_ISSUE
         ↓
      문제행동 피드백 → AI 행동 개선 제안
```

**기존 Assessment 모델 유지 → 하위 시스템(대시보드, 성장기록, 커리큘럼) 변경 없음**

---

## 1. 데이터 모델 변경

### 1.1 SessionFeedback 필드 추가 (기존 모델 수정)

```prisma
model SessionFeedback {
  // ... 기존 필드 유지

  // 신규 필드
  feedbackType   String   @default("SESSION")  // SESSION | DAILY_LOG | BEHAVIORAL_ISSUE
  severity       Int?     // 문제행동 심각도 1-5 (BEHAVIORAL_ISSUE 전용)
  behaviorTags   String[] // 문제행동 태그 ['발작', '자해', '공격', '탈주', '멜트다운', '기타']

  // AI 자동 추출 도메인 점수 (피드백 저장 시 AI가 자동 채움)
  aiDomainScores Json?    // { "COMMUNICATION": 4, "SOCIAL": 2, "COGNITIVE": 3, "MOTOR": 3, "EMOTIONAL": 3 }
  aiExtracted    Boolean  @default(false)
}
```

### 1.2 Assessment 자동 생성 (기존 모델 그대로 활용)

피드백 저장 시 aiDomainScores가 추출되면 → Assessment + AssessmentScore 자동 생성
→ 기존 대시보드/성장/커리큘럼 AI가 이 Assessment를 읽으므로 변경 불필요

---

## 2. AI 도메인 추출 서비스

### 2.1 새 서비스: `FeedbackDomainExtractionService`

위치: `apps/api/src/session-feedbacks/feedback-domain-extraction.service.ts`

**로직:**

1. 피드백 content + progress + challenges 텍스트 조합
2. AI 호출 (feature: `FEEDBACK_DOMAIN_EXTRACTION`, 모델: Haiku)
3. 응답: 5개 도메인 각 1-5점 추출 (정보 없으면 null)
4. SessionFeedback.aiDomainScores에 저장
5. Assessment + AssessmentScore 자동 생성

**AI 프롬프트:**

```
아이의 치료/일상 피드백을 읽고 5개 발달 도메인 점수를 추출하세요.
도메인: COMMUNICATION(의사소통), SOCIAL(사회성), MOTOR(운동), COGNITIVE(인지), EMOTIONAL(정서)
각 1-5점 (1=매우 어려움, 3=보통, 5=매우 좋음)
정보가 없는 도메인은 null로 표시하세요.
JSON으로만 응답: {"COMMUNICATION":4,"SOCIAL":2,"MOTOR":null,"COGNITIVE":null,"EMOTIONAL":3}
```

### 2.2 트리거 시점

- `SessionFeedbacksService.create()` 완료 후 → fire-and-forget으로 추출
- 실패해도 피드백 저장에 영향 없음 (비동기)
- feedbackType 무관하게 모든 타입에서 추출 시도

---

## 3. 문제행동 AI 개선 제안

### 3.1 FeedbackDigest 배치 확장

기존 `FeedbackDigestBatchService` (일요일 21:00)에 추가:

- feedbackType=BEHAVIORAL_ISSUE인 피드백이 3건 이상이면
- AI에게 "문제행동 패턴 분석 + 개선 제안" 추가 요청
- FeedbackDigest.concerns 필드 + 신규 필드 `behaviorSuggestions: String[]`에 저장

### 3.2 FeedbackDigest 필드 추가

```prisma
model FeedbackDigest {
  // ... 기존 필드 유지
  behaviorSuggestions String[]  // AI 문제행동 개선 제안 (신규)
}
```

### 3.3 커리큘럼 AI 연동

CurriculumPromptService에 문제행동 패턴 요약 주입:

```
최근 문제행동 기록:
- 발작 2회 (6/5, 6/8): 과자 거절 시 발생
- 밀치기 1회 (6/7): 친구 장난감 빼앗기 시
AI 개선 제안: 거절 대안 카드 활용, 공유 놀이 단계적 연습
→ 위 문제행동과 개선 방향을 활동 설계에 반영해주세요.
```

---

## 4. UI 변경

### 4.1 웹 — 피드백 작성 모달 수정

**SessionFeedbackModal 변경:**

- 상단에 타입 선택 (세그먼트 버튼): 📚 수업 | 📝 일상 | ⚠️ 문제행동
- `SESSION`: 기존 필드 그대로
- `DAILY_LOG`: sessionType 숨기고, content만 (placeholder: "오늘 아이는 어땠나요?")
- `BEHAVIORAL_ISSUE`: severity 1-5 추가, behaviorTags 체크리스트 추가

### 4.2 웹 — 일일 체크 메뉴 격하

- 사이드바: "일일 발달 체크" → "정밀 발달 체크 (선택)" 으로 이름 변경
- 또는 메뉴에서 완전 제거하고 설정에 숨기기

### 4.3 모바일 — session-feedback 화면 수정

- 작성 폼에 feedbackType 선택 추가 (칩 버튼)
- BEHAVIORAL_ISSUE 선택 시 severity + behaviorTags UI 표시

---

## 5. 데이터 윈도우 (이미 적용됨)

| 데이터                       | 윈도우          |
| ---------------------------- | --------------- |
| Assessment (일일체크/AI추출) | 30일 + take 15  |
| 임상 평가                    | 도구별 최신 1건 |
| 외부 보고서                  | 최신 1건        |
| 수업 피드백 요약             | 7일             |

---

## 6. 구현 태스크

| #   | 태스크                                                                                                                       | 난이도 |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Prisma: SessionFeedback에 feedbackType/severity/behaviorTags/aiDomainScores 추가 + FeedbackDigest에 behaviorSuggestions 추가 | 낮음   |
| 2   | FeedbackDomainExtractionService 생성 (AI 호출 + Assessment 자동 생성)                                                        | 중간   |
| 3   | SessionFeedbacksService.create() 후 도메인 추출 fire-and-forget 호출                                                         | 낮음   |
| 4   | ai-feature-config에 FEEDBACK_DOMAIN_EXTRACTION key 추가                                                                      | 낮음   |
| 5   | FeedbackDigest 배치에 문제행동 분석 + behaviorSuggestions 추가                                                               | 중간   |
| 6   | CurriculumPromptService에 문제행동 요약 섹션 추가                                                                            | 낮음   |
| 7   | 웹 SessionFeedbackModal: feedbackType 선택 + BEHAVIORAL_ISSUE UI                                                             | 중간   |
| 8   | 웹 사이드바: 일일 체크 메뉴명 변경 또는 제거                                                                                 | 낮음   |
| 9   | 모바일 session-feedback: feedbackType 선택 + 문제행동 UI                                                                     | 중간   |
| 10  | AGENTS.md + HANDOFF.md 업데이트                                                                                              | 낮음   |

**크리티컬 패스**: #1 → #2 → #3 → #5 → #6
**병렬**: #7 + #9 (Web/Mobile UI), #4 + #8

---

## 7. 스코프 제외

| 제외                        | 이유                                    |
| --------------------------- | --------------------------------------- |
| 기존 Assessment 페이지 삭제 | "정밀 체크"로 남겨두어 원하면 수동 가능 |
| 대시보드 코드 수정          | Assessment 모델 동일하므로 불필요       |
| 성장기록 코드 수정          | 동일                                    |
| DomainAggregation 수정      | 동일                                    |

---

## 8. 성공 기준

| 지표              | 목표                                          |
| ----------------- | --------------------------------------------- |
| 빌드              | API + Web + Mobile 0 에러                     |
| 기존 테스트       | 282개 유지                                    |
| AI 도메인 추출    | 피드백 저장 후 30초 이내 자동 Assessment 생성 |
| 문제행동 제안     | 주간 digest에 behaviorSuggestions 포함        |
| feedbackType 선택 | Web + Mobile 모두 3가지 타입 선택 가능        |

---

## 9. 비용 예측

### 구현 (Opus 오케스트레이션 + Sonnet 위임)

| 항목                          | 비용        |
| ----------------------------- | ----------- |
| Prisma + 백엔드 서비스 (#1-6) | ~$5         |
| Web + Mobile UI (#7-9)        | ~$4         |
| 오케스트레이션                | ~$4         |
| **합계**                      | **~$13-15** |

### AI 런타임 (운영)

| 기능               | 빈도                 | 모델  | 월간/가족     |
| ------------------ | -------------------- | ----- | ------------- |
| 피드백→도메인 추출 | 매 피드백 (일 2-5회) | Haiku | ~$0.15        |
| 문제행동 개선 제안 | 주 1회               | Haiku | ~$0.02        |
| **합계**           |                      |       | **~$0.17/월** |
