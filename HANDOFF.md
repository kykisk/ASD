# HANDOFF CONTEXT

## USER REQUESTS (AS-IS)

- Phase 1~5 전체 구현 + 검증 완료
- 수업 피드백 기능 추가 (SessionFeedback + AI 파이프라인)
- 복약 관리 기능 추가 (Medication + MedicationLog + MedicationReaction)
- 피드백 기반 성장 추적 + 일상/문제행동 기록 (FeedbackDomainExtraction + feedbackType)
- UX 개선 세션 (메뉴 재구성, 도메인 순서, 캘린더 피드백 아이콘, 날짜 구간 선택)

## GOAL

운영 준비 단계. 새 개발 서버에서 **빈 DB로 새로 테스트** 시작 (사용자가 본인 가족·아이 데이터를 직접 등록).

## CURRENT STATE

- Phase 1~5 + UX 개선 완료
- Git: master 브랜치 (`git@github.com:kykisk/ASD.git`)
- 테스트: 282개 통과 (3개 기존 사전 실패)
- 개발 서버: 새 EC2 (RHEL 10.2, 8 vCPU / 61GB, Elastic IP `3.34.223.12`), `~/workspace/ASD` = 리포 루트
- DB: **빈 DB로 새 시작** (2026-10-19, admin 계정만 seed). 예전 서버 데이터는 복원하지 않음
- 접속: **SSH 터널** (보안 그룹은 22번만 사용). PC 의 `~/.ssh/config` 에 `Host auticare` + LocalForward 4200/4300/3100/8081 설정 후 `ssh -N auticare`
  - 웹 http://localhost:4200 · Admin http://localhost:4300 (admin@auticare.com, 비밀번호는 2026-10-21 변경 — 비밀번호 관리자 보관) · 모바일 http://localhost:8081
- Claude Code: 이 서버의 `~/workspace/ASD` 에서 시작 + Remote Control (CLAUDE.md → AGENTS.md 자동 로드)

## 사용 가이드 (앱 안 매뉴얼)

- 모바일: 더보기 › 사용 가이드 (`apps/mobile/app/guide.tsx`), 오늘 화면 하단 링크
- PC: 사이드바 하단 "사용 가이드" (`/guide`, `apps/web/src/pages/GuidePage.tsx`), 오늘 화면 하단 링크
- 스크린샷 갱신 (화면이 바뀌면): 데모 계정(오늘 커리큘럼·기록 있는 테스트 가족) 로
  `GUIDE_EMAIL=... GUIDE_PASSWORD=... node scripts/guide-screenshots.mjs` → `./scripts/restart-mobile.sh`, `./scripts/rebuild-web.sh && ./scripts/restart-fe.sh`
  (실제 가족 계정으로 찍지 말 것 — 아이 이름이 이미지에 들어감)

## 개편 작업 형상관리 (2026-10-21~)

- 개편 전 기준점: git 태그 **`v1.0-before-redesign`** (`04d1027`) + DB 백업 `backups/milestones/v1.0-before-redesign.sql.gz` (자동 정리 대상 아님)
- 개편 작업 브랜치: **`redesign/today`** — '오늘' 홈·오늘 하루 기록, PC 오늘 화면, 메뉴 정리(모바일 탭 5 / PC 메인 5 + 더보기, 성장 3탭), 사용 가이드, 화면별 따라하기 투어(driver.js), 첫 사용 안내(/welcome). 사용자 테스트 후 master 로 merge
- 관리자 정리 브랜치: **`admin/cleanup`** (redesign/today 위) — 메뉴 재구성(운영 현황 · 사용자·가족 · AI · 자동 작업 / 콘텐츠: 논문·질문지·라이선스 / 기록: 감사 로그),
  AI 사용량(Redis `auticare:ai-cost:<날짜>:model|feature:*`)·연결 실테스트·하루 호출 한도(회), 자동 작업 실행 기록(BatchJob, 주간 배치도 기록) + 지금 실행,
  임시 비밀번호 발급(`User.mustChangePassword` → 웹/모바일 로그인 직후 `/change-password` 강제), 테스트 계정 삭제(이메일 재입력, `qa-*@example.com` 은 운영 현황에 표시).
  모니터링의 가짜 카드·가짜 감사 로그/질문지 목록 제거. 예전 주소(/dashboard, /monitoring 등)는 새 주소로 리다이렉트
