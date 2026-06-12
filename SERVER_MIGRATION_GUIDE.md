# 개발환경 서버 이전 가이드

> 새 서버(EC2 등)에서 AutiCare 개발환경을 처음부터 세팅하는 절차.
> OpenCode AI에게 이 문서를 주면 바로 수행 가능.

---

## 1. 사전 준비 (사용자가 직접 해야 할 것)

### 1.1 새 서버 요구사항

- OS: Amazon Linux 2023 또는 Ubuntu 22.04+
- RAM: 4GB 이상
- 저장소: 20GB 이상
- 포트 오픈: 3100, 4200, 4300, 8081

### 1.2 사용자가 미리 준비할 것

| 항목          | 설명                                                |
| ------------- | --------------------------------------------------- |
| GitHub SSH 키 | 새 서버에서 `ssh-keygen` → GitHub에 공개키 등록     |
| `.env` 파일   | 기존 서버에서 복사 (또는 아래 템플릿 참고해서 작성) |
| AWS 자격증명  | Bedrock AI 사용 시 (`~/.aws/credentials`)           |

### 1.3 .env 필수 항목 (민감정보는 직접 입력)

```env
# DB
DATABASE_URL=postgresql://auticare:password@localhost:5433/auticare?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# JWT
JWT_ACCESS_SECRET=<32자 이상 랜덤 문자열>
JWT_REFRESH_SECRET=<32자 이상 랜덤 문자열>
JWT_ACCESS_TTL=28800

# 암호화
ENCRYPTION_KEY=<64자 hex>

# CORS (IP는 update-ip.sh가 자동 교체)
CORS_ORIGINS=http://localhost:4200,http://localhost:4300,http://localhost:8081,http://<새IP>:4200,http://<새IP>:4300,http://<새IP>:8081

# AI (Bedrock - 선택)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<값>
AWS_SECRET_ACCESS_KEY=<값>

# AI (Gemini - 선택, 무료)
# Admin 패널에서 설정 가능

# OAuth (운영 시 설정, 개발 중 비워도 됨)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=

# 프론트 URL
WEB_URL=http://<새IP>:4200
```

---

## 2. OpenCode에게 시킬 내용 (복붙용)

아래 메시지를 새 OpenCode 세션에 그대로 입력하세요:

---

### 메시지 1: 환경 세팅

```
새 서버에서 AutiCare 개발환경을 세팅해줘.

1. 아래 순서대로 설치:
   - Node.js 20+ (nvm 사용)
   - pnpm (npm install -g pnpm)
   - podman 또는 docker (컨테이너용)

2. Git clone:
   git clone git@github.com:kykisk/ASD.git /home/ec2-user/workspace/ASD
   cd /home/ec2-user/workspace/ASD/auticare

3. .env 파일은 이미 만들어놨어 (루트에 있음)

4. 의존성 설치:
   pnpm install

5. IP 업데이트:
   ./scripts/update-ip.sh

6. DB 시작 + 마이그레이션:
   ./scripts/start-db.sh
   pnpm prisma migrate deploy --schema=libs/prisma-client/prisma/schema.prisma
   pnpm prisma generate --schema=libs/prisma-client/prisma/schema.prisma

7. 모든 서비스 시작:
   ./scripts/start-api.sh
   ./scripts/start-web.sh
   ./scripts/start-admin.sh
   ./scripts/start-mobile.sh

8. 상태 확인:
   ./scripts/status.sh

9. AGENTS.md와 HANDOFF.md를 읽고 현재 프로젝트 상태 파악해줘
```

---

### 메시지 2: 이전 작업 이어가기

```
ASD/auticare 폴더의 AGENTS.md와 HANDOFF.md를 읽고 이전 세션 작업을 이어가줘
```

---

## 3. 서버 이전 단계별 체크리스트

### 3.1 새 서버 초기화 (사용자)

