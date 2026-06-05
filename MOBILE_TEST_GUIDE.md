# AutiCare 모바일 테스트 가이드

> 작성일: 2026-06-05
> 전제 조건: EC2 보안 정책상 0.0.0.0 바인딩 불가 → 터널링으로 외부 접속

---

## 현재 환경

```
EC2 서버
├── API       : http://localhost:3100/v1  (외부 접속 불가)
├── Mobile Web: http://localhost:8081     (외부 접속 불가)
└── Admin     : http://localhost:4300     (외부 접속 불가)

모바일 앱 방식: Expo Web Export (정적 빌드 → 포트 8081 서빙)
API URL 설정 : apps/mobile/app.config.ts → extra.apiUrl
              기본값: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3100/v1'
```

---

## 방법 1. Cloudflare Tunnel — 웹 브라우저 테스트 (무료 ⭐)

설치 및 로그인 불필요. 가장 빠르게 시작 가능.

### 설치

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 실행

```bash
# 터미널 1: API 터널
cloudflared tunnel --url http://localhost:3100
# → https://xxxx-xxxx.trycloudflare.com 발급 (API URL로 사용)

# 터미널 2: 모바일 웹 터널
cloudflared tunnel --url http://localhost:8081
# → https://yyyy-yyyy.trycloudflare.com 발급 (폰에서 접속할 URL)
```

### API URL 반영 후 모바일 재빌드

```bash
# API 터널 URL을 환경변수에 적용 후 재빌드
EXPO_PUBLIC_API_URL=https://xxxx-xxxx.trycloudflare.com/v1 \
  ./scripts/restart-mobile.sh
```

### 폰에서 접속

```
Chrome / Safari에서:
https://yyyy-yyyy.trycloudflare.com
```

**특징**
| 항목 | 내용 |
|------|------|
| 비용 | 무료 |
| URL | 실행마다 변경 |
| 제한 | 없음 |
| 네이티브 기능 | 푸시 알림 등 일부 미작동 (웹 빌드 한계) |

---

## 방법 2. ngrok — 웹 브라우저 테스트 (URL 고정 가능)

### 설치

```bash
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# 무료 계정 토큰 등록 (https://ngrok.com 가입 후)
ngrok config add-authtoken <YOUR_TOKEN>
```

### 실행

```bash
# 터미널 1: API 터널
ngrok http 3100
# → https://abc123.ngrok.io

# 터미널 2: 모바일 웹 터널
ngrok http 8081
# → https://xyz456.ngrok.io
```

### API URL 반영 후 모바일 재빌드

```bash
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io/v1 \
  ./scripts/restart-mobile.sh
```

### 폰에서 접속

```
https://xyz456.ngrok.io
```

**특징**
| 항목 | 내용 |
|------|------|
| 비용 | 무료 (URL 매번 변경) / $20/월 (URL 고정) |
| URL | 무료 플랜은 재시작마다 변경 |
| 제한 | 무료 플랜 월 1GB |
| 네이티브 기능 | 웹 빌드이므로 동일하게 일부 미작동 |

---

## 방법 3. Expo Go + tunnel 모드 — 네이티브에 가까운 테스트

실제 네이티브 앱처럼 실행. 푸시 알림 등 네이티브 기능 테스트 가능.

### 폰에 Expo Go 설치

- **Android**: [Play Store — Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store — Expo Go](https://apps.apple.com/app/expo-go/id982107779)

### EC2에서 개발 서버 실행

```bash
# ngrok으로 API 먼저 터널 (방법 2 참조)
# API 터널 URL 확인 후:

cd /home/ec2-user/workspace/ASD/auticare/apps/mobile

EXPO_PUBLIC_API_URL=https://abc123.ngrok.io/v1 \
  npx expo start --tunnel
```

### 폰에서 연결

- **Android**: Expo Go 앱 실행 → QR 코드 스캔
- **iOS**: 기본 카메라 앱으로 QR 코드 스캔 → Expo Go로 열기

**특징**
| 항목 | 내용 |
|------|------|
| 비용 | 무료 |
| 네이티브 기능 | 대부분 작동 (SecureStore, Notifications 등) |
| 속도 | 핫 리로드 지원, 개발 중 편리 |
| 제한 | expo-notifications 일부 제한 |

---

## 방법 4. EAS Build APK — 정식 앱처럼 설치 (Android)

진짜 앱처럼 설치. 가장 실제 환경에 가까운 테스트.

### 준비

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인 (https://expo.dev 무료 가입)
eas login
```

### eas.json 설정 확인/생성

```bash
# apps/mobile/eas.json 이 없으면 생성
cd /home/ec2-user/workspace/ASD/auticare/apps/mobile
eas build:configure
```

`apps/mobile/eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://abc123.ngrok.io/v1"
      }
    }
  }
}
```

### 빌드 실행

```bash
cd /home/ec2-user/workspace/ASD/auticare/apps/mobile
eas build --platform android --profile preview
```

빌드 완료(10~15분) 후 **APK 다운로드 URL** 발급 → 폰에서 설치

### 폰 설정 (최초 1회)

```
Android 설정 → 보안 → 출처를 알 수 없는 앱 → 허용
```

**특징**
| 항목 | 내용 |
|------|------|
| 비용 | 무료 (월 30빌드 제한) |
| 빌드 시간 | 10~15분 |
| 네이티브 기능 | 전체 작동 |
| 배포 | 링크 공유로 여러 기기 테스트 가능 |
| iOS | Apple Developer Program 필요 ($99/년) |

---

## 방법 비교 요약

| 방법              | 난이도    | 비용     | 네이티브 기능 | 추천 상황           |
| ----------------- | --------- | -------- | ------------- | ------------------- |
| Cloudflare Tunnel | ⭐ 쉬움   | 무료     | ❌ 웹 수준    | 빠른 UI 확인        |
| ngrok             | ⭐ 쉬움   | 무료~$20 | ❌ 웹 수준    | URL 고정 필요 시    |
| Expo Go + tunnel  | ⭐⭐ 보통 | 무료     | ✅ 대부분     | 개발 중 기능 테스트 |
| EAS Build APK     | ⭐⭐ 보통 | 무료     | ✅ 전체       | 실제 앱 테스트      |

---

## 추천 순서

```
Step 1. Cloudflare Tunnel
        → 빠르게 UI/UX 확인

Step 2. Expo Go + tunnel
        → 푸시 알림, SecureStore 등 네이티브 기능 테스트

Step 3. EAS Build APK
        → 최종 검증, 지인 베타 테스트
```

---

## 참고: API URL 변경 시 재빌드 필요

```bash
# API 터널 URL이 바뀌면 모바일 웹도 재빌드 필요
EXPO_PUBLIC_API_URL=https://새URL/v1 ./scripts/restart-mobile.sh

# EAS Build는 빌드 시점 URL이 고정됨
# → API를 고정 URL(ngrok 유료 or Cloudflare Named Tunnel)로 설정 권장
```
