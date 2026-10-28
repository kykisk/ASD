import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChildStore } from '../stores/child.store';
import { useConcerns, useCreateConcern } from '../hooks/use-concerns';

const BEHAVIOR_TAGS = ['멜트다운', '공격', '자해', '탈주', '상동행동', '발작', '기타'];

/** 맞는 방법 찾기: 우리 아이 고민 목록 */
export function ConcernsPage() {
  const navigate = useNavigate();
  const childId = useChildStore((s) => s.selectedChildId);
  const { data, isLoading } = useConcerns(childId);
  const create = useCreateConcern();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!childId) return;
    setError(null);
    if (!title.trim()) return setError('어떤 행동이 고민인지 적어주세요');
    try {
      const created = await create.mutateAsync({ childId, title: title.trim(), matchTags: tags });
      navigate(`/concerns/${created.id}?fresh=1`);
    } catch {
      setError('만들지 못했어요. 다시 시도해주세요.');
    }
  }

  if (!childId) return <p className="text-sm text-neutral-500">아이를 먼저 선택해주세요.</p>;
  if (isLoading || !data) return <p className="text-sm text-neutral-500">불러오는 중…</p>;

  const active = data.concerns.filter((c) => c.status === 'ACTIVE');
  const resolved = data.concerns.filter((c) => c.status === 'RESOLVED');

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">맞는 방법 찾기</h1>
        <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
          자꾸 반복되는 행동 하나를 고르면 여러 전문 관점, 우리 아이 기록 패턴, 직접 해본 방법의
          결과, 선생님 의견을 한곳에 모아 볼 수 있어요. 정답을 정해주지 않고 비교를 도와드려요.
        </p>
      </div>

      {data.suggestions.length > 0 && (
        <section className="bg-primary-50 rounded-2xl p-4 flex flex-col gap-2">
          <h2 className="text-sm font-bold text-primary-800">최근 30일 자주 기록된 행동</h2>
          {data.suggestions.map((s) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => {
                setAdding(true);
                setTags([s.tag]);
              }}
              className="flex justify-between items-center text-sm text-neutral-800 py-1"
            >
              <span>
                {s.tag} · {s.count}번
              </span>
              <span className="font-bold text-primary-700">고민으로 보기 ›</span>
            </button>
          ))}
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {active.map((c) => (
          <Link
            key={c.id}
            to={`/concerns/${c.id}`}
            className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2 hover:border-primary-300"
          >
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-base font-bold text-neutral-800">{c.title}</span>
              <span className="text-xs text-neutral-500 shrink-0">30일 {c.recordCount30d}번</span>
            </div>
            <span
              className={`text-[13px] ${c.activeTrial ? 'font-semibold text-primary-700' : 'text-neutral-500'}`}
            >
              {c.activeTrial
                ? c.activeTrial.ended
                  ? `2주 시도 끝 · "${c.activeTrial.title}" 어땠는지 알려주세요`
                  : `시도 중 · ${c.activeTrial.title} · ${c.activeTrial.day}일째 / 14일`
                : c.hasPerspectives
                  ? '방법을 골라 2주 해볼 수 있어요'
                  : '관점 정리 전'}
            </span>
          </Link>
        ))}
      </div>

      {adding ? (
        <section className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-[15px] font-bold text-neutral-800">
            어떤 행동이 고민이세요?
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder="예: 손으로 탁탁 치기, 기다릴 때 소리 지르기"
              className="h-11 rounded-xl border border-neutral-200 bg-[#FDFBF7] px-3 text-sm font-normal placeholder:text-neutral-500"
            />
          </label>
          <p className="text-xs text-neutral-500">같이 볼 힘든 행동 기록 (선택)</p>
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIOR_TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  className={`h-8 px-3 rounded-full text-[13px] ${on ? 'border-2 border-primary-500 bg-primary-50 font-bold text-primary-800' : 'border border-neutral-200'}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-11 px-5 rounded-xl border border-neutral-200 text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="h-11 px-6 rounded-xl bg-primary-700 text-white text-sm font-bold disabled:opacity-60"
            >
              만들기
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-12 rounded-xl border border-dashed border-primary-500 text-[15px] font-bold text-primary-700"
        >
          + 고민 추가하기
        </button>
      )}

      {resolved.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs text-neutral-500">나아진 고민</h2>
          {resolved.map((c) => (
            <Link
              key={c.id}
              to={`/concerns/${c.id}`}
              className="bg-white/70 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-600"
            >
              {c.title}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
