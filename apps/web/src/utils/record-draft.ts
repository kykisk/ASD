/**
 * 오늘 하루 기록 임시 저장: 창이 닫혀도 적던 내용이 남도록 브라우저에 보관하고, 저장하면 지운다.
 * 아이 · 날짜(KST)별로 따로 보관해 다음 날이나 다른 아이 기록에 섞이지 않게 함.
 */
const kstDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const key = (kind: 'freeform' | 'detailed', childId: string) =>
  `auticare.recordDraft.${kind}.${childId}.${kstDate()}`;

export function loadDraft<T>(kind: 'freeform' | 'detailed', childId: string): T | null {
  try {
    const raw = localStorage.getItem(key(kind, childId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(kind: 'freeform' | 'detailed', childId: string, value: unknown): void {
  try {
    localStorage.setItem(key(kind, childId), JSON.stringify(value));
  } catch {
    // 보관을 못 해도 쓰는 데는 지장 없음
  }
}

export function clearDraft(kind: 'freeform' | 'detailed', childId: string): void {
  try {
    localStorage.removeItem(key(kind, childId));
  } catch {
    // 무시
  }
}
