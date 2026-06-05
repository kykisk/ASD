# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~4 구현 + 검증 + UX 개선 완료
- P4 이연 항목 전부 완료 (아이추가/GDPR/아카이브)
- Phase 5 시작 결정 (Licensing)
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

- Phase 1~4 + P4 이연: 완전 완료
- **Phase 5: P5-001 진행 예정** (License 스키마 신규 작성)
- Git: 155 커밋, master 브랜치
- 테스트: 244개 통과
- 웹: http://3.35.36.62:4200
- 모바일 웹: http://3.35.36.62:8081
- Admin: http://3.35.36.62:4300
- 연구 논문: 24개 수집 (요약 20건 완료)

## PENDING TASKS

### Phase 5 (진행 중)

1. **P5-001**: License 스키마 (Prisma 신규) ← 다음
2. P5-002: 라이선스 CRUD 모듈
3. P5-003: 라이선스 검증 미들웨어
4. P5-004: 법적 동의 강화
5. P5-005: M-CHAT-R/F + CARS-2 + ABC 문항 데이터 (데모)
6. P5-006: 채점 알고리즘
7. P5-007: 점수 해석 서비스
8. P5-008: Admin 라이선스 관리 페이지
9. P5-009~012: 웹+모바일 UI 흐름
10. P5-013~018: 품질/문서/AI연동

### Phase 5 결정사항

- 도구 데이터: 데모 데이터 (운영 전 실제 데이터 교체)
- 구현 도구: M-CHAT-R/F + CARS-2 + ABC (3개 우선)

## KEY FILES

- ASD/SPEC/IMPLEMENTATION_PLAN.md — Phase 5 상세 (12절)
- ASD/auticare/AGENTS.md — 개발 필수 참조 (16절 Phase 5)
- ASD/auticare/DEPLOYMENT_GUIDE.md — 배포 가이드
- ASD/auticare/MOBILE_TEST_GUIDE.md — 모바일 터널링 테스트
- ASD/auticare/libs/prisma-client/prisma/schema.prisma — License 모델 추가 필요
- ASD/auticare/apps/api/src/research/ — 연구 모듈
- ASD/auticare/apps/mobile/app/add-child.tsx — 아이 추가 화면
- ASD/auticare/apps/mobile/app/settings.tsx — GDPR 내보내기

## IMPORTANT DECISIONS

- Phase 4 컨트롤러: user.familyId 직접 사용 금지 → FamilyResolverService 필수
- AI 응답 파싱: 시스템 프롬프트에 마크다운 금지 명시 필수 (JSON 파싱 오류 방지)
- 연구 요약: maxTokens 1000 (500은 JSON 잘림)
- 커리큘럼 활동: 3~5개 이내 명시 (스키마 max 5)
- Express ETag: main.ts에 app.set('etag', false) (304 캐시 방지)
- 사이드바: 도구 그룹 = 질문지 + 보고서 + 감각 프로파일
- AI digest: 평문 텍스트 응답, regex로 TOP 3 논문 파싱
- 연구 요약 재처리: fire-and-forget + BatchJob 폴링 (2초 간격)
- Admin 비밀번호: Admin123!@#
- Phase 5 도구: M-CHAT-R/F + CARS-2 + ABC (데모 데이터)

## EXPLICIT CONSTRAINTS

- 모든 답변 한국어 (영어로 질문해도 한국어로 답변)
- 충돌 금지 포트: 3000, 4173, 5432
- ESM: 상대 임포트에 .js 확장자 필수 (모바일도 동일)
- as any, @ts-ignore 금지
- Mock 훅 절대 금지 → 반드시 실제 API 호출
- 새 API 훅 전 컨트롤러 경로 확인 필수
- AI 기능: .catch(() => {}) 필수
- PII 필드 (name, birthDate): nameEnc/birthDateEnc로 저장, 직접 select 불가
- 스키마 변경 순서: migrate → generate → build → restart-api
- 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)

## CONTEXT FOR CONTINUATION

새 세션 시작 시:

1. AGENTS.md 16절 읽기 (Phase 5 태스크 목록)
2. P5-001부터 순차적으로
3. 새 기능 개발 시: FamilyResolverService 반드시 사용
4. 라이선스 모듈: apps/api/src/licenses/ 신규 생성 예정
5. 데모 데이터 방식: 실제 저작권 도구 문항 대신 유사 구조 샘플 문항
