import { useEffect, useState } from 'react';
import { useLogActivity } from '../../hooks/use-curriculum';
import type { ActivityLog, ActivityResult, CurriculumActivity } from '../../types/curriculum';
import { DOMAIN_LABELS, DIFFICULTY_LABELS } from '../../types/curriculum';
import { Link } from 'react-router-dom';
import { APPROACH_LABELS, METHOD_LABELS } from '../../utils/find-way';

const RESULT_OPTIONS: Array<{ result: ActivityResult; label: string }> = [
  { result: 'SUCCESS', label: '잘했어요' },
  { result: 'PARTIAL', label: '조금 했어요' },
  { result: 'FAILED', label: '못 했어요' },
];

interface Props {
  curriculumId: string;
  activity: CurriculumActivity;
  index: number;
  total: number;
  log?: ActivityLog;
  /** 결과를 저장한 뒤 다음 활동으로 넘어가기 */
  onSaved: () => void;
}

/** 왜 이 활동? 근거 기록 · 쓰인 방법(관점) · 주의할 점 */
function WhyThisActivity({ activity }: { activity: CurriculumActivity }) {
  const approaches = [
    ...new Set(
      (activity.methods ?? [])
        .map((m) => METHOD_LABELS[m]?.approach)
        .filter((a): a is string => !!a && a !== 'COMMON'),
    ),
  ].map((a) => APPROACH_LABELS[a]);
  return (
    <div className="border-2 border-primary-500 rounded-xl px-3.5 py-3 flex flex-col gap-2.5">
      <h3 className="text-sm font-bold text-primary-700">왜 이 활동이에요?</h3>
      {activity.rationale && (
        <div>
          <p className="text-xs font-bold text-neutral-500">이 기록을 보고 만들었어요</p>
          <p className="text-sm text-neutral-800 leading-relaxed">{activity.rationale}</p>
        </div>
      )}
      {(activity.methods?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-neutral-500">쓰인 방법</p>
          <div className="flex flex-wrap gap-1.5">
            {activity.methods?.map((m) => (
              <span key={m} className="text-xs px-2 py-0.5 rounded-lg bg-[#E7F0FB] text-[#1E4E8C]">
                {METHOD_LABELS[m]?.label ?? m}
              </span>
            ))}
          </div>
          <p className="text-xs text-neutral-600">
            {approaches.join(' · ') || '여러 관점에서 공통으로 쓰는 방법'}에서 쓰는 방법이에요
          </p>
        </div>
      )}
      {activity.caution && (
        <p className="text-xs text-[#8A4B14] bg-[#FDF0E6] rounded-lg px-2.5 py-2 leading-relaxed">
          {activity.caution}
        </p>
      )}
      <Link
        to={activity.concernId ? `/concerns/${activity.concernId}` : '/concerns'}
        className="text-[13px] font-bold text-primary-700"
      >
        {activity.concernId ? '지금 시도 중인 방법 보기 ›' : '고민되는 행동의 다른 관점 보기 ›'}
      </Link>
    </div>
  );
}

export function ActivityDetailPanel({ curriculumId, activity, index, total, log, onSaved }: Props) {
  const logActivity = useLogActivity();
  const [memo, setMemo] = useState(log?.notes ?? '');

  useEffect(() => {
    setMemo(log?.notes ?? '');
  }, [index, log?.id, log?.notes]);

  async function save(result: ActivityResult, moveNext: boolean) {
    try {
      await logActivity.mutateAsync({
        curriculumId,
        activityIndex: index,
        activityTitle: activity.title.slice(0, 100),
        result,
        notes: memo.trim() || undefined,
      });
      if (moveNext) onSaved();
    } catch {
      alert('저장하지 못했어요. 다시 시도해주세요.');
    }
  }

  const memoChanged = !!log && memo.trim() !== (log.notes ?? '');

  return (
    <section
      data-tour="activity-detail"
      className="bg-white rounded-2xl border border-neutral-200 flex flex-col min-h-[520px]"
    >
      <div className="p-6 lg:p-7 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
              {DOMAIN_LABELS[activity.domain] ?? activity.domain}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
              {activity.durationMin}분
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
              {DIFFICULTY_LABELS[activity.difficultyLevel]}
            </span>
          </div>
          <span className="text-xs text-neutral-500">
            활동 {index + 1} / {total}
          </span>
        </div>
        <h2 className="text-xl font-bold text-neutral-800">{activity.title}</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">{activity.description}</p>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-5">
          <div className="flex flex-col gap-2.5">
            <h3 className="text-[13px] font-bold text-primary-700">이렇게 해요</h3>
            <ol className="flex flex-col gap-2.5">
              {activity.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-neutral-800">
                  <span className="w-[22px] h-[22px] rounded-full bg-primary-50 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            {activity.materials && activity.materials.length > 0 && (
              <div className="bg-[#FDFBF7] rounded-xl px-3.5 py-3">
                <h3 className="text-[13px] font-bold text-primary-700 mb-1">준비물</h3>
                <p className="text-sm text-neutral-800">{activity.materials.join(' · ')}</p>
              </div>
            )}
            <div className="bg-[#FDFBF7] rounded-xl px-3.5 py-3">
              <h3 className="text-[13px] font-bold text-primary-700 mb-1">이러면 성공이에요</h3>
              <p className="text-sm text-neutral-800 leading-relaxed">{activity.successCriteria}</p>
            </div>
            {(activity.rationale || (activity.methods?.length ?? 0) > 0) && (
              <WhyThisActivity activity={activity} />
            )}
            <p className="text-xs text-neutral-500 leading-relaxed">
              AI가 기록을 보고 제안하는 활동이에요. 치료 계획은 담당 선생님과 상의하세요.
            </p>
          </div>
        </div>
      </div>

      <div
        data-tour="activity-results"
        className="border-t border-neutral-200 px-6 lg:px-7 py-4 flex flex-wrap items-center gap-2.5"
      >
        <span className="text-sm font-bold text-neutral-800 mr-1">어땠나요?</span>
        {RESULT_OPTIONS.map((opt) => {
          const active = log?.result === opt.result;
          return (
            <button
              key={opt.result}
              type="button"
              onClick={() => save(opt.result, true)}
              disabled={logActivity.isPending}
              aria-pressed={active}
              className={`h-11 px-4 rounded-xl text-sm transition-colors disabled:opacity-60 ${
                active
                  ? 'border-2 border-primary-500 bg-primary-50 text-primary-800 font-bold'
                  : 'border border-neutral-200 bg-white text-neutral-800 hover:border-primary-300'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <label className="flex-1 min-w-[220px]">
          <span className="sr-only">한 줄 메모</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
            placeholder="한 줄 메모 (선택) 예: 집게는 아파해서 종이 찢기만 했어요"
            className="w-full h-11 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm text-neutral-800 placeholder:text-neutral-500"
          />
        </label>
        {memoChanged ? (
          <button
            type="button"
            onClick={() => save(log.result, false)}
            disabled={logActivity.isPending}
            className="h-11 px-3 text-sm font-bold text-primary-700"
          >
            메모 저장
          </button>
        ) : (
          <button
            type="button"
            onClick={() => save('SKIPPED', true)}
            disabled={logActivity.isPending}
            className="h-11 px-3 text-sm text-neutral-500 hover:text-neutral-700"
          >
            {log?.result === 'SKIPPED' ? '건너뛰었어요' : '오늘은 건너뛰기'}
          </button>
        )}
      </div>
    </section>
  );
}