```bash
# Node.js 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# pnpm 설치
npm install -g pnpm

# Docker/Podman (Amazon Linux 2023)
sudo dnf install -y podman podman-compose
# 또는 Ubuntu: sudo apt install -y docker.io docker-compose

# Git SSH 키 생성 + GitHub 등록
ssh-keygen -t ed25519 -C "auticare-server"
cat ~/.ssh/id_ed25519.pub
# → GitHub Settings > SSH keys > Add
```

### 3.2 프로젝트 클론 + 환경설정 (사용자)

```bash
git clone git@github.com:kykisk/ASD.git ~/workspace/ASD
cd ~/workspace/ASD/auticare

# .env 파일 생성 (위 템플릿 참고)
vim .env
```

### 3.3 서비스 실행 (OpenCode 또는 사용자)

```bash
pnpm install
./scripts/update-ip.sh
./scripts/start-db.sh

# DB 마이그레이션 (기존 데이터 없이 새로 시작)
pnpm prisma migrate deploy --schema=libs/prisma-client/prisma/schema.prisma
pnpm prisma generate --schema=libs/prisma-client/prisma/schema.prisma

# Admin 계정 시드 (최초 1회)
pnpm prisma db seed

# 서비스 시작
./scripts/start-api.sh
./scripts/start-web.sh
./scripts/start-admin.sh
./scripts/start-mobile.sh

# 확인
./scripts/status.sh
```

### 3.4 기존 데이터 이전 (선택)

기존 서버 DB를 이전하려면:

```bash
# 기존 서버에서 덤프
docker exec auticare-postgres pg_dump -U auticare auticare > backup.sql

# 새 서버에서 복원
docker exec -i auticare-postgres psql -U auticare auticare < backup.sql
```

---

## 4. 서버 이전 후 확인사항

| 항목         | 확인 방법                                                 |
| ------------ | --------------------------------------------------------- |
| API 정상     | `curl http://localhost:3100/v1` → 200                     |
| 웹 접속      | `http://<새IP>:4200`                                      |
| Admin 접속   | `http://<새IP>:4300` (admin@auticare.com / Admin123!@#)   |
| 모바일 접속  | `http://<새IP>:8081`                                      |
| AI 동작      | Admin → AI 설정에서 프로바이더 활성 확인                  |
| IP 자동 반영 | `.env`와 `scripts/start-mobile.sh` 내 IP가 새 IP인지 확인 |

---

## 5. 자주 발생하는 문제

| 문제                      | 해결                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `pnpm: command not found` | `npm install -g pnpm`                                        |
| DB 연결 실패              | `./scripts/start-db.sh` 먼저 실행                            |
| 포트 이미 사용 중         | `./scripts/stop-servers.sh` 후 재시작                        |
| API 빌드 타임아웃         | `NX_DAEMON=false` 환경변수 추가 (start-api.sh에 이미 적용됨) |
| vite 좀비 프로세스        | `pkill -f "vite preview"` (start-web.sh에 이미 적용됨)       |
| IP 변경 후 CORS 오류      | `./scripts/update-ip.sh` 재실행                              |
| OAuth 로그인 에러         | 개발 중엔 비활성화 상태 (정상), 운영 시 도메인+키 설정 필요  |

---

## 6. 핵심 파일 위치

| 파일                   | 역할                                  |
| ---------------------- | ------------------------------------- |
| `AGENTS.md`            | AI 에이전트용 전체 기술 지식베이스    |
| `HANDOFF.md`           | 현재 상태 + 최근 변경사항 + 남은 작업 |
| `.env`                 | 환경변수 (git에 없음, 수동 생성 필요) |
| `scripts/update-ip.sh` | IP 변경 시 자동 업데이트              |
| `scripts/status.sh`    | 전체 서비스 상태 확인                 |
| `scripts/start-*.sh`   | 각 서비스 시작                        |
| `scripts/restart-*.sh` | 각 서비스 재시작                      |
