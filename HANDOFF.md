# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~5 전체 구현 + 검증 완료
- 수업 피드백 기능 추가 (SessionFeedback + AI 파이프라인)
- 복약 관리 기능 추가 (Medication + MedicationLog + MedicationReaction)
- 피드백 기반 성장 추적 + 일상/문제행동 기록 (FeedbackDomainExtraction + feedbackType)

## GOAL

운영 준비 단계. 사용자 테스트 피드백 반영 중.

## CURRENT STATE

- Phase 1~5 + 피드백 기반 성장 추적: 완전 완료
- Git: **204 커밋**, master 브랜치
- 테스트: 282개 통과 (3개 기존 사전 실패)
- 웹: http://3.38.146.1:4200
- Admin: http://3.38.146.1:4300
- 모바일: http://3.38.146.1:8081

## 이번 세션 완료 작업 (2026-06-11)

| 작업                                                      | 파일                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| feedbackType/behaviorTags/aiDomainScores Prisma 추가      | schema.prisma → `20260611031000_add_feedback_type_and_domain_extraction` |
| FeedbackDomainExtractionService                           | `feedback-domain-extraction.service.ts`                                  |
| SessionFeedback create() → AI 도메인 추출 fire-and-forget | `session-feedbacks.service.ts`                                           |
| FeedbackDigest behaviorSuggestions 추가                   | `feedback-digest.service.ts`, `feedback-digest.schema.ts`                |
| CurriculumPrompt 문제행동 요약 9번째 소스                 | `curriculum-prompt.service.ts`, `curriculum.service.ts`                  |
| 데이터 윈도우 최적화                                      | Assessment 30일, 임상보고서 최신 1건                                     |
| 웹 SessionFeedbackModal feedbackType UI                   | `SessionFeedbackModal.tsx`                                               |
| 사이드바 "정밀 발달 체크 (선택)" 변경                     | `AppLayout.tsx`                                                          |
| 모바일 session-feedback feedbackType UI                   | `apps/mobile/app/session-feedback.tsx`                                   |

## 웹 메뉴 구조

```
치료 관리
  ├── 대시보드
  ├── 커리큘럼
  ├── 일정
  ├── 수업 피드백  (SESSION | DAILY_LOG | BEHAVIORAL_ISSUE)
  ├── 정밀 발달 체크 (선택)  ← 이름 변경
  ├── 임상 평가
  ├── 성장 기록
  └── AI 분석

건강 관리
  └── 복약 관리

도구
  ├── 보고서
  └── 감각 프로파일
```

## PENDING TASKS

### 운영 준비 (서비스 오픈 전 필수)

1. consent.service.ts CONSENT_DOCUMENTS 실제 저작권 문구 교체
2. licensed-tool-data.service.ts 실제 도구 문항 교체
3. Apple Developer Program ($99/년) + Google Play Console ($25) 등록
4. FCM 설정 (.env FCM_PROJECT_ID 등)
5. 서버 배포 (DEPLOYMENT_GUIDE.md 참조)
6. 개인정보처리방침 실제 법적 문서 작성
7. 도메인 구매 → OAuth(Google/Kakao) 활성화

### 잠재적 개선사항

- ADOS-2, SCQ 라이선스 도구 추가
- 임상 보고서 PDF 내보내기
- 피드백 복약 알림 (FCM 설정 후)

## KEY FILES

- ASD/auticare/AGENTS.md — 전체 개발 지식베이스 (22절)
- ASD/auticare/apps/api/src/session-feedbacks/ — 수업 피드백 + 도메인 추출 모듈
- ASD/auticare/apps/api/src/medications/ — 복약 관리 모듈
- ASD/auticare/apps/web/src/pages/SessionFeedbackPage.tsx
- ASD/auticare/apps/mobile/app/session-feedback.tsx
- ASD/auticare/apps/mobile/app/medication.tsx

## IMPORTANT DECISIONS

- FamilyResolverService 필수 (user.familyId 직접 사용 금지)
- AI 응답: 시스템 프롬프트에 마크다운 금지 필수
- vite preview = 정적 서빙 + /v1 proxy (개발서버 아님)
- 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
- Admin 비밀번호: Admin123!@#
- feedbackType: SESSION(수업) | DAILY_LOG(일상) | BEHAVIORAL_ISSUE(문제행동)
- AI 도메인 추출: fire-and-forget (피드백 저장 즉시, 실패해도 피드백 저장 영향 없음)
- 시스템 질문지 "AI 발달 추출": familyId 기준 getOrCreate (Assessment.questionnaireId 필수 대응)
- Assessment 데이터 윈도우: 30일 이내 take:15
- 임상보고서 참조: 최신 1건만
- EC2 IP 바뀌면: ./scripts/update-ip.sh 실행

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- ESM: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- 스키마 변경: migrate → generate → build → restart-api
- 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
- 웹 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
