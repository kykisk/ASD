# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~5 전체 구현 + 검증 완료
- 이번 세션: UX 구조 개선 + 임상 평가 체계 구축 + 인프라 안정화

## GOAL

운영 준비 단계. 사용자 테스트 피드백 반영 중.

## CURRENT STATE

- Phase 1~5 + 이번 세션 개선: 완전 완료
- Git: **203 커밋**, master 브랜치
- 테스트: 267개 통과 (3개 기존 사전 실패)
- 웹: http://3.35.36.62:4200 (vite preview)
- Admin: http://3.35.36.62:4300 (vite preview)
- 모바일: http://3.35.36.62:8081

## 이번 세션 완료 작업 (2026-06-09)

| 작업                               | 파일                                            |
| ---------------------------------- | ----------------------------------------------- |
| 이미지 → 질문지 AI Vision          | image-import.service.ts, ImageImportModal.tsx   |
| ClinicalReport 모델 + API          | clinical-reports/ 모듈 전체                     |
| 임상 보고서 UI (웹)                | ClinicalReportModal.tsx, ClinicalPage.tsx       |
| 메뉴 구조 분리                     | AppLayout.tsx, App.tsx, ClinicalPage.tsx (신규) |
| GrowthPage 임상 탭 제거            | GrowthPage.tsx (3탭으로 축소)                   |
| QuestionnairePage 라이선스 탭 제거 | QuestionnairePage.tsx                           |
| AssessmentForm 단순화              | 질문지 선택 제거, 5도메인 일일 체크만           |
| 재평가 알림                        | dashboard.service.ts RE_EVALUATION_DUE          |
| 임상 타임라인                      | ClinicalPage.tsx 타임라인 탭                    |
| 대시보드 한글 도메인               | DashboardPage.tsx DOMAIN_LABELS                 |
| 대시보드 일정 시간(KST)            | dashboard.service.ts time 필드                  |
| vite preview 전환                  | start-web.sh, start-admin.sh                    |
| Watchdog 자동 재시작               | scripts/watchdog.sh (cron 5분)                  |
| JWT 갱신 (웹+Admin)                | AppInitializer.tsx, admin/App.tsx               |

## 신규 메뉴 구조

```
치료 관리 (일상 루틴)
  ├── 대시보드
  ├── 커리큘럼
  ├── 일정
  ├── 일일 발달 체크  (구: 평가 입력, 5도메인만)
  ├── 성장 기록       (추이/도메인/마일스톤만)
  └── AI 분석

임상 평가  ← 신규 분리
  ├── 임상 평가 (/clinical)
  │     [평가 실행] [외부 평가 보고서] [타임라인]
  └── 질문지 관리 (/questionnaires)

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

### 잠재적 개선사항

- 모바일 임상 평가 UI (현재 웹만 구현)
- ADOS-2, SCQ 라이선스 도구 추가
- 임상 보고서 PDF 내보내기

## KEY FILES

- ASD/auticare/AGENTS.md — 전체 개발 지식베이스 (18절 이번 세션)
- ASD/auticare/COMPLIANCE_CHECKLIST.md — 법적 컴플라이언스
- ASD/auticare/DEPLOYMENT_GUIDE.md — 배포 가이드
- ASD/auticare/TEST_ENV_GUIDE.md — 외부 테스트 환경 (터널)
- ASD/auticare/apps/web/src/pages/ClinicalPage.tsx — 임상 평가 통합 페이지
- ASD/auticare/apps/api/src/clinical-reports/ — 임상 보고서 모듈
- ASD/auticare/apps/api/src/questionnaires/image-import.service.ts — AI Vision

## IMPORTANT DECISIONS

- FamilyResolverService 필수 (user.familyId 직접 사용 금지)
- AI 응답: 시스템 프롬프트에 마크다운 금지 필수
- vite preview = 정적 서빙 + /v1 proxy (개발서버 아님)
- 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
- Admin 비밀번호: Admin123!@#
- 임상 평가 = 전문가 데이터 / 일일 발달 체크 = 부모 관찰 (완전 분리)
- 대시보드 일정 시간: UTC+9(KST) 변환
- 재평가 주기: M-CHAT 3개월, CARS-2 6개월, ABC 12개월, 외부보고서 12개월

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- ESM: 상대 임포트에 .js 확장자 필수
- as any, @ts-ignore 금지
- 스키마 변경: migrate → generate → build → restart-api
- 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
- 웹 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
