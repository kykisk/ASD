# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- "phase1 구현해볼까" → Phase 1 전체 구현 완료 (8주)
- "go" × 6 → Phase 2 전체 구현 완료 (6주)
- Phase 2 검증: 다수 버그 발견 및 수정 완료
- "이전에 하던 작업을 새 세션에서 이어하려고해" → Phase 3 (Mobile) 전체 구현 완료 (6주)
- Phase 3 검증: 테스트 + 버그 수정 + 누락 기능 추가 완료
- "이제 Phase4를 진행해보자" → Phase 4 시작 예정

## GOAL

Phase 4 (Expansion) 구현 시작.
P4-001 ~ P4-025 순서대로 진행.

## WORK COMPLETED

Phase 1 전체 구현 + 검증 (8주, 154 테스트)
Phase 2 전체 구현 + 검증 (6주, 218 테스트)
Phase 3 전체 구현 (6주, 244 테스트)
Phase 3 검증 및 버그 수정 완료 (121 커밋)

[Phase 3 검증 중 수정된 주요 버그]

1. 일정 API 날짜 형식 오류
   - 원인: QueryScheduleDto가 ISO 8601 datetime 필요, YYYY-MM-DD 전달
   - 수정: use-schedules.ts에서 T00:00:00.000Z / T23:59:59.999Z 변환

2. 로그아웃 후 이전 사용자 데이터 노출
   - 원인: Zustand store + React Query 캐시 미초기화
   - 수정: auth.store logout에서 childStore.reset() + queryClient.clear()
   - 웹: use-auth.ts logout에서 clearSelectedChild() + queryClient.clear()

3. 질문지 API 엔드포인트 불일치
   - 원인: /questionnaires → 실제: /families/:id/questionnaires
   - 수정: useQuestionnaires(familyId) 파라미터 추가, child.store에 familyId 저장

4. familyId JWT null 이슈
   - 원인: 가족 생성 후 재로그인 전까지 JWT familyId=null
   - 수정: child.store.familyId (fetchChildren 시 저장) fallback 사용

5. 커리큘럼 엔드포인트 오류
   - /curricula/today → /curriculum/today (단수)
   - /children/:id/curricula/:id/confirm → /curricula/:id/confirm

6. Alert.alert 웹 무반응
   - 수정: 모든 Alert.alert를 Platform.OS 분기로 교체 (로그아웃, 삭제, 보고서 등)

7. 저장 후 화면 미갱신
   - 원인: React Query invalidation이 Zustand store 미갱신
   - 수정: mutation onSuccess에서 fetchChildren(familyId) 직접 호출

[Phase 3 검증 중 추가된 기능]

- 커리큘럼 완료 액션 (PATCH /curricula/:id/complete + 완료 버튼 UI)
- 커리큘럼 히스토리 탭 (오늘/히스토리 탭, setQueriesData 즉시 갱신)
- AI 커리큘럼 생성 버튼 (POST /children/:id/curriculum/generate)
- 일정 탭 추가 (P3-010 누락 - schedule.tsx + 탭 레이아웃)
- 아이 프로필 편집 (useUpdateChild - 이름/성별/진단명/발달수준)
- 아이 삭제 (useDeleteChild)
- 가족 편집 (useUpdateFamily/InviteMember/UpdateMemberRole/RemoveMember)
- 보고서 DB 저장 (P2-039 누락 - Report 모델 + listReports + getReport)

[Phase 3 이연 항목 처리]

- 보고서 DB 저장 → ✅ 완료 (Report Prisma 모델 + upsert)
- GDPR 내보내기 모바일 → 🔄 Phase 4 (settings.tsx 배지)
- 아이 추가 모바일 → 🔄 Phase 4

## CURRENT STATE

- Phase 1 + 2 + 3: 완료 + 검증 완료
- 빌드: api ✅ web ✅ admin ✅ mobile(export) ✅
- 테스트: 244개 통과 (36개 파일)
- Git: 121 커밋, master 브랜치 push 완료
- 모바일 웹 접속: http://3.35.36.62:8081 (start-mobile.sh 실행 후)
- PHASE3_TEST_CHECKLIST.md: 백엔드 5개 완료, 모바일 주요 기능 검증 완료

## PENDING TASKS

