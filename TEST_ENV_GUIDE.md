# AutiCare 외부 테스트 환경 가이드

> 이 가이드는 EC2 개발 서버를 외부 테스터에게 공유할 때 사용합니다.
> Cloudflare Tunnel을 사용해 보안 정책(0.0.0.0 제한) 위반 없이 외부 접근을 허용합니다.

---

## 구조

```
테스터 브라우저 (HTTPS)
    ↓
https://xxxx.trycloudflare.com
    ↓ Cloudflare Tunnel (아웃바운드 연결)
localhost:4200 (Vite dev server)
    ↓ /v1 proxy
localhost:3100 (NestJS API)   ← 인터넷에 직접 노출 안 됨
```

**Admin 패널(:4300)은 공개되지 않음 (보안)**

---

## 사전 준비 (최초 1회)

### 1. cloudflared 설치 확인

```bash
cloudflared --version
# cloudflared version 2026.x.x
```

미설치 시:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
chmod +x /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
```

### 2. 테스트 시드 데이터 적용 (실 데이터 교체)

```bash
./scripts/seed-test-env.sh
```

> ⚠️ 실행 시 기존 사용자/가족 데이터 삭제 후 더미 데이터로 교체됩니다.
> Admin 계정(admin@auticare.com)은 유지됩니다.

---

## 테스트 환경 열기

### 터널 시작

```bash
./scripts/tunnel.sh start
```

출력 예시:

```
✅ 터널 시작됨!
  🌐 웹앱: https://noble-journal-fruit-carries.trycloudflare.com
```

### 테스터에게 공유

URL만 전달하면 됩니다:

```
https://xxxx.trycloudflare.com
```

PC/모바일 브라우저에서 모두 동작합니다.

### 터널 상태 확인

```bash
./scripts/tunnel.sh status
./scripts/tunnel.sh url     # URL만 출력
```

### 터널 종료

```bash
./scripts/tunnel.sh stop
```

---

## 테스트 계정

| 이메일                      | 비밀번호      | 역할          |
| --------------------------- | ------------- | ------------- |
| `tester1@auticare-test.com` | `Test1234!`   | 일반 사용자   |
| `tester2@auticare-test.com` | `Test1234!`   | 일반 사용자   |
| `admin@auticare.com`        | `Admin123!@#` | 시스템 관리자 |

---

## 테스터 안내사항 (공유 필수)

```
AutiCare 테스트 참여 안내

접속 URL: https://xxxx.trycloudflare.com

테스트 계정:
- 이메일: tester1@auticare-test.com
- 비밀번호: Test1234!

주의사항:
- 실제 아동 정보를 입력하지 마세요
- 테스트용 가상 데이터만 사용해주세요
- 테스트 환경으로 데이터는 언제든 초기화될 수 있습니다
- 문의: [연락처]
```

---

## 보안 사항

| 항목            | 상태                        |
| --------------- | --------------------------- |
| HTTPS 자동 적용 | ✅                          |
| API 직접 노출   | ❌ (Vite proxy 경유)        |
| Admin 패널 노출 | ❌ (포함 안 됨)             |
| JWT 인증        | ✅ (모든 API)               |
| Rate Limiting   | ✅ (로그인 5회/분)          |
| 실 데이터 노출  | ✅ 더미 데이터 교체 후 사용 |

---

## 주의사항

- **URL은 터널 재시작마다 변경됩니다** (trycloudflare.com 무료 한계)
- 고정 URL이 필요하면 Cloudflare Named Tunnel 설정 필요 (도메인 필요)
- 터널 사용 중에는 `./scripts/tunnel.sh status`로 상태 모니터링 권장
- 테스트 완료 후 반드시 `./scripts/tunnel.sh stop` 으로 종료

---

## 터널 종료 후 개발 서버 복구

터널 종료 시 서버는 계속 실행 중이므로 별도 재시작 불필요.
테스트 데이터 초기화 원할 시:

```bash
./scripts/seed-test-env.sh
```
