# AutiCare 서버 이전 가이드 (EC2 → 미니서버)

> 최종 업데이트: 2026-10-19
> 현재 개발 서버: EC2 (RHEL 10.2, Elastic IP) — `~/workspace/ASD` (리포 루트 = 프로젝트 루트)
> 이전 원본: EC2 (RHEL 9.8, ip-172-31-36-149, ap-northeast-2)

---

## ⚡ 빠른 재구축 (dnf 계열 서버: RHEL / Amazon Linux / Fedora)

서버를 갑자기 못 쓰게 됐을 때 새 서버에서 아래만 하면 됩니다.
`scripts/setup-server.sh` 가 패키지·Node·pnpm·DB 컨테이너·.env·migration·seed·재부팅 자동기동·매일 백업 cron 까지 처리합니다 (여러 번 실행해도 안전).

```bash
# 1) SSH 키 생성 → GitHub 등록 (4-1 참고)
# 2) 클론
git clone git@github.com:kykisk/ASD.git ~/workspace/ASD
# 3) (데이터 복원 시) 비밀번호 관리자에 보관한 .env 를 ~/workspace/ASD/.env 로 저장
#    + 최신 DB 백업(auticare-db-*.sql.gz)을 ~/workspace/ASD/backups/ 에 복사
#    → setup-server.sh 가 빈 DB 를 감지하면 최신 백업을 자동 복원
# 4) 실행
~/workspace/ASD/scripts/setup-server.sh
# 5) AWS 보안 그룹: TCP 3100, 4200, 4300, 8081 오픈 (5433/6380 은 열지 말 것)
```

| 항목              | 위치 / 방식                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 공인 IP           | 하드코딩 없음 — `scripts/public-ip.sh` 가 실행 시 조회 (`.env` 의 CORS_ORIGINS/WEB_URL 만 `update-ip.sh` 로 갱신)         |
| 재부팅 자동 기동  | `systemctl --user status auticare` (→ `scripts/boot.sh`), DB 컨테이너는 `podman-restart.service`                          |
| DB 백업           | 매일 03:00 `scripts/backup-db.sh` → `backups/` (14일 보관). `.env` 에 `BACKUP_S3_URI=s3://...` + aws CLI 있으면 S3 업로드 |
| 서버 밖 보관 필수 | `.env` (특히 `ENCRYPTION_MASTER_KEY`) → 비밀번호 관리자, DB 백업 → S3 등                                                  |

---

## 개요

이 문서는 현재 EC2에서 운영 중인 AutiCare 개발환경 전체를 새 미니서버로 이전하는 절차입니다.
**OpenCode + AI 코딩 환경**까지 포함하여, 새 서버에서 동일하게 작업을 이어갈 수 있도록 합니다.

### 이전 대상

| 항목          | 설명                                       | Git에 포함?        |
| ------------- | ------------------------------------------ | ------------------ |
| 소스 코드     | auticare 모노레포 (260 커밋)               | ✅ Git             |
| DB 데이터     | PostgreSQL (사용자, 아이, 평가, AI설정 등) | ❌ 별도 백업       |
| `.env` 파일   | 환경변수 (JWT 시크릿, 암호화 키 등)        | ❌ 수동 복사       |
| OpenCode 설정 | AI 프로바이더 설정 + 플러그인              | ❌ 수동 설정       |
| Crontab       | watchdog 5분 헬스체크                      | ❌ 수동 등록       |
| SPEC 문서     | 요구사항/구현계획/디자인가이드             | ✅ Git (ASD/SPEC/) |

---

## ⚠️ 절대 잃어버리면 안 되는 것 (CRITICAL)

### 1. ENCRYPTION_MASTER_KEY

값은 `.env` 에만 있습니다. **문서/Git 에 절대 기록하지 말고** 비밀번호 관리자에 `.env` 전체를 보관하세요.

**이 키를 잃으면 DB에 저장된 아이 이름, 생년월일 등 암호화된 PII를 영원히 복호화할 수 없습니다.**
반드시 안전한 곳에 별도 백기 후 새 서버 `.env`에 동일하게 입력해야 합니다.

### 2. JWT 시크릿 (선택)

