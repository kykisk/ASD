import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useAddTeacherOpinion,
  useConcern,
  useDeleteConcern,
  useGeneratePerspectives,
  useStartTrial,
  useUpdateConcern,
  useUpdateTrial,
  type ConcernDetail,
} from '../hooks/use-concerns';
import { APPROACH_LABELS, EVIDENCE_LABELS, RATING_OPTIONS } from '../utils/find-way';
import { DAILY_SESSION_TYPES, sessionTypeLabel } from '../utils/session-type';

type Tab = 'views' | 'pattern' | 'trial' | 'teacher';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'views', label: '여러 관점' },
  { key: 'pattern', label: '언제 · 왜' },
  { key: 'trial', label: '2주 시도' },
  { key: 'teacher', label: '선생님' },
];

const RATING = Object.fromEntries(RATING_OPTIONS.map((r) => [r.key, r.label]));
const md = (d: string) => d.slice(5).replace('-', '/');

function apiErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message ?? fallback
  );
}

const card = 'bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col gap-2.5';
const primaryBtn =
  'h-11 px-5 rounded-xl bg-primary-700 text-white text-sm font-bold disabled:opacity-50';

/** 맞는 방법 찾기: 고민 하나 자세히 */
export function ConcernDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, isLoading } = useConcern(id);
  const generate = useGeneratePerspectives();
  const tab = (params.get('tab') as Tab) || 'views';
  const setTab = (t: Tab) => setParams(t === 'views' ? {} : { tab: t });
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  async function runGenerate() {
    if (!id) return;
    setError(null);
    try {
      await generate.mutateAsync(id);
    } catch (err) {
      setError(apiErrorMessage(err, '정리하지 못했어요. 잠시 뒤 다시 시도해주세요.'));
    }
  }

  // 막 만든 고민이면 관점 정리를 바로 시작
  useEffect(() => {
    if (params.get('fresh') && data && !data.perspectives && !autoStarted.current) {
      autoStarted.current = true;
      runGenerate();
    }
  }, [params, data]);

  if (isLoading || !data) return <p className="text-sm text-neutral-500">불러오는 중…</p>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div>
        <Link to="/concerns" className="text-sm text-primary-700">
          ‹ 맞는 방법 찾기
        </Link>
        <h1 className="text-2xl font-bold text-neutral-800 mt-1">{data.concern.title}</h1>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-neutral-200 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary-500 font-bold text-primary-800'
                : 'border-transparent text-neutral-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data.safety && (
        <p className="text-sm text-[#8A1C1C] bg-[#FDECEC] rounded-xl px-4 py-3">
          다칠 수 있는 행동(자해 · 공격)이 기록돼 있어요. 여기 내용보다 먼저 담당 선생님이나
          전문가와 꼭 상의하세요.
        </p>
      )}

      {tab === 'views' && (
        <ViewsTab
          data={data}
          generating={generate.isPending}
          error={error}
          onGenerate={runGenerate}
          onTrialStarted={() => setTab('trial')}
        />
      )}
      {tab === 'pattern' && <PatternTab data={data} />}
      {tab === 'trial' && <TrialTab data={data} onPickMethod={() => setTab('views')} />}
      {tab === 'teacher' && <TeacherTab data={data} />}

      <ConcernActions data={data} onDeleted={() => navigate('/concerns')} />
    </div>
  );
}

