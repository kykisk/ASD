# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~4 구현 + 검증 완료
- Phase 4 UX 개선 작업 완료 (이번 세션)
- "컨텍스트가 다차서 새세션에서 계속해야겠다" → 문서 업데이트 후 새 세션

## GOAL

Phase 4 검증 잔여 항목 처리 + Phase 5 준비.

## WORK COMPLETED

### 이전 세션까지 (Phase 1~4 구현)

Phase 1~3: 완료 + 검증 완료 (244 테스트)
Phase 4: P4-001~025 구현 완료 + 검증 완료 (146 커밋)

### 이번 세션 (2026-06-05) — UX 개선

1. **모바일 AI 요약/히스토리 추가**
   - `apps/mobile/app/research.tsx`: 2탭 → 3탭 (추천/북마크/AI요약)
   - `apps/mobile/hooks/use-research.ts`: `useGenerateAiDigest`, `useDigestHistory` 추가
   - AI 맞춤 요약 생성 버튼 + DigestHistoryCard (펼치기/접기)

2. **감각 프로파일 활용 가이드 카드**
   - 웹/모바일 공통: "이 정보가 어떻게 활용되나요?" 카드 추가
   - 3항목: 커리큘럼 자동 맞춤화 / 연구 자료 개인화 / 즉시 AI 활동 추천

3. **감각 프로파일 내비게이션 재분류**
   - 부모 지원 → **도구** 그룹으로 이동 (치료 보조 측정 도구 성격)
   - 웹: `AppLayout.tsx` / 모바일: `more.tsx`

4. **대시보드 연구 티커 (ResearchTicker)**
   - 히어로 배너 아래 한 줄 뉴스 티커
   - 5초마다 fade 전환, koreanSummary(AI 요약) 표시
   - `✨ AI 요약` 배지 + 클릭 시 `/research`

5. **연구 요약 재처리 기능 (Admin)**
   - `POST /v1/admin/research/re-summarize`: fire-and-forget, 즉시 jobId 반환
   - BatchJob(`RESEARCH_RESUMMARY`) 생성 → 논문마다 processedItems 업데이트
   - Admin 버튼: `재처리 중 (15/22)` 실시간 카운터 (2초 폴링)
   - 완료 시 alert + 이력 테이블 갱신

## CURRENT STATE

- Phase 1 + 2 + 3 + 4: 구현 + 검증 완료
- 빌드: api ✅ web ✅ admin ✅ mobile(export) ✅
- 테스트: 244개 통과
- Git: 148 커밋, master 브랜치 push 완료
- 웹: http://3.35.36.62:4200
- 모바일 웹: http://3.35.36.62:8081 (restart-mobile.sh 실행 후)
- Admin: http://3.35.36.62:4300
- 연구 논문: 24개 수집 (요약 있음 2개 / 요약 재처리 필요 22개)

## PENDING TASKS

1. **연구 요약 재처리 실행**:
   - `./scripts/restart-api.sh` 후 Admin → 모니터링 → "요약 재처리" 버튼 클릭
   - 22개 논문 AI 요약 생성 (AI 예산 확인 필요)

2. **Phase 4 이연 항목**:
   - GDPR 데이터 내보내기 (모바일) — settings.tsx Phase 4 배지
   - 아이 추가 (모바일) — More 탭
   - 연구 자동 아카이브: 배치에 archiveOldArticles() 연결 필요

3. **Phase 5 대기 중** (SPEC/IMPLEMENTATION_PLAN.md 참조)

## KEY FILES

- ASD/SPEC/IMPLEMENTATION_PLAN.md — Phase 5 계획
- ASD/auticare/AGENTS.md — 개발 필수 참조 (13~14절 UX 개선 + 배포 계획)
- ASD/auticare/DEPLOYMENT_GUIDE.md — 배포 환경별 비용/방법 가이드 ← NEW
- ASD/auticare/PHASE4_TEST_CHECKLIST.md — Phase 4 수동 테스트 체크리스트
- ASD/auticare/apps/api/src/research/ — 연구 모듈 (reSummarizeArticles 포함)
- ASD/auticare/apps/api/src/admin/admin.controller.ts — re-summarize 엔드포인트
- ASD/auticare/apps/web/src/pages/DashboardPage.tsx — ResearchTicker 포함
- ASD/auticare/apps/mobile/app/research.tsx — 3탭 AI요약 포함
- ASD/auticare/apps/mobile/app/sensory-profile.tsx — 활용 가이드 카드 포함

## IMPORTANT DECISIONS

- Phase 4 컨트롤러: user.familyId 직접 사용 금지 → FamilyResolverService 필수
- AI 응답 파싱: JSON 요청하면 마크다운 포함으로 파싱 실패 → 평문 텍스트 요청
- Express ETag: main.ts에 app.set('etag', false) (304 캐시 방지)
- 연구 아카이브: isArchived=true (숨김, 복원 가능) / deleteMany (영구 삭제)
- 모바일 ResearchMatch: item.article.xxx 중첩 접근, tags/keyFindings는 ?? [] 필요
- 앱 자동 동기화: AppInitializer가 /users/me + /families/my 자동 호출
- 사이드바: 도구 그룹 = 질문지 + 보고서 + 감각 프로파일 (측정 도구 분류)
- AI digest: 평문 텍스트 응답, regex로 TOP 3 논문 파싱
- 연구 요약 재처리: fire-and-forget + BatchJob 폴링 (2초 간격)

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어 (영어로 질문해도 한국어로 답변)
- 충돌 금지 포트: 3000, 4173, 5432
- ESM: 상대 임포트에 .js 확장자 필수 (모바일도 동일)
- as any, @ts-ignore 금지
- Mock 훅 절대 금지 → 반드시 실제 API 호출
- 새 API 훅 전 컨트롤러 경로 확인 필수
- AI 기능: .catch(() => {}) 필수
- PII 필드 (name, birthDate): nameEnc/birthDateEnc로 저장, 직접 select 불가
- 모바일 Platform.OS 분기: Alert, SecureStore, SplashScreen, Notifications

## CONTEXT FOR CONTINUATION

새 세션 시작 시:

1. AGENTS.md 12~13절 읽기 (Phase 4 완료 + UX 개선 현황)
2. 연구 요약 재처리 실행 여부 확인 (Admin → 모니터링)
3. Phase 4 이연 항목 처리 or Phase 5 시작
4. 새 기능 개발 시: FamilyResolverService 반드시 사용
5. 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
