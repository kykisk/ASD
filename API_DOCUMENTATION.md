# AutiCare Phase 5 — API 문서

> 버전: Phase 5 (Licensing)
> Base URL: `https://your-domain.com/v1`
> 인증: `Authorization: Bearer <JWT>` (모든 엔드포인트 필수, @Public 제외)

---

## 라이선스 관리 (Admin 전용)

### POST /admin/licenses

라이선스 키 등록 + 가족용 질문지 자동 생성

**권한**: SYSTEM_ADMIN

**Request Body**

```json
{
  "tool": "M_CHAT_R_F | CARS_2 | ABC | ADOS_2 | SCQ",
  "licenseKey": "string (SHA-256 해시 저장됨, 원본 미저장)",
  "familyId": "string",
  "expiresAt": "2027-01-01T00:00:00.000Z (optional)",
  "notes": "string (optional)"
}
```

**Response**: `{ id, tool, status: "ACTIVE", familyId, activatedAt, expiresAt, notes }`

---

### GET /admin/licenses

전체 라이선스 목록 조회

**Query**: `page` (default 1), `limit` (default 20)

**Response**: `{ items: License[], total, page, limit }`

---

### PATCH /admin/licenses/:id/activate

라이선스 활성화 (REVOKED/EXPIRED → ACTIVE)

---

### PATCH /admin/licenses/:id/revoke

라이선스 취소 (ACTIVE → REVOKED)

---

### DELETE /admin/licenses/:id

라이선스 삭제 (비가역)

---

## 라이선스 조회 (가족)

### GET /families/:familyId/licenses

내 가족의 전체 라이선스 목록

**Response**: `License[]`

---

### GET /families/:familyId/licenses/:tool

특정 도구 라이선스 유효 여부

**Response**: `{ tool: string, hasLicense: boolean }`

---

## 채점 (P5-006)

### POST /assessments/:assessmentId/score

평가 결과 채점 + interpretation 생성

**Response**

```json
{
  "tool": "CARS_2",
  "totalScore": 42,
  "maxPossibleScore": 60,
  "severity": "SEVERE | MILD_MODERATE | NON_AUTISTIC | LOW_RISK | MEDIUM_RISK | HIGH_RISK | SIGNIFICANT | WITHIN_RANGE",
  "interpretation": "중증 (42점): 중증 자폐 스펙트럼 장애 해당",
  "clinicalDescription": "...",
  "recommendations": ["권고사항 1", "권고사항 2"],
  "subscaleScores": { "SOCIAL": 9, "COGNITIVE": 14 },
  "subscaleInterpretations": { "사회적 상호작용": "..." }
}
```

---

## 법적 동의 (P5-004)

### GET /consent/tool/:tool/document

도구별 동의서 원문 조회 (동의 전 표시용)

**Params**: `tool` = M_CHAT_R_F | CARS_2 | ABC | ADOS_2 | SCQ

**Response**: `{ title, version, content }`

---

### POST /consent/tool/:tool

도구 동의 기록 (문서 스냅샷 포함 저장)

**Response**: `LegalConsent`

---

### GET /consent/tool/:tool/check

현재 버전 동의 여부 확인

**Response**: `{ tool, consented: boolean }`

---

## 공통 응답 형식

### 성공

```json
{ "success": true, "data": T }
```

### 오류

```json
{
  "success": false,
  "error": { "code": "LICENSE_001", "message": "오류 메시지" },
  "timestamp": "2026-06-08T00:00:00.000Z",
  "path": "/v1/...",
  "requestId": "uuid"
}
```

### 주요 에러 코드

| 코드       | HTTP | 설명                 |
| ---------- | ---- | -------------------- |
| AUTH_001   | 401  | 이메일/비밀번호 오류 |
| AUTH_006   | 403  | 권한 없음            |
| SYSTEM_001 | 500  | 서버 내부 오류       |
