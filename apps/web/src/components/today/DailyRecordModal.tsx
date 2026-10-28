import { useEffect, useState } from 'react';
import {
  DAILY_RECORD_DOMAINS,
  useCreateDailyRecord,
  useFreeformAvailability,
  type BehaviorContext,
  type CreateDailyRecordInput,
  type DailyRecordDomain,
  type DailyRecordSummary,
} from '../../hooks/use-daily-record';
import { DAILY_SESSION_TYPES, sessionTypeLabel } from '../../utils/session-type';
import { FreeformPanel } from './FreeformPanel';
import { BehaviorContextPicker } from './BehaviorContextPicker';
import { clearDraft, loadDraft, saveDraft } from '../../utils/record-draft';

/** 마지막으로 쓴 입력 방식 (쭉 적기 · 자세히 입력) */
const MODE_KEY = 'auticare.recordMode';
type Mode = 'freeform' | 'detailed';

interface DetailedDraft {
  scores: Partial<Record<DailyRecordDomain, number>>;
  note: string;
  sessionOn: boolean;
  sessionType: string | null;
  therapistFeedback: string;
  behaviorOn: boolean;
  severity: number;
  behaviorTags: string[];
  behaviorContent: string;
}

function savedMode(): Mode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'freeform' || v === 'detailed' ? v : null;
  } catch {
    return null;
  }
}

const SCORE_COLORS = ['#E88B8B', '#F0A86E', '#F5D76E', '#A8D8A8', '#7BC67E'];
const BEHAVIOR_TAGS = ['멜트다운', '공격', '자해', '탈주', '상동행동', '발작', '기타'];

