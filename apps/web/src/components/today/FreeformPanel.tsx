import { useState } from 'react';
import {
  DAILY_RECORD_DOMAINS,
  useAnalyzeFreeform,
  useConfirmFreeform,
  type DailyRecordDomain,
  type FreeformDraft,
  type FreeformQuestion,
} from '../../hooks/use-daily-record';
import { DAILY_SESSION_TYPES, sessionTypeLabel } from '../../utils/session-type';

const SCORE_COLORS = ['#E88B8B', '#F0A86E', '#F5D76E', '#A8D8A8', '#7BC67E'];
/** 힘든 정도는 클수록 힘듦 → 색을 거꾸로 */
const SEVERITY_COLORS = [...SCORE_COLORS].reverse();
const BEHAVIOR_TAGS = ['멜트다운', '공격', '자해', '탈주', '상동행동', '발작', '기타'];

interface Props {
  childId: string;
  /** AI 를 지금 못 쓰면 이유 (그래도 적으면 메모로 저장됨) */
  unavailableReason?: string;
  onClose: () => void;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response
    ?.data?.error?.message;
  return message ?? fallback;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 px-3 rounded-full text-[13px] ${
        active
          ? 'border-2 border-primary-500 bg-primary-50 text-primary-800 font-bold'
          : 'border border-neutral-200 bg-white text-neutral-800 hover:border-primary-300'
      }`}
    >
      {label}
    </button>
  );
}

function Scale({
  label,
  value,
  onChange,
  severity = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  severity?: boolean;
}) {
  const palette = severity ? SEVERITY_COLORS : SCORE_COLORS;
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n}`}
            aria-pressed={active}
            onClick={() => onChange(active ? undefined : n)}
            className={`w-10 h-9 rounded-[10px] text-sm text-neutral-800 ${
              active
                ? 'border-2 border-neutral-800 font-bold'
                : 'border border-neutral-200 bg-white hover:border-primary-300'
            }`}
            style={active ? { backgroundColor: palette[n - 1] } : undefined}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 쭉 적기 (PC): 왼쪽에 하루 이야기, 오른쪽에 AI 정리 결과와 추가 질문을 나란히.
 * 부모가 확인하고 저장해야 기록된다. AI 를 못 쓰면 서버가 원문을 일상 메모로 저장한다.
 */
