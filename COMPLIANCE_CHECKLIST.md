# Phase 5 법적 컴플라이언스 감사 체크리스트

> 감사일: 2026-06-08
> 감사자: AutiCare Dev Team (AI 지원)

---

## 1. 개인정보 처리 (개인정보보호법 PIPA)

| 항목                    | 상태 | 근거                                                                                  |
| ----------------------- | ---- | ------------------------------------------------------------------------------------- |
| 아이 이름 암호화        | ✅   | `Child.nameEnc` + AES-256-GCM, `EncryptionService`                                    |
| 아이 생년월일 암호화    | ✅   | `Child.birthDateEnc` + AES-256-GCM                                                    |
| PII 직접 select 금지    | ✅   | 모든 컨트롤러 복호화 후 반환, 직접 raw 필드 노출 없음                                 |
| 데이터 내보내기(이동권) | ✅   | `GET /v1/users/me/export` (GDPR Export) - 모바일/웹 모두 구현                         |
| 계정 삭제 시 cascade    | ✅   | Prisma schema: `onDelete: Cascade` (User → Family → Child → Assessment 등)            |
| 법적 동의 기록          | ✅   | `LegalConsent` 모델: userId, type, version, IP, userAgent, timestamp, documentContent |

---

## 2. 라이선스 도구 동의 흐름

| 도구       | 동의서 버전 | consentType 키                 | 문서 스냅샷 저장 |
| ---------- | ----------- | ------------------------------ | ---------------- |
| M-CHAT-R/F | 1.0         | `LICENSED_TOOL_USE_M_CHAT_R_F` | ✅               |
| CARS-2     | 1.0         | `LICENSED_TOOL_USE_CARS_2`     | ✅               |
| ABC        | 1.0         | `LICENSED_TOOL_USE_ABC`        | ✅               |

동의 기록에 포함되는 정보:

- `userId` — 누가 동의했는지
- `consentVersion` — 어떤 버전의 동의서인지
- `documentContent` — 동의 당시 표시된 실제 문서 내용 (스냅샷)
- `ipAddress` — 동의 시점 IP 주소
- `userAgent` — 브라우저/앱 정보
- `consentedAt` — 동의 타임스탬프

---

## 3. 라이선스 키 보안

| 항목                    | 상태 | 근거                                                          |
| ----------------------- | ---- | ------------------------------------------------------------- |
| 원본 라이선스 키 미저장 | ✅   | SHA-256 해시만 `License.keyHash`에 저장                       |
| 가족당 도구별 1개 제한  | ✅   | `@@unique([tool, familyId])` 유니크 제약                      |
| Admin 전용 접근         | ✅   | `@Roles(UserRole.SYSTEM_ADMIN)` 데코레이터                    |
| 만료 자동 처리          | ✅   | `expireStale()` — 읽기 시점에 만료 라이선스 자동 EXPIRED 처리 |

---

## 4. 감사 로그

| 항목                    | 상태 | 근거                                          |
| ----------------------- | ---- | --------------------------------------------- |
| 사용자 행동 감사        | ✅   | `AuditLog` 모델, `AuditInterceptor` 전역 적용 |
| 라이선스 등록/취소 로그 | ✅   | Admin 작업은 AuditLog 자동 기록               |
| AI 사용 추적            | ✅   | `AiConfig` 기반 일일 예산 제한 및 사용량 추적 |

---

## 5. 보안 (P5-015 감사 결과)

| 항목                     | 상태 | 비고                                                               |
| ------------------------ | ---- | ------------------------------------------------------------------ |
| Helmet 보안 헤더         | ✅   | CSP, XSS-Protection, HSTS 적용                                     |
| Rate Limiting            | ✅   | ThrottlerModule (전역 100req/min, auth 5req/min)                   |
| JWT 토큰 검증            | ✅   | JwtAuthGuard 전역, 만료/재사용 감지                                |
| CORS 제한                | ✅   | CORS_ORIGINS 환경변수로 허용 도메인 제한                           |
| 입력 데이터 검증         | ✅   | Zod 스키마 + ZodValidationPipe 전역                                |
| **Critical** — vitest UI | ⚠️   | 개발 도구 전용, 프로덕션 미영향. vitest ≥4.1.0으로 업그레이드 권고 |
| High — @nx/devkit/tmp    | ℹ️   | 빌드 도구 의존성, 프로덕션 코드 미포함                             |

---

## 6. 데이터 보존 정책

| 데이터             | 보존                  | 메모                                 |
| ------------------ | --------------------- | ------------------------------------ |
| 연구 자료          | 90일 후 자동 아카이브 | `archiveOldArticlesForAllFamilies()` |
| 라이선스 동의 기록 | 영구 보존             | 법적 근거 필요                       |
| 평가 기록          | 영구 보존             | 아동 발달 이력                       |
| 감사 로그          | 영구 보존             | 컴플라이언스                         |

---

## 7. 운영 전 조치 사항

- [ ] 실제 도구 라이선스 구매 후 `CONSENT_DOCUMENTS` 내용 교체 (현재 데모 텍스트)
- [ ] 개인정보처리방침 v1.0 + 이용약관 v1.0 실제 문서 등록
- [ ] 국내 서버 저장 요건 확인 (의료/민감정보)
- [ ] Apple Developer Program + Google Play Console 등록
- [ ] FCM 프로젝트 키 설정 (알림 활성화)
- [ ] vitest ≥4.1.0 업그레이드