interface Props {
  childId: string;
  today?: DailyRecordSummary;
  onClose: () => void;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 px-3.5 rounded-full text-[13px] ${
        active
          ? 'border-2 border-primary-500 bg-primary-50 text-primary-800 font-bold'
          : 'border border-neutral-200 bg-white text-neutral-800 hover:border-primary-300'
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-[#D9D4CC]'}`}
    >
      <span
        className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all ${checked ? 'right-[3px]' : 'left-[3px]'}`}
      />
    </button>
  );
}

export function DailyRecordModal({ childId, today, onClose }: Props) {
  const createRecord = useCreateDailyRecord();
  const availability = useFreeformAvailability(childId);
  const [mode, setMode] = useState<Mode | null>(null);

  // 기본은 쭉 적기. 마지막으로 쓴 방식을 기억하고, AI 를 못 쓰는 날은 자세히 입력
  useEffect(() => {
    // 아이 선택 전이거나 아직 확인 중이면 기다림 (isPending: 아직 결과 없음)
    if (mode !== null || availability.isPending) return;
    const available = availability.data?.available ?? false;
    setMode(!available ? 'detailed' : (savedMode() ?? 'freeform'));
  }, [mode, availability.isPending, availability.data?.available]);

  function switchMode(next: Mode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // 저장 못 해도 이번 창에서는 바뀜
    }
  }
  // 창이 닫혀도 적던 내용이 남도록 (저장하면 지움)
  const [draft] = useState(() => loadDraft<DetailedDraft>('detailed', childId));
  const [scores, setScores] = useState<Partial<Record<DailyRecordDomain, number>>>(
    draft?.scores ?? {},
  );
  const [note, setNote] = useState(draft?.note ?? '');
  const [sessionOn, setSessionOn] = useState(draft?.sessionOn ?? false);
  const [sessionType, setSessionType] = useState<string | null>(draft?.sessionType ?? null);
  const [therapistFeedback, setTherapistFeedback] = useState(draft?.therapistFeedback ?? '');
  const [behaviorOn, setBehaviorOn] = useState(draft?.behaviorOn ?? false);
  const [severity, setSeverity] = useState(draft?.severity ?? 3);
  const [behaviorTags, setBehaviorTags] = useState<string[]>(draft?.behaviorTags ?? []);
  const [behaviorContent, setBehaviorContent] = useState(draft?.behaviorContent ?? '');
  const [behaviorContext, setBehaviorContext] = useState<BehaviorContext>({});

  useEffect(() => {
    saveDraft('detailed', childId, {
      scores,
      note,
      sessionOn,
      sessionType,
      therapistFeedback,
      behaviorOn,
      severity,
      behaviorTags,
      behaviorContent,
    } satisfies DetailedDraft);
  }, [
    childId,
    scores,
    note,
    sessionOn,
    sessionType,
    therapistFeedback,
    behaviorOn,
    severity,
    behaviorTags,
    behaviorContent,
  ]);
  const alreadyScored = !!today?.scores;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (sessionOn && !sessionType) return alert('어떤 수업이었는지 골라주세요');
    if (behaviorOn && !behaviorContent.trim())
      return alert('어떤 일이 있었는지 한 줄만 적어주세요');

    const input: CreateDailyRecordInput = {
      scores,
      note: note.trim() || undefined,
      session:
        sessionOn && sessionType
          ? { sessionType, therapistFeedback: therapistFeedback.trim() || undefined }
          : undefined,
      behavior: behaviorOn
        ? { severity, tags: behaviorTags, content: behaviorContent.trim(), ...behaviorContext }
        : undefined,
    };
    if (Object.keys(scores).length === 0 && !input.note && !input.session && !input.behavior) {
      return alert('하나 이상 기록해주세요');
    }
    try {
      await createRecord.mutateAsync({ childId, input });
      clearDraft('detailed', childId);
      onClose();
    } catch {
      alert('저장하지 못했어요. 다시 시도해주세요.');
    }
  }

  const dateLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(44,62,80,0.45)] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="오늘 하루 기록"
        className="bg-white rounded-2xl w-full max-w-[760px] max-h-[92vh] flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-16 flex items-center gap-5 px-7 border-b border-neutral-200 shrink-0">
          <h2 className="text-lg font-bold text-neutral-800">오늘 하루 기록 · {dateLabel}</h2>
          <div
            role="tablist"
            aria-label="기록 방식"
            data-tour="record-mode"
            className="flex bg-[#EFECE7] rounded-[10px] p-[3px] gap-[3px]"
          >
            {(
              [
                ['freeform', '쭉 적기'],
                ['detailed', '자세히 입력'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => switchMode(key)}
                className={`h-[34px] px-4 rounded-lg text-sm ${
                  mode === key
                    ? 'bg-white font-bold text-primary-800 shadow-sm'
                    : 'text-neutral-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-10 h-10 flex items-center justify-center text-neutral-700"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {mode === null ? (
          <div className="flex-1 flex items-center justify-center py-20 text-sm text-neutral-500">
            불러오는 중…
          </div>
        ) : mode === 'freeform' ? (
          <div data-tour="record-body" className="flex-1 min-h-0 flex flex-col">
            <FreeformPanel
              childId={childId}
              unavailableReason={
                availability.data && !availability.data.available
                  ? availability.data.reason
                  : undefined
              }
              onClose={onClose}
            />
          </div>
        ) : (
          <div data-tour="record-body" className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-tour="record-scores" className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-[15px] font-bold text-neutral-800">
                      오늘 아이는 어땠나요?
                    </h3>
                    {!alreadyScored && (
                      <span className="text-xs text-neutral-500">
                        1 힘들었어요 · 5 아주 좋았어요
                      </span>
                    )}
                  </div>
                  {alreadyScored ? (
                    <div className="flex flex-wrap gap-1.5">
                      {DAILY_RECORD_DOMAINS.filter((d) => today?.scores?.[d.key] !== undefined).map(
                        (d) => (
                          <span
                            key={d.key}
                            className="text-[13px] px-2.5 py-1 rounded-full bg-primary-50 text-primary-700"
                          >
                            {d.label} {today?.scores?.[d.key]}
                          </span>
                        ),
                      )}
                      <p className="text-xs text-neutral-500 w-full mt-1">
                        오늘 체크를 이미 했어요. 오른쪽과 아래 내용만 더 적을 수 있어요.
                      </p>
                    </div>
                  ) : (
                    DAILY_RECORD_DOMAINS.map((d) => (
                      <div key={d.key} className="flex items-center gap-2">
                        <span className="w-[60px] text-sm text-neutral-800">{d.label}</span>
                        <div className="flex-1 grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const active = scores[d.key] === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                aria-label={`${d.label} ${n}점`}
                                aria-pressed={active}
                                onClick={() =>
                                  setScores((prev) => {
                                    const next = { ...prev };
                                    if (next[d.key] === n) delete next[d.key];
                                    else next[d.key] = n;
                                    return next;
                                  })
                                }
                                className={`h-[38px] rounded-[10px] text-sm text-neutral-800 ${
                                  active
                                    ? 'border-2 border-neutral-800 font-bold'
                                    : 'border border-neutral-200 bg-white hover:border-primary-300'
                                }`}
                                style={
                                  active ? { backgroundColor: SCORE_COLORS[n - 1] } : undefined
                                }
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <label className="flex flex-col gap-2 text-[15px] font-bold text-neutral-800">
                  오늘 있었던 일 (선택)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    placeholder="예: 마트에서 '과자' 하고 처음으로 말했어요"
                    className="flex-1 min-h-[180px] rounded-xl border border-neutral-200 bg-[#FDFBF7] p-3 text-sm font-normal text-neutral-800 resize-none placeholder:text-neutral-500"
                  />
                </label>
              </div>

              <div data-tour="record-extra" className="flex flex-col gap-4">
                <div className="border border-neutral-200 rounded-2xl px-[18px] py-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[15px] font-bold text-neutral-800">
                      오늘 센터 수업이 있었나요?
                    </h3>
                    <Toggle
                      checked={sessionOn}
                      onChange={setSessionOn}
                      label="오늘 센터 수업 여부"
                    />
                  </div>
                  {sessionOn && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {DAILY_SESSION_TYPES.map((t) => (
                          <Chip
                            key={t}
                            label={sessionTypeLabel(t)}
                            active={sessionType === t}
                            onClick={() => setSessionType(t)}
                          />
                        ))}
                      </div>
                      <label className="flex flex-col gap-1.5 text-[13px] text-neutral-600">
                        선생님이 해주신 말씀
                        <input
                          type="text"
                          value={therapistFeedback}
                          onChange={(e) => setTherapistFeedback(e.target.value)}
                          maxLength={1000}
                          placeholder="예: 요구하기 2번 성공, 집에서 '더' 연습"
                          className="h-10 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm text-neutral-800 placeholder:text-neutral-500"
                        />
                      </label>
                    </>
                  )}
                </div>

                <div className="border border-neutral-200 rounded-2xl px-[18px] py-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[15px] font-bold text-neutral-800">
                      힘든 행동이 있었나요?
                    </h3>
                    <Toggle checked={behaviorOn} onChange={setBehaviorOn} label="힘든 행동 여부" />
                  </div>
                  {behaviorOn && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {BEHAVIOR_TAGS.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            active={behaviorTags.includes(tag)}
                            onClick={() =>
                              setBehaviorTags((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                              )
                            }
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-neutral-600">
                        얼마나 힘들었나요? (1 조금 · 5 매우)
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Chip
                            key={n}
                            label={String(n)}
                            active={severity === n}
                            onClick={() => setSeverity(n)}
                          />
                        ))}
                      </div>
                      <label className="sr-only" htmlFor="behavior-content">
                        어떤 일이 있었나요
                      </label>
                      <input
                        id="behavior-content"
                        type="text"
                        value={behaviorContent}
                        onChange={(e) => setBehaviorContent(e.target.value)}
                        maxLength={1000}
                        placeholder="예: 마트에서 20분 울었어요. 안아주니 진정했어요"
                        className="h-10 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm text-neutral-800 placeholder:text-neutral-500"
                      />
                      <BehaviorContextPicker
                        value={behaviorContext}
                        onChange={setBehaviorContext}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-7 py-4 border-t border-neutral-200 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-6 rounded-xl border border-neutral-200 text-[15px] text-neutral-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={createRecord.isPending}
                className="h-12 px-7 rounded-xl bg-primary-700 text-white text-[15px] font-bold disabled:opacity-60"
              >
                {createRecord.isPending ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
