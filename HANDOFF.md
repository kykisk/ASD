# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~5 전체 구현 + 검증 완료
- 수업 피드백 기능 추가 (SessionFeedback + AI 파이프라인)
- 복약 관리 기능 추가 (Medication + MedicationLog + MedicationReaction)

## GOAL

운영 준비 단계. 사용자 테스트 피드백 반영 중.

## CURRENT STATE

- Phase 1~5 + 수업 피드백 기능: 완전 완료
- Git: **203 커밋**, master 브랜치
- 테스트: 282개 통과 (3개 기존 사전 실패 — dashboard expandRecurrences mock 미설정)
- 웹: http://3.35.36.62:4200 (vite preview)
- Admin: http://3.35.36.62:4300 (vite preview)
- 모바일: http://3.35.36.62:8081

## 이번 세션 완료 작업 (2026-06-10)

| 작업                                       | 파일                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| SessionFeedback Prisma 모델 + 마이그레이션 | schema.prisma → `20260610045057_add_session_feedback`       |
| SessionFeedback CRUD API                   | `apps/api/src/session-feedbacks/` 모듈 전체                 |
| FeedbackDigest AI 요약 서비스              | `feedback-digest.service.ts`                                |
| FeedbackDigest 주간 배치                   | `feedback-digest-batch.service.ts` (node-cron 0 21 \* \* 0) |
| CurriculumPrompt 8번째 소스 연동           | `curriculum-prompt.service.ts`, `curriculum.service.ts`     |
| Dashboard FEEDBACK_REMINDER alert          | `dashboard.service.ts`                                      |
| 웹 UI: /session-feedback 페이지            | `SessionFeedbackPage.tsx`, `SessionFeedbackModal.tsx`       |
| 웹 UI: 사이드바 + 일정 CTA                 | `AppLayout.tsx`, `SchedulePage.tsx`                         |
| 모바일 UI: session-feedback 화면           | `apps/mobile/app/session-feedback.tsx`                      |
| 모바일 UI: more.tsx + 일정탭 연동          | `more.tsx`, `schedule.tsx`, `_layout.tsx`                   |
| API 단위 테스트 18개 추가                  | `session-feedbacks.service.spec.ts`                         |
| 모바일 임상 평가 UI                        | `apps/mobile/app/clinical.tsx` (이전 세션)                  |

## 웹 메뉴 구조

```
치료 관리 (일상 루틴)
  ├── 대시보드
  ├── 커리큘럼
  ├── 일정
  ├── 수업 피드백  ← 신규
  ├── 일일 발달 체크
  ├── 성장 기록
  └── AI 분석

임상 평가
  ├── 임상 평가 (/clinical)
  └── 질문지 관리 (/questionnaires)

도구
  ├── 보고서
  └── 감각 프로파일
```

## 모바일 More 탭 구조

```
치료 도구: 아이 프로필, 임상 평가 🏥, 수업 피드백 📝, 감각 프로파일, 보고서
부모 지원: 웰빙 체크인, 비상 가이드, 연구 브리핑
가족: 아이 추가, 가족 설정, 설정
```

## PENDING TASKS

### 운영 준비 (서비스 오픈 전 필수)

1. consent.service.ts CONSENT_DOCUMENTS 실제 저작권 문구 교체
2. licensed-tool-data.service.ts 실제 도구 문항 교체
3. Apple Developer Program ($99/년) + Google Play Console ($25) 등록
4. FCM 설정 (.env FCM_PROJECT_ID 등)
5. 서버 배포 (DEPLOYMENT_GUIDE.md 참조)
6. 개인정보처리방침 실제 법적 문서 작성

### 잠재적 개선사항

- ~~모바일 임상 평가 UI~~ ✅ 완료
- ADOS-2, SCQ 라이선스 도구 추가
- 임상 보고서 PDF 내보내기
- 수업 피드백 InsightsService 연동 고도화 (현재 커리큘럼만 연동)

## KEY FILES

- ASD/auticare/AGENTS.md — 전체 개발 지식베이스 (20절 이번 세션)
- ASD/auticare/COMPLIANCE_CHECKLIST.md — 법적 컴플라이언스
- ASD/auticare/DEPLOYMENT_GUIDE.md — 배포 가이드
- ASD/auticare/TEST_ENV_GUIDE.md — 외부 테스트 환경 (터널)
- ASD/auticare/apps/api/src/session-feedbacks/ — 수업 피드백 모듈
- ASD/auticare/apps/web/src/pages/SessionFeedbackPage.tsx — 웹 피드백 페이지
- ASD/auticare/apps/mobile/app/session-feedback.tsx — 모바일 피드백 화면
- ASD/auticare/apps/web/src/pages/ClinicalPage.tsx — 임상 평가 통합 페이지
- ASD/auticare/apps/mobile/app/clinical.tsx — 모바일 임상 평가 페이지
- ASD/auticare/apps/api/src/clinical-reports/ — 임상 보고서 모듈

## IMPORTANT DECISIONS

- FamilyResolverService 필수 (user.familyId 직접 사용 금지)
- AI 응답: 시스템 프롬프트에 마크다운 금지 필수
- vite preview = 정적 서빙 + /v1 proxy (개발서버 아님)
- 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
- Admin 비밀번호: Admin123!@#
- 임상 평가 = 전문가 데이터 / 일일 발달 체크 = 부모 관찰 (완전 분리)
- 수업 피드백 = 치료사 구두 피드백을 부모가 기록 (치료사 직접 입력 아님)
- FeedbackDigest: 주당 최소 3건 이상이어야 AI 요약 생성 (데이터 품질)
- FeedbackDigest AI feature key: 'FEEDBACK_DIGEST' (Haiku 추천)
- 대시보드 일정 시간: UTC+9(KST) 변환
- 재평가 주기: M-CHAT 3개월, CARS-2 6개월, ABC 12개월, 외부보고서 12개월

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- ESM: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- 스키마 변경: migrate → generate → build → restart-api
- 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
- 웹 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