function ViewsTab({
  data,
  generating,
  error,
  onGenerate,
  onTrialStarted,
}: {
  data: ConcernDetail;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  onTrialStarted: () => void;
}) {
  const startTrial = useStartTrial();
  const p = data.perspectives;
  const active = data.trials.find((t) => t.status === 'ACTIVE');

  async function start(approach: string, s: { title: string; how: string }) {
    if (
      active &&
      !window.confirm(`지금 해보는 "${active.title}"을(를) 그만두고 이 방법으로 바꿀까요?`)
    )
      return;
    try {
      await startTrial.mutateAsync({ id: data.concern.id, title: s.title, how: s.how, approach });
      onTrialStarted();
    } catch {
      window.alert('시작하지 못했어요. 다시 시도해주세요.');
    }
  }

  if (generating) {
    return (
      <div className={`${card} items-center py-10`}>
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-neutral-700">
          여러 관점과 관련 논문을 정리하는 중이에요… 30~40초쯤 걸려요.
        </p>
      </div>
    );
  }
  if (!p) {
    return (
      <div className={card}>
        <p className="text-sm text-neutral-800 leading-relaxed">
          행동주의 · 발달 놀이 · 감각통합 · 신경다양성, 4가지 관점에서 이 행동을 어떻게 보고 집에서
          무엇을 권하는지 AI가 정리해요. 우리 아이 기록과 센터 피드백, 관련 논문도 함께 봐요.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={onGenerate} className={`${primaryBtn} self-start`}>
          여러 관점 정리하기
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <p className="text-[15px] text-neutral-800">{p.summary}</p>
        <p className="text-xs text-neutral-500 mt-1">
          정답은 하나가 아니에요. 관점마다 이유와 방법이 달라요.
        </p>
      </div>

      {p.centerView && (
        <section className="bg-primary-50 rounded-2xl px-5 py-4 flex flex-col gap-1">
          <p className="text-xs font-bold text-primary-800">
            우리 센터 선생님 의견 · {p.centerView.source}
          </p>
          <p className="text-sm text-neutral-800">"{p.centerView.text}"</p>
          {APPROACH_LABELS[p.centerView.approach] && (
            <p className="text-xs text-primary-700">
              → 아래 {APPROACH_LABELS[p.centerView.approach]} 관점에 가까운 방법이에요
            </p>
          )}
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {p.perspectives.map((v) => {
          const ev = EVIDENCE_LABELS[v.evidence];
          return (
            <section key={v.approach} className={card}>
              <div className="flex justify-between items-baseline gap-2">
                <h2 className="text-[15px] font-bold text-neutral-800">
                  {APPROACH_LABELS[v.approach] ?? v.approach}
                </h2>
                {ev && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md ${ev.strong ? 'bg-[#E7F0FB] text-[#1E4E8C]' : 'bg-[#F4F1EC] text-neutral-600'}`}
                  >
                    {ev.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">
                <b>왜? </b>
                {v.why}
              </p>
              <p className="text-sm text-neutral-800 leading-relaxed">
                <b>집에서 </b>
                {v.atHome}
              </p>
              {v.caution && (
                <p className="text-xs text-[#8A4B14] bg-[#FDF0E6] rounded-lg px-2.5 py-2">
                  {v.caution}
                </p>
              )}
              {v.strategies.map((s) => (
                <div
                  key={s.title}
                  className="bg-[#FDFBF7] rounded-xl px-3 py-2.5 flex flex-col gap-1"
                >
                  <p className="text-sm font-bold text-neutral-800">{s.title}</p>
                  <p className="text-xs text-neutral-600 leading-relaxed">{s.how}</p>
                  <button
                    type="button"
                    onClick={() => start(v.approach, s)}
                    disabled={startTrial.isPending || active?.title === s.title}
                    className="self-start text-[13px] font-bold text-primary-700 disabled:text-neutral-500"
                  >
                    {active?.title === s.title ? '지금 해보는 중' : '이 방법 2주 해보기 ›'}
                  </button>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {p.papers.length > 0 && (
        <section className={card}>
          <h2 className="text-[15px] font-bold text-neutral-800">관련 논문 · 한국어 요약</h2>
          {p.papers.map((paper) => (
            <details key={paper.id} className="text-sm">
              <summary className="cursor-pointer text-neutral-800">
                {paper.year} · {paper.title}
              </summary>
              <p className="text-[13px] text-neutral-600 leading-relaxed mt-1.5">
                {paper.koreanSummary ?? '요약을 아직 못 만들었어요'}
              </p>
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pubmedId}/`}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-bold text-primary-700"
              >
                원문 보기 (PubMed) ›
              </a>
            </details>
          ))}
        </section>
      )}

      <p className="text-xs text-neutral-500">
        AI가 여러 자료를 정리한 내용이에요. 우리 아이에게 맞는지는 기록과 선생님 의견으로 확인해
        주세요.{' '}
        <button type="button" onClick={onGenerate} className="font-bold text-primary-700">
          기록이 늘었으면 다시 정리하기 ›
        </button>
      </p>
    </>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex-1 h-2.5 bg-[#F1EEE9] rounded-full overflow-hidden">
      <div
        className="h-full bg-primary-500 rounded-full"
        style={{ width: `${max ? (value / max) * 100 : 0}%` }}
      />
    </div>
  );
}

function PatternTab({ data }: { data: ConcernDetail }) {
  const { pattern } = data;
  const maxWeek = Math.max(1, ...pattern.weeks.map((w) => w.count));
  const maxAnte = Math.max(1, ...pattern.byAntecedent.map((a) => a.count));
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <section className={card}>
        <div className="flex justify-between items-baseline">
          <h2 className="text-[15px] font-bold text-neutral-800">최근 6주 기록</h2>
          <span className="text-xs text-neutral-500">모두 {pattern.total}번</span>
        </div>
        <div className="flex items-end gap-2 h-32">
          {pattern.weeks.map((w) => (
            <div
              key={w.start}
              className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
            >
              <span className="text-xs text-neutral-600">{w.count || ''}</span>
              <div
                className="w-full bg-primary-500 rounded-t-md"
                style={{ height: `${Math.max(4, (w.count / maxWeek) * 90)}px` }}
              />
              <span className="text-[10px] text-neutral-500">{md(w.start)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className={card}>
        <h2 className="text-[15px] font-bold text-neutral-800">바로 전에 무슨 일이 있었나</h2>
        {pattern.byAntecedent.length === 0 ? (
          <p className="text-xs text-neutral-500">아직 기록이 없어요</p>
        ) : (
          pattern.byAntecedent.map((a) => (
            <div key={a.label} className="flex items-center gap-2 text-sm">
              <span className="w-32 text-neutral-800">{a.label}</span>
              <Bar value={a.count} max={maxAnte} />
              <span className="w-10 text-right text-xs text-neutral-600">{a.count}번</span>
            </div>
          ))
        )}
        <h2 className="text-[15px] font-bold text-neutral-800 mt-2">어떻게 했을 때 금방 멈췄나</h2>
        {pattern.byResponse.length === 0 ? (
          <p className="text-xs text-neutral-500">아직 기록이 없어요</p>
        ) : (
          pattern.byResponse.map((r) => (
            <p key={r.label} className="text-sm text-neutral-800">
              {r.label} ·{' '}
              <b>
                {r.count}번 중 {r.quick}번
              </b>{' '}
              금방 멈춤
            </p>
          ))
        )}
      </section>
      {data.perspectives?.patternInsight && (
        <section className="md:col-span-2 bg-[#E7F0FB] rounded-2xl px-5 py-4 flex flex-col gap-1">
          <h2 className="text-sm font-bold text-[#1E4E8C]">AI가 본 가능성</h2>
          <p className="text-sm text-neutral-800 leading-relaxed">
            {data.perspectives.patternInsight}
          </p>
          <p className="text-xs text-neutral-600">
            기록이 더 쌓이면 달라질 수 있어요 · 선생님께 같이 보여드리세요
          </p>
        </section>
      )}
      <p className="md:col-span-2 text-xs text-neutral-500">
        언제 · 왜를 적은 기록 {pattern.withContext}번. 오늘 하루 기록에서 힘든 행동을 적을 때 "바로
        전에 / 어떻게 하셨어요"를 골라주시면 패턴이 더 정확해져요.
      </p>
    </div>
  );
}

function TrialTab({ data, onPickMethod }: { data: ConcernDetail; onPickMethod: () => void }) {
  const update = useUpdateTrial();
  const active = data.trials.find((t) => t.status === 'ACTIVE');
  const past = data.trials.filter((t) => t.status !== 'ACTIVE');

  return (
    <>
      {active ? (
        <section className="bg-white border-2 border-primary-500 rounded-2xl p-5 flex flex-col gap-2.5">
          <p className="text-xs font-bold text-primary-800">
            {active.needsRating ? '2주가 끝났어요' : `지금 해보는 중 · ${active.day}일째 / 14일`}
          </p>
          <h2 className="text-lg font-bold text-neutral-800">{active.title}</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {APPROACH_LABELS[active.approach] ?? ''} · {active.how}
          </p>
          <div className="h-2 bg-[#F1EEE9] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500"
              style={{ width: `${(Math.min(14, active.day) / 14) * 100}%` }}
            />
          </div>
          <p className="text-sm text-neutral-800">
            시작 전 2주 주당 <b>{active.comparison.beforePerWeek}번</b> → 지금 주당{' '}
            <b>{active.comparison.duringPerWeek}번</b>
            {active.comparison.duringDays < 7 ? ' (아직 며칠 안 돼서 참고만)' : ''}
          </p>
          <p className="text-xs text-neutral-500">
            오늘의 활동에 이 방법을 연습하는 활동이 하나씩 들어가요.
          </p>
          {active.needsRating ? (
            <div className="flex gap-2">
              {RATING_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() =>
                    update.mutate({ trialId: active.id, status: 'DONE', rating: r.key })
                  }
                  className="flex-1 h-11 rounded-xl border border-primary-500 bg-primary-50 text-sm font-bold text-primary-800"
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                window.confirm('이 방법을 그만둘까요? 지금까지 결과는 남아요.') &&
                update.mutate({ trialId: active.id, status: 'STOPPED' })
              }
              className="self-start text-[13px] text-neutral-500"
            >
              그만두기
            </button>
          )}
        </section>
      ) : (
        <section className={card}>
          <p className="text-sm text-neutral-800 leading-relaxed">
            여러 관점에서 방법 하나를 골라 2주 해보면, 시작 전과 기록 횟수를 비교해 보여드려요.
            하나씩 바꿔 보며 우리 아이에게 맞는 방법을 찾아요.
          </p>
          <button type="button" onClick={onPickMethod} className={`${primaryBtn} self-start`}>
            방법 고르러 가기
          </button>
        </section>
      )}
      {past.length > 0 && (
        <section className={card}>
          <h2 className="text-[15px] font-bold text-neutral-800">지금까지 해본 방법</h2>
          {past.map((t) => (
            <div key={t.id}>
              <p className="text-sm text-neutral-800">
                {t.title} · <b>{t.rating ? RATING[t.rating] : '중간에 그만둠'}</b>
              </p>
              <p className="text-xs text-neutral-500">
                {md(t.startDate)} ~ {md(t.endDate)} · 주당 {t.comparison.beforePerWeek} →{' '}
                {t.comparison.duringPerWeek}번
              </p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function summaryRows(data: ConcernDetail) {
  const { pattern, trials } = data;
  const recent = pattern.weeks.slice(-2).reduce((n, w) => n + w.count, 0) / 2;
  const older = pattern.weeks.slice(0, 4).reduce((n, w) => n + w.count, 0) / 4;
  const rows: Array<{ label: string; text: string }> = [
    {
      label: '얼마나',
      text: `최근 6주 ${pattern.total}번 · 주 평균 ${Math.round(older * 10) / 10}번 → 최근 2주 ${Math.round(recent * 10) / 10}번`,
    },
  ];
  if (pattern.byAntecedent.length)
    rows.push({
      label: '주로 언제',
      text: pattern.byAntecedent
        .slice(0, 3)
        .map((a) => `${a.label} (${a.count})`)
        .join(' · '),
    });
  if (pattern.byResponse.length)
    rows.push({
      label: '어떻게 했을 때 금방 멈췄나',
      text: pattern.byResponse.map((r) => `${r.label} ${r.quick}/${r.count}`).join(' · '),
    });
  if (trials.length)
    rows.push({
      label: '집에서 해본 방법',
      text: trials
        .slice()
        .reverse()
        .map(
          (t, i) =>
            `${i + 1}) ${t.title} (${APPROACH_LABELS[t.approach] ?? ''}, ${md(t.startDate)}~, ${
              t.status === 'ACTIVE'
                ? `진행 중 ${t.day}일째`
                : t.rating
                  ? RATING[t.rating]
                  : '중간에 그만둠'
            } · 주당 ${t.comparison.beforePerWeek} → ${t.comparison.duringPerWeek}번)`,
        )
        .join('\n'),
    });
  return rows;
}

function TeacherTab({ data }: { data: ConcernDetail }) {
  const add = useAddTeacherOpinion();
  const [question, setQuestion] = useState('');
  const [sessionType, setSessionType] = useState('SENSORY');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const rows = summaryRows(data);

  async function copy() {
    const text = [
      `[집에서 본 "${data.concern.title}"]`,
      ...rows.map((r) => `· ${r.label}: ${r.text}`),
      question.trim() ? `· 여쭤보고 싶은 것: ${question.trim()}` : '',
      '(AutiCare 기록 요약)',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setNotice('복사했어요. 문자 · 카톡 · 메일에 붙여 넣어 보내세요.');
    } catch {
      setNotice('복사하지 못했어요. 인쇄를 이용해 주세요.');
    }
  }

  async function save() {
    if (!content.trim()) return;
    try {
      await add.mutateAsync({ id: data.concern.id, sessionType, content: content.trim() });
      setContent('');
      setNotice('선생님 의견을 저장했어요. 다음 활동부터 가장 먼저 반영돼요.');
    } catch {
      setNotice('저장하지 못했어요. 다시 시도해주세요.');
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <section className={`${card} print-area`}>
        <h2 className="text-base font-bold text-neutral-800">집에서 본 "{data.concern.title}"</h2>
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-xs font-bold text-neutral-500">{r.label}</p>
            <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">{r.text}</p>
          </div>
        ))}
        <label className="flex flex-col gap-1 text-xs font-bold text-neutral-500">
          여쭤보고 싶은 것 (선택)
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="예: 집에서 따라 치는 방법을 계속해도 될까요?"
            className="rounded-xl border border-neutral-200 bg-[#FDFBF7] p-2.5 text-sm font-normal text-neutral-800 resize-none placeholder:text-neutral-500"
          />
        </label>
        <p className="text-xs text-neutral-500">아이 이름은 들어가지 않아요.</p>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl border border-neutral-200 text-sm"
          >
            인쇄
          </button>
          <button
            type="button"
            onClick={copy}
            className="h-10 px-4 rounded-xl border border-primary-500 bg-primary-50 text-sm font-bold text-primary-800"
          >
            글로 복사
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-3 print:hidden">
        <section className={card}>
          <h2 className="text-[15px] font-bold text-neutral-800">선생님 의견 적기</h2>
          <div className="flex flex-wrap gap-1.5">
            {DAILY_SESSION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={sessionType === t}
                onClick={() => setSessionType(t)}
                className={`h-8 px-3 rounded-full text-[13px] ${sessionType === t ? 'border-2 border-primary-500 bg-primary-50 font-bold text-primary-800' : 'border border-neutral-200'}`}
              >
                {sessionTypeLabel(t)}
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={3}
            aria-label="선생님 의견"
            placeholder="예: 따라 치기 좋아요. 다만 세 번 넘게 계속되면 북으로 옮겨 주세요."
            className="rounded-xl border border-neutral-200 bg-[#FDFBF7] p-3 text-sm resize-none placeholder:text-neutral-500"
          />
          <p className="text-xs text-neutral-500">
            선생님 의견은 AI가 다음 활동을 만들 때 가장 먼저 따라요.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={add.isPending || !content.trim()}
            className={`${primaryBtn} self-start`}
          >
            의견 저장
          </button>
        </section>
        {notice && <p className="text-sm text-primary-700">{notice}</p>}
        {data.teacherOpinions.length > 0 && (
          <section className={card}>
            <h2 className="text-[15px] font-bold text-neutral-800">받은 의견</h2>
            {data.teacherOpinions.map((o) => (
              <div key={o.id}>
                <p className="text-xs text-neutral-500">
                  {md(o.date)} · {sessionTypeLabel(o.sessionType)}
                </p>
                <p className="text-sm text-neutral-800">{o.content}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function ConcernActions({ data, onDeleted }: { data: ConcernDetail; onDeleted: () => void }) {
  const update = useUpdateConcern();
  const remove = useDeleteConcern();
  const resolved = data.concern.status === 'RESOLVED';
  return (
    <div className="flex justify-between text-[13px] text-neutral-500 pt-4 print:hidden">
      <button
        type="button"
        onClick={() =>
          update.mutate({ id: data.concern.id, status: resolved ? 'ACTIVE' : 'RESOLVED' })
        }
      >
        {resolved ? '다시 고민 중으로' : '나아졌어요 (목록 아래로)'}
      </button>
      <button
        type="button"
        onClick={async () => {
          if (
            !window.confirm(
              '이 고민을 지울까요? 관점 정리와 시도 기록이 함께 지워져요. (하루 기록은 남아요)',
            )
          )
            return;
          await remove.mutateAsync(data.concern.id);
          onDeleted();
        }}
      >
        지우기
      </button>
    </div>
  );
}
