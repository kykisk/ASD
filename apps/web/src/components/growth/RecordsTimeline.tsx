import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DAILY_RECORD_DOMAINS, useDailyTimeline } from '../../hooks/use-daily-record';
import { sessionTypeLabel } from '../../utils/session-type';

const RANGES = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '3개월' },
];

function tagFor(feedbackType: string, sessionType: string) {
  if (feedbackType === 'BEHAVIORAL_ISSUE')
    return { label: '힘든 행동', className: 'bg-[#FFF1E6] text-[#8A4A12]' };
  if (feedbackType === 'DAILY_LOG')
    return { label: '일상', className: 'bg-primary-50 text-primary-700' };
  return { label: sessionTypeLabel(sessionType), className: 'bg-[#EAF0FA] text-[#2F4E7E]' };
}

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/** 성장 › 기록 모아보기: 날짜별로 점수·메모·수업·힘든 행동·활동 완료를 한 카드에 */
/** 쭉 적기로 쓴 원문: 'AI 정리' 표시 + 눌러서 펼쳐 보기 */
function RawTexts({ entries }: { entries: Array<{ id: string; rawText: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="self-start flex items-center gap-2 text-[13px] font-semibold text-primary-700"
      >
        <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-primary-50 text-primary-700">
          AI 정리
        </span>
        {open ? '원문 닫기' : '내가 쓴 원문 보기'}
      </button>
      {open &&
        entries.map((e) => (
          <p
            key={e.id}
            className="text-[13px] leading-relaxed text-neutral-600 bg-[#F4F1EC] rounded-xl px-3 py-2 whitespace-pre-wrap"
          >
            {e.rawText}
          </p>
        ))}
    </div>
  );
}

export function RecordsTimeline({ childId }: { childId: string }) {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useDailyTimeline(childId, days);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" data-tour="growth-ranges">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={r.days === days}
              className={`h-8 px-3 rounded-full text-[13px] ${
                r.days === days
                  ? 'border-2 border-primary-500 bg-primary-50 text-primary-800 font-bold'
                  : 'border border-neutral-200 bg-white text-neutral-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Link
          to="/session-feedback"
          data-tour="growth-edit"
          className="text-[13px] text-primary-700 underline"
        >
          수업 · 일상 기록 고치기
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-500 py-6">불러오는 중…</p>
      ) : !data || data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 py-10 text-center flex flex-col gap-2 items-center">
          <p className="text-sm text-neutral-600">이 기간에 남긴 기록이 없어요</p>
          <Link to="/today" className="text-sm font-bold text-primary-700">
            오늘 하루 기록하러 가기
          </Link>
        </div>
      ) : (
        data.map((day, i) => {
          const scoreText = day.scores
            ? DAILY_RECORD_DOMAINS.filter((d) => day.scores?.[d.key] !== undefined)
                .map((d) => `${d.label} ${day.scores?.[d.key]}`)
                .join(' · ')
            : null;
          return (
            <article
              key={day.date}
              data-tour={i === 0 ? 'growth-day' : undefined}
              className="bg-white rounded-2xl border border-neutral-200 px-5 py-4 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[15px] font-bold text-neutral-800">{dayLabel(day.date)}</h3>
                {scoreText && <span className="text-[13px] text-primary-700">{scoreText}</span>}
                {day.activities && day.activities.total > 0 && (
                  <span className="text-xs text-neutral-500 ml-auto">
                    활동 {day.activities.done} / {day.activities.total}
                  </span>
                )}
              </div>
              {day.note && <p className="text-sm text-neutral-800 leading-relaxed">{day.note}</p>}
              {day.feedbacks.map((f) => {
                const tag = tagFor(f.feedbackType, f.sessionType);
                return (
                  <div key={f.id} className="flex gap-2 text-sm leading-relaxed text-neutral-800">
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-lg h-fit mt-0.5 ${tag.className}`}
                    >
                      {tag.label}
                    </span>
                    {f.content}
                  </div>
                );
              })}
              {(day.freeform ?? []).length > 0 && <RawTexts entries={day.freeform} />}
              {!scoreText && !day.note && day.feedbacks.length === 0 && (
                <p className="text-xs text-neutral-500">오늘 하루 기록은 없어요</p>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
