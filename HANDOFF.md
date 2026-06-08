# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~5 전체 구현 + 검증 완료
- Phase 5 Licensing (P5-001~018) 모두 완료
- 데모 데이터 기반 (운영 전 실제 라이선스 데이터 교체 필요)

## GOAL

모든 Phase 완료. 운영 준비 단계로 전환 가능.

## CURRENT STATE

- Phase 1~5: 전체 구현 + 검증 완료
- Git: **167 커밋**, master 브랜치
- 테스트: 264개 통과 (3개 기존 사전 실패 - curriculum.service.spec.ts)
- 웹: http://3.35.36.62:4200
- 모바일 웹: http://3.35.36.62:8081
- Admin: http://3.35.36.62:4300

## PHASE 5 완료 현황 (2026-06-08)

| P5 태스크  | 내용                    | 파일                                                                    |
| ---------- | ----------------------- | ----------------------------------------------------------------------- |
| P5-001     | License 스키마          | `schema.prisma`, migration                                              |
| P5-002     | 라이선스 CRUD           | `licenses.service.ts`, `licenses.controller.ts`                         |
| P5-003     | 라이선스 Guard          | `license.guard.ts`, `requires-license.decorator.ts`                     |
| P5-004     | 법적 동의 강화          | `consent.service.ts` (도구별 동의서 + 스냅샷)                           |
| P5-005     | 문항 데이터             | `licensed-tool-data.service.ts` (데모)                                  |
| P5-006     | 채점 알고리즘           | `assessment-scoring.service.ts`                                         |
| P5-007     | 점수 해석               | `assessment-scoring.service.ts` (clinicalDescription + recommendations) |
| P5-008     | Admin UI                | `LicenseManagementPage.tsx`                                             |
| P5-009~011 | 웹 UI 흐름              | `LicensedAssessmentPage.tsx`, `use-licensed-assessments.ts`             |
| P5-012     | 모바일 UI 흐름          | `licensed-assessment.tsx`, `hooks/use-licensed-assessments.ts`          |
| P5-013     | 컴플라이언스            | `COMPLIANCE_CHECKLIST.md`                                               |
| P5-014     | 단위 테스트             | `licenses.service.spec.ts`, `assessment-scoring.service.spec.ts`        |
| P5-015     | 보안 감사               | pnpm audit — Critical 1건(vitest UI, dev전용)                           |
| P5-016     | API 문서화              | `API_DOCUMENTATION.md`                                                  |
| P5-017     | 커리큘럼 AI 반영        | `curriculum-prompt.service.ts`, `curriculum.service.ts`                 |
| P5-018     | 발달 수준 자동 업데이트 | `assessment-scoring.service.ts` → `child.developmentalLevel`            |

## 운영 전 필수 교체 항목

1. `consent.service.ts` → `CONSENT_DOCUMENTS` 실제 저작권 문구로 교체
2. `licensed-tool-data.service.ts` → `TOOL_SCHEMAS` 실제 도구 문항으로 교체
3. Apple Developer Program ($99/년) + Google Play Console ($25) 등록
4. FCM 프로젝트 키 설정 (`.env` FCM_PROJECT_ID 등)
5. 데이터 국내 저장 요건 확인 (의료/민감정보)
6. vitest ≥4.1.0 업그레이드 (보안 감사 결과)
7. 배포: `DEPLOYMENT_GUIDE.md` 참조

## KEY FILES

- `ASD/auticare/AGENTS.md` — 전체 개발 지식베이스 (16절 Phase 5)
- `ASD/auticare/COMPLIANCE_CHECKLIST.md` — 법적 컴플라이언스 체크리스트
- `ASD/auticare/API_DOCUMENTATION.md` — Phase 5 API 엔드포인트 문서
- `ASD/auticare/DEPLOYMENT_GUIDE.md` — 배포 환경별 가이드
- `ASD/auticare/MOBILE_TEST_GUIDE.md` — 모바일 터널링 테스트
- `ASD/auticare/apps/api/src/licenses/` — 라이선스 모듈 전체
- `ASD/auticare/apps/web/src/pages/LicensedAssessmentPage.tsx` — 웹 평가 흐름
- `ASD/auticare/apps/mobile/app/licensed-assessment.tsx` — 모바일 평가 흐름

## IMPORTANT DECISIONS

- FamilyResolverService 필수 (user.familyId 직접 사용 금지)
- AI 응답: 시스템 프롬프트에 마크다운 금지 명시 필수
- 연구 요약: maxTokens 1000 (500은 JSON 잘림)
- 커리큘럼 활동: 3~5개 이내 명시 (스키마 max 5)
- Admin 비밀번호: Admin123!@#
- 라이선스 키: SHA-256 해시만 저장 (원본 미저장)
- 채점 스케일: DB는 1-5, M-CHAT(2=pass/4=fail), CARS-2(1-4), ABC(1-4 = 0-3 shift)

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- ESM: 상대 임포트에 .js 확장자 필수 (모바일도 동일)
- as any, @ts-ignore 금지
- 스키마 변경 순서: migrate → generate → build → restart-api
- 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
