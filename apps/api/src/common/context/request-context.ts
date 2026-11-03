import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  userId?: string;
  /** 로그인한 사용자의 가족 (처음 물어볼 때 한 번만 DB 조회) */
  resolveFamilyId?: () => Promise<string | null>;
}

/**
 * 요청 하나 동안 이어지는 정보 (비동기 작업 안에서도 유지).
 * AI 사용량을 어느 가족 것인지 기록할 때 씀
 */
export const requestContext = new AsyncLocalStorage<RequestContextStore>();