`.env` 의 `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (값은 문서에 기록하지 않음).

새로 생성해도 되지만, 그러면 기존 로그인 세션이 모두 만료됩니다. (재로그인 필요)
DB를 복원할 거면 동일한 값을 쓰는 게 편합니다.

### 3. DB 백업 파일

```
위치: ASD/backups/auticare-db-YYYYMMDD-HHMM.sql.gz (scripts/backup-db.sh 가 매일 생성)
```

이 파일은 Git에 포함되지 않으므로 **직접 복사**해야 합니다.

---

## STEP 1: EC2에서 할 일 (서버 끄기 전)

### 1-1. Git 최신 상태 확인 + Push

```bash
cd /home/ec2-user/workspace/ASD
git status          # 변경사항 없는지 확인
git push origin master   # 최신 코드 Push
```

> 현재 상태: 커밋되지 않은 변경 없음, Push 완료 상태 ✅

### 1-2. DB 백업

```bash
# 이미 생성됨 (2026-08-30)
ls -la backups/auticare-db-20260830.sql

# 최신으로 다시 뜨려면:
docker exec auticare-postgres pg_dump -U auticare --clean --if-exists auticare > backups/auticare-db-$(date +%Y%m%d).sql
```

### 1-3. 필수 파일 로컬로 다운로드

새 서버로 가져가야 할 파일 **3개**:

```bash
# 1) .env (환경변수 + 시크릿 키)
scp ec2-user@<EC2-IP>:/home/ec2-user/workspace/ASD/.env ./auticare-env-backup

# 2) DB 백업
scp ec2-user@<EC2-IP>:/home/ec2-user/workspace/ASD/backups/auticare-db-20260830.sql ./

# 3) OpenCode 설정 (AI 프로바이더 설정)
scp ec2-user@<EC2-IP>:/home/ec2-user/.config/opencode/opencode.json ./opencode-config-backup.json
```

또는 USB/클라우드 스토리지 등 어떤 방법이든 이 3개 파일만 옮기면 됩니다.

---

## STEP 2: 미니서버 OS 설치 + 기본 세팅

### 2-1. 권장 OS

| OS                   | 추천도 | 이유                                 |
| -------------------- | ------ | ------------------------------------ |
| **Ubuntu 22.04 LTS** | ⭐⭐⭐ | Docker 공식 지원, 커뮤니티 자료 풍부 |
| Ubuntu 24.04 LTS     | ⭐⭐   | 최신이지만 호환성 이슈 가능          |
| Fedora/RHEL계        | ⭐     | Podman 기본, Docker 추가 설치 필요   |

### 2-2. 미니서버 최소 사양

| 항목    | 최소      | 권장      |
| ------- | --------- | --------- |
| RAM     | 8GB       | 16GB      |
| Storage | 128GB SSD | 256GB SSD |
| CPU     | 4코어     | 8코어     |

> OpenCode + AutiCare 서비스 동시 실행 시 8GB RAM은 필수.
> node_modules만 4GB, 빌드 시 메모리 추가 소모.

### 2-3. 기본 패키지 설치 (Ubuntu 기준)

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지
sudo apt install -y git curl wget build-essential

# Docker 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 로그아웃 후 재로그인

# Docker Compose 확인
docker compose version

# Node.js 20 (nvm 사용)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node --version   # v20.x.x 확인

# pnpm 설치
npm install -g pnpm
pnpm --version   # 확인
```

---

## STEP 3: OpenCode 설치 + AI 설정

### 3-1. OpenCode 설치

```bash
# OpenCode 설치 (공식 방법)
curl -fsSL https://opencode.ai/install | bash

# 설치 확인
opencode --version
```

### 3-2. OpenCode 설정 파일 생성

**경로**: `~/.config/opencode/opencode.json`

```bash
mkdir -p ~/.config/opencode
```

아래에서 **사용할 AI 방식을 하나 선택**하세요:

#### 옵션 A: AWS Bedrock (기존과 동일)

AWS 계정이 있고 Bedrock 접근 권한이 있는 경우.

```bash
# 1) AWS CLI 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# 2) AWS 자격증명 설정
aws configure
# AWS Access Key ID: <입력>
# AWS Secret Access Key: <입력>
# Default region name: us-east-1
# Default output format: json
```

`~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1"
      },
      "models": {
        "us.anthropic.claude-opus-4-6-v1": {
          "name": "Claude Opus 4.6 (Bedrock)"
        },
        "us.anthropic.claude-sonnet-4-6": {
          "name": "Claude Sonnet 4.6 (Bedrock)"
        }
      }
    }
  },
  "plugin": ["oh-my-openagent@latest"]
}
```

#### 옵션 B: Anthropic API 직접 (Claude API 키 구매)

AWS 없이 Anthropic에서 직접 API 키를 구매한 경우.

