import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { useChildStore } from '../stores/child.store';
import { useMyFamily, useCreateFamily } from '../hooks/use-families';
import { useCreateChild } from '../hooks/use-children';
import { useGenerateCurriculum, getAiErrorMessage } from '../hooks/use-curriculum';
import type { Curriculum } from '../types/curriculum';
import {
  CENTER_OPTIONS,
  CONCERN_OPTIONS,
  DIAGNOSIS_OPTIONS,
  buildOnboardingProfile,
} from '../utils/onboarding-profile';

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 px-4 rounded-full text-sm ${
        active
          ? 'border-2 border-primary-500 bg-primary-50 text-primary-800 font-bold'
          : 'border border-neutral-200 bg-white text-neutral-800 hover:border-primary-300'
      }`}
    >
      {label}
    </button>
  );
}

const toggle = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

/** 첫 사용 안내: 아이 등록 → 센터·고민 → 첫 활동 만들기 → 오늘 화면(따라하기 투어) */
export function WelcomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setSelectedChild = useChildStore((s) => s.setSelectedChild);
  const { data: family } = useMyFamily();
  const createFamily = useCreateFamily();
  const createChild = useCreateChild();
  const generate = useGenerateCurriculum();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [centers, setCenters] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [likes, setLikes] = useState('');
  const [working, setWorking] = useState(false);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step1Valid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(birthDate);

  async function finish() {
    setWorking(true);
    setError(null);
    try {
      const familyId =
        family?.id ?? (await createFamily.mutateAsync({ name: `${user?.name ?? '우리'} 가족` })).id;
      const child = await createChild.mutateAsync({
        familyId,
        input: {
          name: name.trim(),
          birthDate,
          diagnosisName: diagnosis && diagnosis !== '평가 중이에요' ? diagnosis : undefined,
          ...buildOnboardingProfile({ centers, concerns, likes }),
        },
      });
      setSelectedChild(child.id);
      queryClient.invalidateQueries({ queryKey: ['family'] });
      setStep(3);
      setCurriculum(await generate.mutateAsync({ childId: child.id }));
    } catch (err) {
      setError(
        getAiErrorMessage(err) ??
          '잠시 후 다시 시도해주세요. 오늘 화면에서 활동을 다시 만들 수 있어요.',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex justify-center px-4 py-10">
      <main className="w-full max-w-[520px] flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold text-primary-600">{step} / 3</span>
          <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 rounded-full ${n <= step ? 'bg-primary-500' : 'bg-neutral-200'}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[26px] font-bold text-neutral-800 leading-snug">
                반가워요.
                <br />
                아이에 대해 알려주세요
              </h1>
              <p className="text-[15px] text-neutral-600">
                아이에게 맞는 집 활동을 만들기 위해 필요해요. 나중에 언제든 바꿀 수 있어요.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-neutral-800">
              이름 또는 애칭
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="예: 하늘이"
                className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-[15px] font-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-neutral-800">
              생년월일
              <input
                type="date"
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-[15px] font-normal"
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-neutral-800">
                진단을 받았나요? <span className="font-normal text-neutral-500">(선택)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {DIAGNOSIS_OPTIONS.map((d) => (
                  <Chip
                    key={d}
                    label={d}
                    active={diagnosis === d}
                    onClick={() => setDiagnosis(diagnosis === d ? null : d)}
                  />
                ))}
              </div>
            </div>
            <p className="text-[13px] text-neutral-600 bg-[#F2F0EC] rounded-xl px-4 py-3 leading-relaxed">
              이름과 생년월일은 암호화해서 저장해요. AI에게는 나이(개월 수)만 전달돼요.
            </p>
            <button
              type="button"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="h-[52px] rounded-xl bg-primary-700 text-white text-base font-bold disabled:opacity-40"
            >
              다음
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[26px] font-bold text-neutral-800 leading-snug">
                센터에서 어떤 수업을 받고 있나요?
              </h1>
              <p className="text-[15px] text-neutral-600">
                센터 수업과 겹치지 않고 이어지는 집 활동을 만들어 드려요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CENTER_OPTIONS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={centers.includes(c)}
                  onClick={() => setCenters(toggle(centers, c))}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[15px] font-bold text-neutral-800">
                요즘 가장 신경 쓰이는 것은요?{' '}
                <span className="text-[13px] font-normal text-neutral-500">(여러 개 선택)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={concerns.includes(c)}
                    onClick={() => setConcerns(toggle(concerns, c))}
                  />
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5 text-[15px] font-bold text-neutral-800">
              <span>
                아이가 좋아하는 것{' '}
                <span className="text-[13px] font-normal text-neutral-500">
                  (선택 · 활동에 활용해요)
                </span>
              </span>
              <input
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                maxLength={100}
                placeholder="예: 탁탁 두드리기, 기차, 비눗방울"
                className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-[15px] font-normal"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-[52px] px-6 rounded-xl border border-neutral-200 bg-white text-[15px]"
              >
                이전
              </button>
              <button
                type="button"
                onClick={finish}
                disabled={working}
                className="flex-1 h-[52px] rounded-xl bg-primary-700 text-white text-base font-bold disabled:opacity-60"
              >
                첫 활동 만들기
              </button>
            </div>
            {error && <p className="text-sm text-[#B4442F]">{error}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-[26px] font-bold text-neutral-800">
              {curriculum ? '첫 활동이 준비됐어요' : '첫 활동을 만들고 있어요'}
            </h1>
            <section className="bg-white border border-neutral-200 rounded-2xl px-5 py-4 flex flex-col gap-2.5">
              <h2 className="text-[13px] font-bold text-primary-700">오늘 집에서 할 활동</h2>
              {curriculum ? (
                curriculum.activities.map((a, i) => (
                  <p
                    key={i}
                    className={`text-[15px] text-neutral-800 ${i > 0 ? 'border-t border-neutral-100 pt-2.5' : ''}`}
                  >
                    {a.title} <span className="text-xs text-neutral-500">· {a.durationMin}분</span>
                  </p>
                ))
              ) : error ? (
                <p className="text-sm text-[#B4442F]">{error}</p>
              ) : (
                <p className="text-sm text-neutral-600">
                  아이 정보를 보고 활동을 고르는 중이에요. 30초 정도 걸려요…
                </p>
              )}
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="text-[15px] font-bold text-neutral-800">매일 이렇게 쓰면 돼요</h2>
              {[
                ['낮에 활동하고 결과 누르기', '잘했어요 · 조금 했어요 · 못 했어요'],
                ['저녁에 오늘 하루 기록 1분', '수업이 있었다면 선생님 말씀도 함께'],
                [
                  '다음 날 아침, 새 활동 확인',
                  '어제 기록을 보고 AI가 쉽게 또는 한 단계 높여 만들어요',
                ],
              ].map(([title, body], i) => (
                <div key={title} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-[13px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-medium text-neutral-800">{title}</span>
                    <span className="text-[13px] text-neutral-600">{body}</span>
                  </span>
                </div>
              ))}
            </section>
            <button
              type="button"
              onClick={() => navigate('/family')}
              className="h-12 rounded-xl border border-neutral-200 bg-white text-[15px] text-neutral-800"
            >
              배우자도 함께 기록하도록 초대
            </button>
            <button
              type="button"
              onClick={() => navigate('/today', { replace: true })}
              disabled={working}
              className="h-[52px] rounded-xl bg-primary-700 text-white text-base font-bold disabled:opacity-60"
            >
              오늘 시작하기
            </button>
          </>
        )}
      </main>
    </div>
  );
}
