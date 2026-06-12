# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~5 전체 구현 + 검증 완료
- 수업 피드백 기능 추가 (SessionFeedback + AI 파이프라인)
- 복약 관리 기능 추가 (Medication + MedicationLog + MedicationReaction)
- 피드백 기반 성장 추적 + 일상/문제행동 기록 (FeedbackDomainExtraction + feedbackType)
- UX 개선 세션 (메뉴 재구성, 도메인 순서, 캘린더 피드백 아이콘, 날짜 구간 선택)

## GOAL

운영 준비 단계. 사용자 테스트 피드백 반영 중.

## CURRENT STATE

- Phase 1~5 + UX 개선 완료
- Git: **221 커밋**, master 브랜치
- 테스트: 282개 통과 (3개 기존 사전 실패)
- 웹: http://3.38.146.1:4200
- Admin: http://3.38.146.1:4300
- 모바일: http://3.38.146.1:8081

## 최근 완료 작업 (2026-06-11, UX 개선 세션)

| 작업                    | 내용                                                 |
| ----------------------- | ---------------------------------------------------- |
| 메뉴명 변경             | 수업 피드백 → **일일피드백** (Web + Mobile)          |
| 정밀 발달 체크 제거     | 사이드바에서 제거 (DB/API 유지, AI 자동 추출로 대체) |
| 질문지 관리             | 사용자 메뉴 제거 → Admin 전용                        |
| 임상 평가 위치          | 별도 카테고리 → 치료 관리 그룹 이동                  |
| 일일피드백 3탭 재구성   | 수업피드백 / 일상기록 / AI주간요약                   |
| 날짜 구간 선택 (Web)    | 수업/일상 탭에 from~to 날짜 필터 (기본 30일)         |
| 날짜 구간 선택 (Mobile) | 7일/30일/3개월 프리셋 버튼 추가                      |
| 일정 캘린더 아이콘      | 피드백 있는 날 초록 연필 아이콘, 없는 날 회색        |
| 일정 날짜 클릭 팝업     | 해당 날짜 피드백 팝업 (DateFeedbackPopup)            |
| 커리큘럼 AI 생성 모달   | 목표/활동 입력 모달 추가                             |
| FeedbackDigest 프롬프트 | DAILY_LOG + BEHAVIORAL_ISSUE 섹션 포함               |
| 도메인 순서 통일        | 일상생활→의사소통→인지→사회성→운동→기타 (Web+Mobile) |
| OAuth 버튼 비활성화     | 클릭 시 "서비스 오픈 후 이용 가능" 안내              |
| IP 업데이트             | 3.35.36.62 → 3.38.146.1                              |
| update-ip.sh            | EC2 재시작 후 IP 자동 업데이트 스크립트              |

## 웹 메뉴 구조 (최신)

```
치료 관리
  ├── 대시보드
  ├── 커리큘럼
  ├── 일정
  ├── 일일피드백       ← (수업/일상/AI요약 3탭)
  ├── 임상 평가        ← (별도 카테고리에서 이동)
  ├── 성장 기록
  └── AI 분석

건강 관리
  └── 복약 관리

도구
  ├── 보고서
  └── 감각 프로파일
```

## 모바일 More 탭 구조 (최신)

```
치료 도구: 아이 프로필, 임상 평가 🏥, 일일피드백 📝, 감각 프로파일, 보고서
건강 관리: 복약 관리 💊
부모 지원: 웰빙 체크인, 비상 가이드, 연구 브리핑
가족: 아이 추가, 가족 설정, 설정
```

## PENDING TASKS (운영 준비)

1. consent.service.ts CONSENT_DOCUMENTS 실제 저작권 문구 교체
2. licensed-tool-data.service.ts 실제 도구 문항 교체
3. Apple Developer Program ($99/년) + Google Play Console ($25) 등록
4. FCM 설정 (.env FCM_PROJECT_ID 등)
5. 서버 배포 (DEPLOYMENT_GUIDE.md 참조)
6. 개인정보처리방침 실제 법적 문서 작성
7. 도메인 구매 → OAuth(Google/Kakao) 활성화

## PENDING 개선사항

- ADOS-2, SCQ 라이선스 도구 추가
- 임상 보고서 PDF 내보내기
- 복약 알림 (FCM 설정 후)

## KEY FILES

- ASD/auticare/AGENTS.md — 전체 개발 지식베이스 (23절)
- ASD/auticare/HANDOFF.md — 현재 상태 + 최근 변경사항 + 남은 작업
- ASD/auticare/SERVER_MIGRATION_GUIDE.md — 서버 이전 가이드 (새 환경 세팅 절차)
- ASD/auticare/scripts/update-ip.sh — EC2 IP 바뀌면 실행
- ASD/auticare/apps/api/src/session-feedbacks/ — 수업 피드백 + 도메인 추출 모듈
- ASD/auticare/apps/api/src/medications/ — 복약 관리 모듈
- ASD/auticare/apps/web/src/pages/SessionFeedbackPage.tsx — 일일피드백 3탭
- ASD/auticare/apps/mobile/app/session-feedback.tsx — 모바일 일일피드백
- ASD/auticare/apps/mobile/app/medication.tsx — 모바일 복약 관리
- ASD/auticare/apps/web/src/pages/SchedulePage.tsx — 일정 + 피드백 팝업

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
- 도메인 표시 순서: DAILY_LIVING → COMMUNICATION → COGNITIVE → SOCIAL → MOTOR → OTHER
- 정밀 발달 체크: UI 제거됨, DB/API는 유지 (AI 자동 추출로 대체)
- 질문지 관리: Admin 전용, 사용자 메뉴에서 제거됨

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- ESM: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- 스키마 변경: migrate → generate → build → restart-api
- 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
- 웹 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
