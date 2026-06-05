# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~3 구현 + 검증 완료
- Phase 4 구현 완료 (P4-001~025)
- Phase 4 검증 중: 다수 버그 수정 완료
- "컨텍스트가 다차서 새세션에서 계속해야겠다" → 문서 업데이트 후 새 세션

## GOAL

Phase 4 검증 계속 + 미완료 항목 처리.
다음 세션에서 PHASE4_TEST_CHECKLIST.md 기반으로 테스트 진행.

## WORK COMPLETED

Phase 1~3: 완료 + 검증 완료 (244 테스트)
Phase 4: P4-001~025 구현 완료 + 검증 진행 중 (146 커밋)

[Phase 4 구현 내용]

백엔드 모듈 5개:

- wellbeing/: 무드 체크인, 번아웃 감지, AI 격려 메시지
- emergency/: 5종 가이드, 이벤트 로그, AI 패턴 분석
- sensory/: 6채널 프로파일 CRUD, AI 활동 추천
- research/: PubMed 수집, AI 요약, 가족 매칭, 주간 배치
- collaboration/: 역할 분담, 활동 로그 댓글

Research 추가 기능 (세션 중 요청으로 구현):

- AI 맞춤 요약 (POST /research/ai-digest): 북마크 논문 + 아이 상태 분석
- ResearchDigest 모델: AI 요약 히스토리 저장/조회
- 아카이브 관리: isArchived 필드, 복원/삭제, 90일 자동 만료 준비
- 날짜 필터: 최근 2년 이내 논문만 수집 (PubMed datetype=pdat)
- 날짜 배지: 논문 카드에 발행일 + 오래된 논문 노란 배지

웹 UI:

- 5개 신규 페이지 (WellbeingPage, EmergencyGuidePage, SensoryProfilePage, ResearchPage, FamilyCollaborationPage)
- 사이드바 아코디언 그룹 (치료관리/도구/부모지원/가족)
- ResearchPage 4탭 (추천/북마크/아카이브/AI 요약 히스토리)
- AI 요약 히스토리 펼치기/접기 토글 (DigestHistoryCard)
- AppInitializer: 앱 진입 시 자동 family/child 동기화 (서버 재시작 후 자동 복구)

모바일:

- 4개 신규 화면 (wellbeing, emergency-guide, sensory-profile, research)
- more.tsx: 4개 메뉴 추가

AI 프롬프트 고도화:

- P4-022: 감각 프로파일 → 커리큘럼 프롬프트 반영
- P4-023: 마일스톤(UP 트렌드 70% 이상) → 커리큘럼 프롬프트 반영
- P4-024: 발달수준 카테고리별 구조화

[Phase 4 검증 중 수정된 버그]

1. 연구 피드 빈 배열: childId 필터에 OR [childId, null] 조건 추가
2. Phase 4 API 빈 결과: FamilyResolverService를 모든 Phase 4 컨트롤러에 적용
3. AI digest 500: Child.name/birthDate 암호화 필드 접근 오류 → 제거
4. AI digest JSON 파싱 오류: JSON 응답 → 평문 텍스트로 변경
5. 관리자 배치 stub: admin.module에 ResearchModule import, 실제 DI
6. Express ETag 304: main.ts에 etag=false 추가
7. 서버 재시작 후 데이터 미표시: AppInitializer 추가 (자동 동기화)
8. 모바일 연구 화면 오류: ResearchMatch 타입 수정 (item.article.xxx 중첩), null 방어

## CURRENT STATE

- Phase 1 + 2 + 3 + 4: 구현 완료
- 빌드: api ✅ web ✅ admin ✅ mobile(export) ✅
- 테스트: 244개 통과
- Git: 146 커밋, master 브랜치 push 완료
- 웹: http://3.35.36.62:4200
- 모바일 웹: http://3.35.36.62:8081 (restart-mobile.sh 실행 후)
- Admin: http://3.35.36.62:4300
- PubMed 연구 배치: Admin 패널 → 모니터링 → "연구 배치 실행" 버튼
- 수집된 논문: 20개 (2026-06-04 기준)

## PENDING TASKS

1. Phase 4 수동 테스트 (PHASE4_TEST_CHECKLIST.md 참조):
   - 웹 UI 25개 항목 미완료
   - 모바일 10개 항목 미완료

2. Phase 4로 이연된 항목:
   - GDPR 데이터 내보내기 (모바일)
   - 아이 추가 (모바일)
   - 연구 자동 아카이브: 배치에 archiveOldArticles() 연결 필요

3. Phase 5 대기 중 (SPEC/IMPLEMENTATION_PLAN.md 참조)

## KEY FILES

- ASD/SPEC/IMPLEMENTATION_PLAN.md - Phase 5 계획
- ASD/auticare/AGENTS.md - 개발 필수 참조 (12.2 Phase 4 버그 패턴 포함)
- ASD/auticare/PHASE4_TEST_CHECKLIST.md - Phase 4 수동 테스트 체크리스트
- ASD/auticare/apps/api/src/research/ - 연구 모듈 전체
- ASD/auticare/apps/api/src/common/services/family-resolver.service.ts - familyId 해석
- ASD/auticare/apps/web/src/components/AppInitializer.tsx - 자동 동기화
- ASD/auticare/apps/web/src/pages/ResearchPage.tsx - 연구 4탭 UI
- ASD/auticare/apps/mobile/app/research.tsx - 모바일 연구 화면
- ASD/auticare/libs/prisma-client/prisma/schema.prisma - 스키마 (Phase 4 모델 포함)
- ASD/auticare/scripts/ - 서버 관리 스크립트

## IMPORTANT DECISIONS

- Phase 4 컨트롤러: user.familyId 직접 사용 금지 → FamilyResolverService 필수
- AI 응답 파싱: JSON 요청하면 마크다운 포함으로 파싱 실패 → 평문 텍스트 요청
- Express ETag: main.ts에 app.set('etag', false) (304 캐시 방지)
- 연구 아카이브: isArchived=true (숨김, 복원 가능) / deleteMany (영구 삭제)
- 모바일 ResearchMatch: item.article.xxx 중첩 접근, tags/keyFindings는 ?? [] 필요
- 앱 자동 동기화: AppInitializer가 /users/me + /families/my 자동 호출
- 사이드바: 아코디언 그룹 (현재 경로 포함 그룹 자동 펼침)
- AI digest: 평문 텍스트 응답, regex로 TOP 3 논문 파싱

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

1. AGENTS.md 12절 (Phase 4 완료 현황) 읽기
2. PHASE4_TEST_CHECKLIST.md 기반으로 수동 테스트 진행
3. 새 기능 개발 시: FamilyResolverService 반드시 사용
4. 연구 관련 수정: research.service.ts (아카이브/digest 로직 포함)
5. 모바일 코드 변경 후: ./scripts/restart-mobile.sh (2~3분)