```bash
# 환경변수로 API 키 설정
echo 'export ANTHROPIC_API_KEY="sk-ant-xxxxx"' >> ~/.bashrc
source ~/.bashrc
```

`~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "anthropic": {
      "models": {
        "claude-opus-4-20250514": {
          "name": "Claude Opus 4"
        },
        "claude-sonnet-4-20250514": {
          "name": "Claude Sonnet 4"
        }
      }
    }
  },
  "plugin": ["oh-my-openagent@latest"]
}
```

#### 옵션 C: 둘 다 (Bedrock + Anthropic)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "amazon-bedrock": {
      "options": { "region": "us-east-1" },
      "models": {
        "us.anthropic.claude-opus-4-6-v1": { "name": "Claude Opus 4.6 (Bedrock)" },
        "us.anthropic.claude-sonnet-4-6": { "name": "Claude Sonnet 4.6 (Bedrock)" }
      }
    },
    "anthropic": {
      "models": {
        "claude-opus-4-20250514": { "name": "Claude Opus 4 (Direct)" },
        "claude-sonnet-4-20250514": { "name": "Claude Sonnet 4 (Direct)" }
      }
    }
  },
  "plugin": ["oh-my-openagent@latest"]
}
```

### 3-3. oh-my-openagent 플러그인 설치

OpenCode 최초 실행 시 자동 설치됨. 수동 설치:

```bash
cd ~/.config/opencode
npm install oh-my-openagent@latest
```

---

## STEP 4: 프로젝트 클론 + 환경 설정

### 4-1. SSH 키 생성 + GitHub 등록

```bash
ssh-keygen -t ed25519 -C "auticare-miniserver"
cat ~/.ssh/id_ed25519.pub
# → GitHub.com > Settings > SSH and GPG keys > New SSH key
# Title: auticare-miniserver
# Key: 위에서 복사한 공개키 붙여넣기
```

### 4-2. Git Clone

```bash
mkdir -p ~/workspace
cd ~/workspace
git clone git@github.com:kykisk/ASD.git
cd ASD
```

### 4-3. .env 파일 복원

EC2에서 가져온 `.env` 파일을 `~/workspace/ASD/.env`로 복사.

```bash
cp /path/to/auticare-env-backup ~/workspace/ASD/.env
```

**⚠️ 반드시 확인할 항목:**

| .env 키                 | 처리 방법                                            |
| ----------------------- | ---------------------------------------------------- |
| `ENCRYPTION_MASTER_KEY` | **반드시 기존 값 유지** (변경 시 암호화 데이터 소실) |
| `JWT_ACCESS_SECRET`     | 기존 값 유지 권장 (변경 시 재로그인 필요)            |
| `JWT_REFRESH_SECRET`    | 기존 값 유지 권장                                    |
| `DATABASE_URL`          | 포트 확인 (5433)                                     |
| `REDIS_PORT`            | 포트 확인 (6380)                                     |
| `CORS_ORIGINS`          | 새 IP로 교체 (update-ip.sh가 처리)                   |
| `WEB_URL`               | 새 IP로 교체                                         |
| `AI_DEFAULT_PROVIDER`   | bedrock 또는 anthropic                               |

### 4-4. 의존성 설치

```bash
cd ~/workspace/ASD
pnpm install
# 약 3~5분 소요 (node_modules ~4GB)
```

### 4-5. IP 업데이트

```bash
# 새 서버의 IP를 .env와 스크립트에 자동 반영
./scripts/update-ip.sh
```

---

## STEP 5: DB 시작 + 데이터 복원

### 5-1. Docker 컨테이너 시작

```bash
./scripts/start-db.sh
# PostgreSQL (:5433) + Redis (:6380) 컨테이너 시작
# 최초 실행 시 이미지 다운로드 포함 (1~2분)

# 실행 확인
docker ps
```

### 5-2. 선택지: 새로 시작 vs 데이터 복원

#### 방법 A: 데이터 없이 새로 시작 (깨끗한 상태)

```bash
# 스키마만 적용 (빈 DB)
pnpm prisma migrate deploy --schema=libs/prisma-client/prisma/schema.prisma
pnpm prisma generate --schema=libs/prisma-client/prisma/schema.prisma

# Admin 시드 계정 생성
pnpm prisma db seed
# → admin@auticare.com / Admin123!@#
```

#### 방법 B: 기존 데이터 복원 (권장)

```bash
# 1) 스키마 먼저 적용
pnpm prisma migrate deploy --schema=libs/prisma-client/prisma/schema.prisma
pnpm prisma generate --schema=libs/prisma-client/prisma/schema.prisma

