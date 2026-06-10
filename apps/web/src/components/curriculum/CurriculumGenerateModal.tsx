import { useState } from 'react';
import type { GenerateCurriculumInput } from '../../hooks/use-curriculum';

interface Props {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onGenerate: (input: GenerateCurriculumInput) => void;
}

export function CurriculumGenerateModal({ isOpen, isPending, onClose, onGenerate }: Props) {
  const [form, setForm] = useState<GenerateCurriculumInput>({
    monthlyGoal: '',
    weeklyGoal: '',
    dailyGoal: '',
    extraActivities: '',
  });

  if (!isOpen) return null;

  const hasInput = Object.values(form).some((v) => v && v.trim());

  const handleSubmit = () => {
    const cleaned: GenerateCurriculumInput = {};
    if (form.monthlyGoal?.trim()) cleaned.monthlyGoal = form.monthlyGoal.trim();
    if (form.weeklyGoal?.trim()) cleaned.weeklyGoal = form.weeklyGoal.trim();
    if (form.dailyGoal?.trim()) cleaned.dailyGoal = form.dailyGoal.trim();
    if (form.extraActivities?.trim()) cleaned.extraActivities = form.extraActivities.trim();
    onGenerate(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8f5ee] flex items-center justify-center text-xl">
              ✨
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-800">AI 커리큘럼 생성</h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                목표와 원하는 활동을 입력하면 AI가 더 맞춤화된 커리큘럼을 만들어드려요
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* 월간 목표 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              🗓️ 이번 달 목표
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(선택)</span>
            </label>
            <input
              type="text"
              placeholder="예: 눈맞춤 3초 유지, 2어절 표현 늘리기"
              value={form.monthlyGoal}
              onChange={(e) => setForm({ ...form, monthlyGoal: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 주간 목표 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              📅 이번 주 목표
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(선택)</span>
            </label>
            <input
              type="text"
              placeholder="예: 매일 그림책 1권 읽기, 모방 놀이 10분"
              value={form.weeklyGoal}
              onChange={(e) => setForm({ ...form, weeklyGoal: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 오늘 목표 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              ☀️ 오늘의 목표
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(선택)</span>
            </label>
            <input
              type="text"
              placeholder="예: 과자 이름 말하기, 공 주고받기 5회"
              value={form.dailyGoal}
              onChange={(e) => setForm({ ...form, dailyGoal: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 추가 활동 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              🎯 포함해달라는 활동 / 공부
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(선택)</span>
            </label>
            <textarea
              rows={3}
              placeholder="예: 숫자 1~10 세기 연습, 색깔 이름 맞추기, ABA에서 배운 모방 행동 이어가기"
              value={form.extraActivities}
              onChange={(e) => setForm({ ...form, extraActivities: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all resize-none"
            />
          </div>

          {!hasInput && (
            <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2">
              💡 입력하지 않아도 AI가 발달 데이터를 기반으로 자동 생성합니다
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-[2] py-3 rounded-xl bg-[#5B8A72] text-white text-sm font-semibold hover:bg-[#3d6b54] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-[#5B8A72]/30"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                AI 생성 중...
              </>
            ) : (
              '✨ AI 커리큘럼 생성하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