1. Phase 4 구현 (SPEC/IMPLEMENTATION_PLAN.md 11절):
   - P4-001~004: 부모 웰빙 (무드 체크인, 번아웃 감지, AI 격려)
   - P4-005~008: 비상 가이드 (단계별 가이드, 진정 타이머, 패턴 분석)
   - P4-009~011: 감각 프로파일 (6채널, 레이더 차트)
   - P4-012~018: 연구 자동 수집 (PubMed, AI 요약, 개인화)
   - P4-019~021: 가족 협업 (역할 분담, 활동 로그 댓글)
   - P4-022~025: AI 프롬프트 고도화 (감각+마일스톤+구조화 발달수준)

2. Phase 4로 이연된 항목:
   - GDPR 데이터 내보내기 (모바일 파일 처리)
   - 아이 추가 (모바일)

3. 모바일 미완료 QA:
   - 오프라인 모드 (비행기 모드 테스트)
   - 푸시 알림 (.env FCM_PROJECT_ID 등 설정 필요)
   - EAS Build 실제 iOS/Android 빌드

## KEY FILES

- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 4 상세 태스크 (11절)
- ASD/auticare/AGENTS.md - 개발 필수 참조 (버그 패턴 10.7, Phase 4 계획 11절)
- ASD/auticare/PHASE3_TEST_CHECKLIST.md - Phase 3 수동 테스트 체크리스트
- ASD/auticare/apps/mobile/ - React Native 앱 전체
- ASD/auticare/apps/mobile/hooks/ - 실API 훅 (use-schedules, use-curricula 등)
- ASD/auticare/apps/mobile/app/(tabs)/schedule.tsx - 일정 화면
- ASD/auticare/apps/mobile/app/(tabs)/curriculum.tsx - 커리큘럼 (완료/히스토리)
- ASD/auticare/apps/api/src/reports/report.service.ts - 보고서 서비스 (DB 저장 포함)
- ASD/auticare/libs/prisma-client/prisma/schema.prisma - DB 스키마
- ASD/auticare/scripts/restart-mobile.sh - 모바일 재빌드+서버 재시작 (all-in-one)

## IMPORTANT DECISIONS

- 모바일 웹 서빙: expo start --web 불가 → expo export + 정적 서버 (scripts/serve-mobile.js)
- FCM: .env 미설정 시 graceful skip
- familyId: JWT 대신 child.store.familyId 사용 (JWT는 재로그인 전 null)
- 일정 날짜: 반드시 ISO 8601 datetime 형식 (T00:00:00.000Z)
- Alert/Confirm: Platform.OS === 'web' ? window.alert/confirm : Alert.alert
- 보고서: 생성 시 DB upsert, 조회는 GET /children/:id/reports
- 커리큘럼 완료: PATCH /curricula/:id/complete (GENERATED→CONFIRMED→COMPLETED)
- 즉시 UI 갱신: invalidateQueries 대신 setQueriesData 사용 (탭 전환 시 캐시 즉시 반영)

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- 충돌 금지 포트: 3000, 4173, 5432
- ESM: 상대 임포트에 .js 확장자 필수 (모바일도 동일)
- as any, @ts-ignore 금지
- Mock 훅 절대 금지 → 반드시 실제 API 호출
- 새 API 훅 작성 전 컨트롤러 경로 반드시 확인 (URL 불일치 버그 다수 발생)
- AI 기능: .catch(() => {}) 필수 — AI 실패가 주 기능 차단하면 안 됨
- 모바일 Platform.OS 분기: Alert, SecureStore, SplashScreen, Notifications

## CONTEXT FOR CONTINUATION

Phase 4 시작 시:

1. SPEC/IMPLEMENTATION_PLAN.md 11절 (Phase 4) 읽기
2. Prisma 스키마 변경 순서: migrate dev → generate → build api → restart-api
3. 백엔드 API 우선 → 웹 → 모바일 순서로 구현
4. 새 모바일 훅 작성 전 컨트롤러 경로 확인 (AGENTS.md 10.7 참고)
5. 모바일 웹 테스트: ./scripts/restart-mobile.sh (2~3분 빌드)
6. Phase 4 배지 패턴: settings.tsx의 phase4Row/phase4Badge 스타일 재사용