# 2) 백업 파일을 컨테이너 안으로 복사
docker cp backups/auticare-db-20260830.sql auticare-postgres:/tmp/backup.sql

# 3) 복원 실행
docker exec -i auticare-postgres psql -U auticare -d auticare -f /tmp/backup.sql

# 4) 확인
docker exec auticare-postgres psql -U auticare -d auticare -c "SELECT count(*) FROM \"User\";"
```

> 복원 시 `ENCRYPTION_MASTER_KEY`가 EC2와 동일해야 아이 이름/생년월일이 정상 복호화됩니다.

---

## STEP 6: 서비스 시작 + 확인

### 6-1. 모든 서비스 시작

```bash
./scripts/start-api.sh      # 백엔드 :3100 (빌드 1~2분)
./scripts/start-web.sh       # 웹 :4200
./scripts/start-admin.sh     # Admin :4300
./scripts/start-mobile.sh    # 모바일 :8081 (빌드 2~3분)
```

### 6-2. 상태 확인

```bash
./scripts/status.sh
```

### 6-3. 접속 테스트

| 서비스 | URL                     | 확인 방법                        |
| ------ | ----------------------- | -------------------------------- |
| API    | `http://<새IP>:3100/v1` | curl로 200 확인                  |
| 웹     | `http://<새IP>:4200`    | 브라우저 접속                    |
| Admin  | `http://<새IP>:4300`    | admin@auticare.com / Admin123!@# |
| 모바일 | `http://<새IP>:8081`    | 브라우저 접속                    |

### 6-4. Watchdog Crontab 등록 (선택)

> `setup-server.sh` 는 재부팅 자동 기동(systemd)과 매일 DB 백업 cron 만 등록합니다. 실행 중 죽은 web/admin 자동 복구가 필요하면 아래를 추가하세요.

```bash
crontab -e
# 아래 한 줄 추가:
*/5 * * * * /home/$USER/workspace/ASD/scripts/watchdog.sh >> /home/$USER/workspace/ASD/logs/watchdog.log 2>&1
```

---

## STEP 7: OpenCode에서 작업 이어가기

새 서버에서 OpenCode를 실행하고, **아래 메시지를 그대로 입력**하세요:

### 첫 번째 메시지 (프로젝트 인식)

```
ASD 폴더로 가서 작업을 이어하자.
AGENTS.md와 HANDOFF.md를 읽고 현재 프로젝트 상태를 파악해줘.
서비스 상태도 ./scripts/status.sh로 확인해줘.
```

### 두 번째 메시지 (작업 재개)

```
HANDOFF.md의 PENDING TASKS를 보고, 다음 할 작업을 제안해줘.
```

---

## 전체 이전 순서 요약 (체크리스트)

### EC2에서 (서버 끄기 전)

- [ ] `git status` — 커밋 안 된 변경 없는지 확인
- [ ] `git push origin master` — 최신 코드 Push
- [ ] DB 백업: `docker exec auticare-postgres pg_dump -U auticare --clean --if-exists auticare > backups/auticare-db-latest.sql`
- [ ] 3개 파일 로컬로 다운로드:
  - [ ] `.env`
  - [ ] `backups/auticare-db-latest.sql`
  - [ ] `~/.config/opencode/opencode.json`

### 미니서버에서

- [ ] Ubuntu 22.04 LTS 설치
- [ ] 기본 패키지: `git`, `curl`, `build-essential`
- [ ] Docker 설치 + 사용자 그룹 추가
- [ ] Node.js 20 (nvm) + pnpm 설치
- [ ] OpenCode 설치
- [ ] `~/.config/opencode/opencode.json` 생성 (AI 프로바이더 선택)
- [ ] AWS CLI + 자격증명 (Bedrock 사용 시)
- [ ] SSH 키 생성 → GitHub 등록
- [ ] `git clone git@github.com:kykisk/ASD.git ~/workspace/ASD`
- [ ] `.env` 파일 복원 (`ENCRYPTION_MASTER_KEY` 동일 확인!)
- [ ] `pnpm install`
- [ ] `./scripts/update-ip.sh`
- [ ] `./scripts/start-db.sh`
- [ ] Prisma migrate + generate
- [ ] DB 백업 복원 (선택)
- [ ] 서비스 시작 (api → web → admin → mobile)
- [ ] `./scripts/status.sh` — 전체 정상 확인
- [ ] Crontab watchdog 등록
- [ ] OpenCode 실행 → 프로젝트 인식 메시지 입력

