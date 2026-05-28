# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- "phase1 구현해볼까" → Phase 1 전체 구현 완료 (8주)
- "go" × 6 → Phase 2 전체 구현 완료 (6주)
- Phase 2 검증: 다수 버그 발견 및 수정 완료
- "이전에 하던 작업을 새 세션에서 이어하려고해" → Phase 3 (Mobile) 전체 구현 완료 (6주)
- Phase 3 테스트 추가 (push.service, notifications.controller)
- "AGENTS.md와 HANDOFF.md 업데이트해주고 Git에 올려줘"

## GOAL

Phase 4 (Expansion) 개발 시작.

## WORK COMPLETED

Phase 1 전체 구현 + 검증 (8주, 154 테스트)
Phase 2 전체 구현 + 검증 (6주, 218 테스트)
Phase 3 전체 구현 + 검증 (6주, 244 테스트):

[Phase 3 핵심 구현]

Week 15 — Expo 스캐폴드:

- Expo SDK 55 + expo-router 4 + Zustand + TanStack Query 5
- metro.config.js: pnpm 모노레포 심링크 해석 + singleton 고정
- lib/token-storage.ts: expo-secure-store (iOS Keychain / Android Keystore)
- lib/api.ts: createApiClient with clientType='mobile', 자동 토큰 갱신
- stores/auth.store.ts + stores/child.store.ts
- 인증 화면 (login, register) + 5탭 레이아웃

Week 16-18 — 주요 기능 화면:

- 홈 대시보드 (실API: /children/:id/dashboard)
- 커리큘럼 (useTodayCurriculum, useConfirmCurriculum, useLogActivity)
- 평가 (useQuestionnaires, useQuestionnaireDetail, useCreateAssessment)
- 성장 (useGrowth + useAggregatedAssessment → progress bar + 트렌드)
- 일정 (useSchedules, useCreateSchedule — recurring ID 처리 포함)
- 아이 전환 모달 (ChildSwitcher)
- types/api.types.ts: 모든 백엔드 응답 타입 정의

Week 19 — FCM 푸시 알림:

- Prisma: DeviceToken 모델 추가 (migration 완료)
- firebase-admin 의존성 추가
- PushService: graceful fallback, multicast, 만료토큰 자동삭제
- NotificationsService.create() → fire-and-forget 푸시 연결
- POST/DELETE /v1/notifications/device-token 엔드포인트
- 모바일: use-push-notifications.ts (권한요청 → 토큰등록 → 탭핸들러)

Week 20 — 완성:

- More 하위 화면 4개 (child-profile, family, settings, reports)
- 실API 훅: use-profile.ts, use-family.ts, use-reports.ts
- 오프라인: OfflineBanner + networkMode='offlineFirst'
- EAS Build: eas.json (dev/preview/production 3개 프로파일)
- Maestro E2E: .maestro/ 5개 flow
- SplashScreen: Platform.OS !== 'web' 분기

[Phase 3 테스트 추가]

- push.service.spec.ts: FCM 11개 시나리오
- notifications.controller.spec.ts: 10개 시나리오
- 218 → 244 테스트 (전체 통과)

[Phase 3 스크립트 추가]

- scripts/start-mobile.sh: expo export → Node 정적 서버 (8081)
- scripts/restart-mobile.sh: kill + 재빌드
- scripts/status.sh: mobile(:8081) 항목 추가
- scripts/stop-servers.sh: mobile 포함

## CURRENT STATE

- Phase 1 + 2 + 3: 완료 + 검증 완료
- 빌드: api ✅ web ✅ admin ✅ mobile(export) ✅
- 테스트: 244개 통과 (36개 파일)
- Git: 90개 커밋, master 브랜치 push 완료
- 모바일 웹 접속: http://3.35.36.62:8081 (start-mobile.sh 실행 후)

## PENDING TASKS

1. Phase 4: Expansion (SPEC/IMPLEMENTATION_PLAN.md 참조)
   - 부모 웰빙 추적
   - 비상 가이드
   - 감각 프로파일
   - 연구 데이터 수집
   - 가족 협업 기능

2. 모바일 수동 QA 미완료 항목 (Phase 3 테스트 목록 참조):
   - 커리큘럼 활동 로그 검증
   - 평가 제출 검증
   - 오프라인 모드 검증
   - 아이 전환 검증
   - 푸시 알림 (.env FCM 설정 필요)

## KEY FILES

- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 4 상세 태스크
- ASD/auticare/AGENTS.md - 개발 필수 참조 (Phase 3 이슈 포함)
- ASD/auticare/apps/mobile/ - React Native 앱 전체
- ASD/auticare/apps/mobile/metro.config.js - 모노레포 Metro 설정
- ASD/auticare/apps/mobile/app/\_layout.tsx - Root layout (AuthGate, SplashScreen)
- ASD/auticare/apps/mobile/stores/ - auth.store.ts, child.store.ts
- ASD/auticare/apps/mobile/hooks/ - 8개 실API 훅
- ASD/auticare/apps/mobile/types/api.types.ts - 백엔드 응답 타입 전체
- ASD/auticare/apps/api/src/notifications/push.service.ts - FCM 서비스
- ASD/auticare/scripts/start-mobile.sh - 모바일 웹 빌드+실행

## IMPORTANT DECISIONS

- 모바일 웹 서빙: expo start --web (dev server) 불가 → expo export --platform web + 정적 서버
  이유: Expo SDK 55가 Metro 미들웨어 체인 우회 (번들 경로 /apps/mobile/... 문제)
- FCM: .env 미설정 시 graceful skip (나머지 기능 정상 동작)
- 모바일 API URL: EXPO_PUBLIC_API_URL 환경변수 (기본값: http://3.35.36.62:3100/v1)
- 토큰 저장: expo-secure-store (web에서는 null 반환 → 로그인 화면으로)
- SplashScreen: Platform.OS !== 'web' 분기 필수 (웹에서 흰 화면 방지)
- AI 모델: Quality(Sonnet)=커리큘럼/인사이트/필터, Fast(Haiku)=스케줄제안/질문지생성
- Family AI Tier: STANDARD(20회/일) 기본값
- 알림 본인 제외: 사용자 행동 트리거는 자신 제외, 배치 작업은 전체
- temperature: 최신 Claude 모델(Sonnet 4.5+)에서 temperature 파라미터 제거 필요

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어
- 충돌 금지 포트: 3000, 4173, 5432
- ESM: 상대 임포트에 .js 확장자 필수 (모바일도 동일)
- as any, @ts-ignore 금지
- Mock 훅 패턴 절대 금지 → 반드시 실제 API 호출
- 새 훅/컴포넌트 작성 시 백엔드 service interface 먼저 확인 (타입 불일치 주의)
- AI 기능: 반드시 .catch(() => {}) — 알림/AI 실패가 주 기능 차단하면 안 됨
- orderIndex: items 배열 저장 시 항상 idx 값 포함
- 모바일 Platform.OS 분기: SecureStore, SplashScreen, Notifications는 웹에서 동작 다름

## CONTEXT FOR CONTINUATION

Phase 4 시작 시:

1. SPEC/IMPLEMENTATION_PLAN.md Phase 4 섹션 읽기
2. 백엔드 API 우선 구현 (모바일은 기존 API 그대로 사용)
3. 모바일 앱은 새 API 엔드포인트 추가 시 hooks/ 에 훅 추가
4. 스키마 변경 시 반드시 8.4 순서 준수
5. 모바일 웹 테스트: ./scripts/restart-mobile.sh (2~3분 빌드 소요)