- 원칙: DB 변경은 **추가만** (새 컬럼은 nullable/default) → 코드만 되돌려도 기존 버전이 그대로 동작
- 되돌리기 (코드):
  ```bash
  git checkout master            # 또는: git checkout v1.0-before-redesign
  pnpm nx run api:build --skip-nx-cache && ./scripts/restart-api.sh
  ./scripts/rebuild-web.sh && ./scripts/restart-fe.sh && ./scripts/restart-mobile.sh
  ```
- 되돌리기 (DB, 필요할 때만 — 이후 입력한 데이터는 사라짐):
  `gunzip -c backups/milestones/v1.0-before-redesign.sql.gz | podman exec -i auticare-postgres psql -U auticare auticare`

## 외부 접속 (2026-10-20, 가족 테스트용)

| 주소                       | 대상              |
| -------------------------- | ----------------- |
| https://m.auticare.app     | 모바일 웹 (:8081) |
| https://app.auticare.app   | 웹 (:4200)        |
| https://admin.auticare.app | Admin (:4300)     |

- 도메인 `auticare.app` (Cloudflare 등록, 갱신 $14/년). `auticare.com` 은 타인 소유(Sedo 판매 중)
- Cloudflare Tunnel: 서버 `cloudflared.service` (systemd, `--token-file /etc/cloudflared/token`, root 600). 라우트는 Zero Trust → Networks → Tunnels → auticare → Routes 에서 관리
- Cloudflare Access: 앱 `AutiCare` (3개 호스트), 정책 `가족` = 허용 이메일만, One-time PIN, 세션 1개월
- 터널 경로는 모두 same-origin `/v1` 프록시라 CORS 추가 불필요
- Tailscale 도 설치됨 (`auticare` 100.103.21.27) — 은행앱 VPN 감지 문제로 가족용은 Cloudflare Access 사용
- 공개 차단 확인: 인증 없이 접근 시 모든 경로(/v1 포함) 302 → cloudflareaccess 로그인

## 최근 완료 작업 (2026-10-19~20, 새 개발 서버 구축)

예전 EC2 를 쓸 수 없게 되어 새 서버에 환경을 다시 구축. 서버를 또 잃어도 빠르게 복구할 수 있게 자동화.

| 항목             | 내용                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 서버 재구축      | `scripts/setup-server.sh` 한 번으로 패키지·Node 20(nvm)·pnpm·Podman DB·.env·migrate·seed·자동기동·백업 cron 까지 (재실행 안전, .env 덮어쓰지 않음)                                                     |
| 재부팅 자동 기동 | linger + `podman-restart.service`(DB 컨테이너) + `systemctl --user` `auticare.service` → `scripts/boot.sh` (db→api→web→admin→mobile). 로그 `logs/boot.log`                                             |
| DB 백업          | cron 매일 03:00 `scripts/backup-db.sh` → `backups/*.sql.gz` (14일 보관, 600 권한). `.env` 에 `BACKUP_S3_URI` + aws CLI 있으면 S3 업로드 (아직 미설정)                                                  |
| IP 하드코딩 제거 | `scripts/public-ip.sh` (IMDSv2) 로 실행 시 조회. `update-ip.sh` 는 `.env` 만 수정                                                                                                                      |
| 모바일           | `.env` 의 `EXPO_PUBLIC_API_URL`(기본 `/v1`, `serve-mobile.js` 가 API 로 프록시 → 터널·Tailscale 공통) 우선. Metro 캐시 때문에 `expo export --clear`                                                    |
| DB 비밀번호      | `start-db.sh` 의 Postgres 비밀번호를 `auticare` 로 통일 (DATABASE_URL·seed-test-env.sh 와 일치)                                                                                                        |
| 클라우드 세션    | `.claude/settings.json` SessionStart hook → `scripts/cloud-setup.sh` (`CLAUDE_CODE_REMOTE=true` 일 때만). 클라우드 VM 의 Postgres :5433 / Redis :6380 기동, .env, install, migrate, seed, devdata 복원 |
| devdata 스냅샷   | `scripts/export-devdata.sh` → 비공개 리포 `kykisk/ASD-devdata` (아이 이름 "아이N" 마스킹 + 개발용 키 재암호화, API 키·토큰·IP·전화 제거, 비밀번호 `Dev123!@#`). 실제 암호화 키는 서버 밖으로 안 나감   |
| 보안             | `SERVER_MIGRATION_GUIDE.md` 에 있던 예전 서버의 실제 ENCRYPTION_MASTER_KEY·JWT 시크릿 값 삭제 (git 히스토리에는 남아 있음 — 공개 리포)                                                                 |
| 문서             | `CLAUDE.md`(@AGENTS.md) 추가, 가이드의 옛 경로 `ASD/auticare` 수정                                                                                                                                     |