---

## 현재 EC2 환경 스냅샷 (참고용)

```
Node.js:    v20.20.2
pnpm:       10.33.4
컨테이너:    Podman 5.8.2 (Docker 호환 CLI)
OS:         RHEL 9.8
Git Remote: git@github.com:kykisk/ASD.git (master)
커밋 수:     260
테스트:     282 통과 (3개 기존 실패)

Docker 포트 매핑:
  PostgreSQL: 5433 → 5432 (컨테이너 내부)
  Redis:      6380 → 6379 (컨테이너 내부)

서비스 포트:
  API:     3100
  Web:     4200
  Admin:   4300
  Mobile:  8081

Crontab:
  */5 * * * * watchdog.sh (web/admin 자동 복구)

OpenCode:
  AI:      Bedrock us-east-1 (Claude Opus 4.6)
  Plugin:  oh-my-openagent@latest
```

---

## 자주 발생하는 문제

| 문제                        | 해결                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm: command not found`   | `npm install -g pnpm` 또는 `source ~/.bashrc`                                                                             |
| DB 연결 실패                | `./scripts/start-db.sh` 먼저 실행, `docker ps`로 컨테이너 확인                                                            |
| 포트 이미 사용 중           | `./scripts/stop-servers.sh` 후 재시작                                                                                     |
| API 빌드 타임아웃           | RAM 부족 가능 — `free -h`로 확인, 스왑 추가                                                                               |
| vite 좀비 프로세스          | `pkill -f "vite preview"`                                                                                                 |
| IP 변경 후 CORS 오류        | `./scripts/update-ip.sh` 재실행                                                                                           |
| 아이 이름이 깨져보임        | `ENCRYPTION_MASTER_KEY`가 EC2 값과 다름 — 반드시 동일 값 사용                                                             |
| `docker: permission denied` | `sudo usermod -aG docker $USER` 후 재로그인                                                                               |
| OpenCode 모델 선택 안됨     | `~/.config/opencode/opencode.json` 확인, API 키/자격증명 확인                                                             |
| OAuth 로그인 에러           | 개발 중엔 비활성화 상태 (정상)                                                                                            |
| 모바일 빌드 실패            | `npx expo --version` 확인, `pnpm install` 재실행                                                                          |
| RAM 부족 (빌드 시 OOM)      | 스왑 추가: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |

---

## 핵심 파일 위치

| 파일                        | 역할                                                           |
| --------------------------- | -------------------------------------------------------------- |
| `AGENTS.md`                 | AI 에이전트용 전체 기술 지식베이스 (23절, 프로젝트 백과사전)   |
| `HANDOFF.md`                | 현재 상태 + 최근 변경사항 + 남은 작업 목록                     |
| `.env`                      | 환경변수 (Git에 없음, 수동 관리)                               |
| `scripts/setup-server.sh`   | 새 서버 재구축 (패키지~서비스 기동까지 한 번에)                |
| `scripts/public-ip.sh`      | 공인 IP 조회 (IMDSv2 → IMDSv1 → checkip)                       |
| `scripts/update-ip.sh`      | IP 변경 시 .env 의 IP 갱신 + API/모바일 재시작                 |
| `scripts/boot.sh`           | 재부팅 시 전체 서비스 기동 (systemd --user auticare.service)   |
| `scripts/backup-db.sh`      | DB 백업 (cron 매일 03:00, 14일 보관, 선택적 S3 업로드)         |
| `scripts/create-env.sh`     | `.env` 생성 (setup-server / cloud-setup 공용, 기존 파일 유지)  |
| `scripts/cloud-setup.sh`    | 클라우드 세션 SessionStart hook (DB 기동·migrate·devdata 복원) |
| `scripts/export-devdata.sh` | 정리된 DB 스냅샷 → 비공개 리포 `kykisk/ASD-devdata` push       |
| `scripts/status.sh`         | 전체 서비스 상태 확인                                          |
| `scripts/start-*.sh`        | 각 서비스 시작                                                 |
| `scripts/restart-*.sh`      | 각 서비스 재시작                                               |
| `scripts/watchdog.sh`       | web/admin 자동 복구 (crontab 등록)                             |
| `docker/docker-compose.yml` | PostgreSQL + Redis 컨테이너 정의                               |
| `ASD/SPEC/`                 | 요구사항, 구현계획, 디자인가이드 문서                          |