export function FreeformPanel({ childId, unavailableReason, onClose }: Props) {
  const analyze = useAnalyzeFreeform();
  const confirm = useConfirmFreeform();

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failedReason, setFailedReason] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<FreeformDraft['scores']>({});
  const [questions, setQuestions] = useState<FreeformQuestion[]>([]);
  const [scores, setScores] = useState<Partial<Record<DailyRecordDomain, number>>>({});
  const [note, setNote] = useState('');
  const [sessions, setSessions] = useState<FreeformDraft['sessions']>([]);
  const [behaviors, setBehaviors] = useState<FreeformDraft['behaviors']>([]);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});

  async function handleAnalyze() {
    setError(null);
    if (text.trim().length < 5) return setError('조금만 더 적어주세요');
    try {
      const result = await analyze.mutateAsync({ childId, text: text.trim() });
      if (result.status === 'FAILED') {
        setFailedReason(result.reason);
        return;
      }
      setEntryId(result.entryId);
      setReasons(result.draft.scores);
      setScores(
        Object.fromEntries(
          Object.entries(result.draft.scores).map(([k, v]) => [k, v?.score]),
        ) as Partial<Record<DailyRecordDomain, number>>,
      );
      setNote(result.draft.note ?? '');
      setSessions(result.draft.sessions);
      setBehaviors(result.draft.behaviors);
      setQuestions(result.questions);
      setAnswers({});
    } catch (err) {
      setError(apiErrorMessage(err, '정리하지 못했어요. 다시 시도해주세요.'));
    }
  }

  async function handleSave() {
    if (!entryId) return;
    setError(null);
    try {
      await confirm.mutateAsync({
        childId,
        entryId,
        input: {
          scores,
          note: note.trim() || undefined,
          sessions: sessions.map((s) => ({
            sessionType: s.sessionType,
            therapistFeedback: s.therapistFeedback?.trim() || undefined,
          })),
          behaviors: behaviors.filter((b) => b.content.trim()),
          answers: Object.entries(answers)
            .map(([index, value]) => ({
              index: Number(index),
              value: typeof value === 'string' ? value.trim() : value,
            }))
            .filter((a) => a.value !== ''),
        },
      });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, '저장하지 못했어요. 다시 시도해주세요.'));
    }
  }

  const updateSession = (i: number, patch: Partial<FreeformDraft['sessions'][number]>) =>
    setSessions((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const updateBehavior = (i: number, patch: Partial<FreeformDraft['behaviors'][number]>) =>
    setBehaviors((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <>
      <div className="flex-1 overflow-y-auto px-7 py-5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-7">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="freeform-text" className="text-[15px] font-bold text-neutral-800">
            오늘 하루를 편하게 적어주세요
          </label>
          <p className="text-[13px] text-neutral-500 -mt-1">
            순서도 형식도 상관없어요. AI가 정리하고, 저장하기 전에 보여드려요.
          </p>
          {unavailableReason && (
            <p className="text-[13px] text-[#8A4B14] bg-[#FDF0E6] rounded-xl px-3 py-2">
              {unavailableReason}. 지금 적으면 일상 메모로 저장되고, AI 정리는 나중에 해요.
            </p>
          )}
          <textarea
            id="freeform-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
            disabled={!!failedReason}
            placeholder="예: 언어치료에서 처음으로 '물 주세요' 했대요. 저녁엔 마트에서 10분쯤 울었어요."
            className="flex-1 min-h-[300px] rounded-xl border border-neutral-200 bg-[#FDFBF7] p-3.5 text-[15px] leading-relaxed text-neutral-800 resize-none placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyze.isPending || !!failedReason}
            className="h-11 rounded-xl border border-primary-500 bg-primary-50 text-[15px] font-bold text-primary-800 disabled:opacity-60"
          >
            {analyze.isPending
              ? '정리하는 중… 잠시만요'
              : entryId
                ? '다시 정리하기'
                : '✨ AI로 정리하기'}
          </button>
          <p className="text-xs text-neutral-500">
            정리가 안 되어도 적은 내용은 그대로 저장돼요. 원문은 기록에 보관돼요.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          {failedReason ? (
            <div className="rounded-2xl bg-[#F4F1EC] p-5 flex flex-col gap-2">
              <h3 className="text-[15px] font-bold text-neutral-800">적어주신 내용은 저장했어요</h3>
              <p className="text-sm text-neutral-700 leading-relaxed">
                {failedReason}. 오늘 있었던 일은 일상 메모로 남겼고, 영역 점수는 밤사이 AI가 다시
                정리해요.
              </p>
            </div>
          ) : !entryId ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 leading-relaxed">
              왼쪽에 적고 <b>AI로 정리하기</b>를 누르면 여기에 영역 점수 · 수업 · 힘든 행동으로
              정리돼요.
              <br />
              틀린 곳은 바로 고칠 수 있어요.
            </div>
          ) : (
            <>
              <div className="flex justify-between items-baseline">
                <h3 className="text-[15px] font-bold text-neutral-800">AI가 정리했어요</h3>
                <span className="text-xs text-neutral-500">눌러서 고칠 수 있어요</span>
              </div>
              <div className="flex flex-col gap-2">
                {DAILY_RECORD_DOMAINS.map((d) => (
                  <div key={d.key} className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="w-[60px] text-sm text-neutral-800">{d.label}</span>
                      <Scale
                        label={d.label}
                        value={scores[d.key]}
                        onChange={(n) => setScores((prev) => ({ ...prev, [d.key]: n }))}
                      />
                    </div>
                    <span className="pl-[72px] text-xs text-neutral-500">
                      {scores[d.key] === undefined
                        ? '오늘 글에는 없었어요'
                        : reasons[d.key]?.reason}
                    </span>
                  </div>
                ))}
              </div>

              {sessions.map((s, i) => (
                <div
                  key={`s${i}`}
                  className="border border-neutral-200 rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-800">센터 수업</span>
                    <button
                      type="button"
                      onClick={() => setSessions((prev) => prev.filter((_, j) => j !== i))}
                      className="text-[13px] text-primary-700"
                    >
                      빼기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DAILY_SESSION_TYPES.map((t) => (
                      <Chip
                        key={t}
                        label={sessionTypeLabel(t)}
                        active={s.sessionType === t}
                        onClick={() => updateSession(i, { sessionType: t })}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    aria-label="선생님이 해주신 말씀"
                    value={s.therapistFeedback ?? ''}
                    onChange={(e) => updateSession(i, { therapistFeedback: e.target.value })}
                    maxLength={1000}
                    className="h-10 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm text-neutral-800"
                  />
                </div>
              ))}

              {behaviors.map((b, i) => (
                <div
                  key={`b${i}`}
                  className="border border-neutral-200 rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-800">힘든 행동</span>
                    <button
                      type="button"
                      onClick={() => setBehaviors((prev) => prev.filter((_, j) => j !== i))}
                      className="text-[13px] text-primary-700"
                    >
                      빼기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BEHAVIOR_TAGS.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        active={b.tags.includes(tag)}
                        onClick={() =>
                          updateBehavior(i, {
                            tags: b.tags.includes(tag)
                              ? b.tags.filter((t) => t !== tag)
                              : [...b.tags, tag],
                          })
                        }
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    aria-label="무슨 일이 있었나요"
                    value={b.content}
                    onChange={(e) => updateBehavior(i, { content: e.target.value })}
                    maxLength={1000}
                    className="h-10 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm text-neutral-800"
                  />
                  {b.severity !== null && (
                    <div className="flex items-center gap-2 text-[13px] text-neutral-600">
                      얼마나 힘들었나요?
                      <Scale
                        label="힘든 정도"
                        severity
                        value={b.severity}
                        onChange={(n) => updateBehavior(i, { severity: n ?? null })}
                      />
                    </div>
                  )}
                </div>
              ))}

              <label className="flex flex-col gap-1.5 text-sm font-bold text-neutral-800">
                그 밖의 일상
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder="없으면 비워두세요"
                  className="h-10 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm font-normal text-neutral-800 placeholder:text-neutral-500"
                />
              </label>

              {questions.length > 0 && (
                <div className="rounded-2xl bg-[#F4F1EC] p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-neutral-800">
                    몇 가지만 더 여쭤볼게요 (건너뛰어도 돼요)
                  </h3>
                  {questions.map((q, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2.5 text-sm text-neutral-800"
                    >
                      <span className="flex-1 min-w-[200px]">{q.question}</span>
                      {q.answer === 'scale' ? (
                        <Scale
                          label={q.question}
                          severity={q.kind === 'BEHAVIOR_SEVERITY'}
                          value={
                            typeof answers[i] === 'number' ? (answers[i] as number) : undefined
                          }
                          onChange={(n) =>
                            setAnswers((prev) => {
                              const next = { ...prev };
                              if (n === undefined) delete next[i];
                              else next[i] = n;
                              return next;
                            })
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          aria-label={q.question}
                          value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                          maxLength={500}
                          placeholder="없으면 비워두세요"
                          className="w-[240px] h-10 rounded-xl border border-neutral-200 bg-white px-3 text-[13px] placeholder:text-neutral-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="px-7 py-4 border-t border-neutral-200 flex justify-end gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="h-12 px-6 rounded-xl border border-neutral-200 text-[15px] text-neutral-800"
        >
          {failedReason ? '닫기' : '취소'}
        </button>
        {!failedReason && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!entryId || confirm.isPending || analyze.isPending}
            className="h-12 px-7 rounded-xl bg-primary-700 text-white text-[15px] font-bold disabled:opacity-50"
          >
            {confirm.isPending ? '저장 중…' : '확인하고 저장'}
          </button>
        )}
      </div>
    </>
  );
}
