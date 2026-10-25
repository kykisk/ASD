import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 오늘 하루 기록 임시 저장: 화면을 나가도 적던 내용이 남도록 보관하고, 저장하면 지운다.
 * 아이 · 날짜(KST)별로 따로 보관해 다음 날이나 다른 아이 기록에 섞이지 않게 함.
 */
const kstDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

type Kind = 'freeform' | 'detailed';

const key = (kind: Kind, childId: string) => `auticare.recordDraft.${kind}.${childId}.${kstDate()}`;

export async function loadDraft<T>(kind: Kind, childId: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(kind, childId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(kind: Kind, childId: string, value: unknown): void {
  AsyncStorage.setItem(key(kind, childId), JSON.stringify(value)).catch(() => undefined);
}

export function clearDraft(kind: Kind, childId: string): void {
  AsyncStorage.removeItem(key(kind, childId)).catch(() => undefined);
}