검증: setup-server.sh 재실행, 재부팅 서비스 기동, 백업→복원, Ubuntu 24.04 컨테이너에서 cloud-setup.sh 전체 흐름(스냅샷 복원→API 로그인→아이 복호화) 확인. **실제 클라우드 세션에서는 아직 미검증.**

## 최근 완료 작업 (2026-07-02, AI 스키마 안정화)

| 작업                    | 내용                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| 프롬프트 길이 제약 추가 | curriculum-prompt.service.ts 전 필드에 '최대 N자' 명시                |
| 스키마 트렁케이션 전환  | curriculum/digest/insight 스키마: .max() → cappedString() (예외→절단) |
| 회귀 테스트 추가        | curriculum.schema.spec.ts 7개 테스트                                  |
| Cloudflare 터널 종료    | cloudflared tunnel 프로세스 종료 (외부 접속 불가)                     |

## 이전 완료 작업 (2026-06-11, UX 개선 세션)

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

## PENDING TASKS (개발 서버 / 인프라)

1. 사용자: 웹에서 가족·아이 등록 → `./scripts/export-devdata.sh` 로 스냅샷 갱신
2. 사용자: Claude GitHub App 을 `ASD-devdata` 에 설치 → 실제 클라우드 세션에서 `logs/cloud-setup.log` 로 복원 여부 확인 (두 번째 비공개 리포 clone 가능 여부 미검증)
3. DB 백업 S3 연동 (버킷 + 인스턴스 IAM Role + `.env` 의 `BACKUP_S3_URI`)
4. ~~admin 비밀번호 변경~~ 완료 (2026-10-21, `POST /v1/auth/change-password`). 새 DB 는 seed 기본값이라 설치 직후 관리자 화면에서 바로 변경할 것
5. git 히스토리의 예전 키 노출 정리 여부 결정 (history rewrite + force push 필요)
6. `.env` 를 비밀번호 관리자에 보관 (특히 ENCRYPTION_MASTER_KEY)
7. `.env` 의 ANTHROPIC_API_KEY 입력 (AI_DEFAULT_PROVIDER=anthropic, Bedrock 미사용)

## PENDING TASKS (운영 준비)

1. consent.service.ts CONSENT_DOCUMENTS 실제 저작권 문구 교체
2. licensed-tool-data.service.ts 실제 도구 문항 교체
3. Apple Developer Program ($99/년) + Google Play Console ($25) 등록
4. FCM 설정 (.env FCM_PROJECT_ID 등)
5. 서버 배포 (DEPLOYMENT_GUIDE.md 참조)
6. 개인정보처리방침 실제 법적 문서 작성
7. 도메인 구매 → OAuth(Google/Kakao) 활성화

## 사용자 확장 시 다시 볼 것 (2026-10-21 결정: 테스트 단계라 지금은 그대로)

- **AI 하루 호출 한도**: 지금 기본 연결(Fast)의 `dailyBudgetLimit` = **100회**. 한도를 넘으면 그날 AI 기능 전체가 멈춤.
  가족이 늘면 관리자 › AI › 연결 설정에서 올릴 것 (가족 수 × 하루 기록 · 커리큘럼 호출을 보고 대략 1,000회 이상).
  운영 현황 카드에서 오늘 호출 / 한도 비율을 확인 (80% 넘으면 주황색)
- **기능별 모델**: 2026-10-21 '품질' 추천 기능(커리큘럼 · 이번 주 요약 · 맞춤 논문 요약 · 사진→질문지 · 사진→임상 보고서 · 힘든 순간 분석 · 질문지 저작권 확인) + 주간 기록 요약을 Quality(Sonnet 5.5)로 지정.
  나머지는 기본(Fast, Haiku 5.5). 비용이 커지면 관리자 › AI 에서 이번 달 추정 크레딧($200 Max 플랜 크레딧 기준)을 보고 조정
- 가족 AI 사용 범위(티어, 관리자 › 사용자·가족 › 가족 탭)도 가족이 늘면 함께 검토

## PENDING 개선사항

- ADOS-2, SCQ 라이선스 도구 추가
- 임상 보고서 PDF 내보내기
- 복약 알림 (FCM 설정 후)

## KEY FILES

- AGENTS.md — 전체 개발 지식베이스 (23절)
- HANDOFF.md — 현재 상태 + 최근 변경사항 + 남은 작업
- SERVER_MIGRATION_GUIDE.md — 서버 이전 가이드 (새 환경 세팅 절차)
- scripts/update-ip.sh — EC2 IP 바뀌면 실행
- apps/api/src/session-feedbacks/ — 수업 피드백 + 도메인 추출 모듈
- apps/api/src/medications/ — 복약 관리 모듈
- apps/web/src/pages/SessionFeedbackPage.tsx — 일일피드백 3탭
- apps/mobile/app/session-feedback.tsx — 모바일 일일피드백
- apps/mobile/app/medication.tsx — 모바일 복약 관리
- apps/web/src/pages/SchedulePage.tsx — 일정 + 피드백 팝업

## IMPORTANT DECISIONS

- FamilyResolverService 필수 (user.familyId 직접 사용 금지)
- AI 응답: 시스템 프롬프트에 마크다운 금지 필수
- vite preview = 정적 서빙 + /v1 proxy (개발서버 아님)
- 코드 변경 후: ./scripts/rebuild-web.sh → ./scripts/restart-fe.sh
- Admin 비밀번호: 개발 서버는 변경됨(비밀번호 관리자). seed 기본값 `Admin123!@#` 는 새 DB·클라우드 스냅샷에서만 유효
- feedbackType: SESSION(수업) | DAILY_LOG(일상) | BEHAVIORAL_ISSUE(문제행동)
- AI 도메인 추출: fire-and-forget (피드백 저장 즉시, 실패해도 피드백 저장 영향 없음)
- 시스템 질문지 "AI 발달 추출": familyId 기준 getOrCreate (Assessment.questionnaireId 필수 대응)
- Assessment 데이터 윈도우: 30일 이내 take:15
- 임상보고서 참조: 최신 1건만
- EC2 IP 바뀌면: ./scripts/update-ip.sh 실행 (현재 Elastic IP 라 보통 불필요)
- 서버 재구축: `scripts/setup-server.sh` (SERVER_MIGRATION_GUIDE.md 맨 위 "빠른 재구축")
- 외부 접속은 SSH 터널만 사용 (서비스 포트를 보안 그룹에 열지 않음)
- 클라우드 세션 DB 는 devdata 스냅샷 (실데이터·실제 키를 클라우드로 보내지 않음)
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
