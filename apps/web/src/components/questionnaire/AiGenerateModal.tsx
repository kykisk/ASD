import { useState } from 'react';
import type { Domain } from '../../hooks/use-questionnaires';
import { useAiGenerate, type AiGenerateResult } from '../../hooks/use-questionnaire-ai';
import { useChildren, type Child } from '../../hooks/use-children';
import { useMyFamily } from '../../hooks/use-families';
import { useCreateQuestionnaire } from '../../hooks/use-questionnaires';
import { useChildStore } from '../../stores/child.store';

const DOMAIN_OPTIONS: { value: Domain; label: string; color: string }[] = [
  { value: 'COMMUNICATION', label: '의사소통', color: '#7B9FD4' },
  { value: 'SOCIAL', label: '사회성', color: '#E8A87C' },
  { value: 'MOTOR', label: '운동', color: '#9B8EC4' },
  { value: 'COGNITIVE', label: '인지', color: '#7EC8C8' },
  { value: 'EMOTIONAL', label: '정서', color: '#F2B880' },
  { value: 'DAILY_LIVING', label: '일상생활', color: '#94B8A0' },
];

function getChildAgeMonths(child: Child): number {
  const birth = new Date(child.birthDate);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

interface AiGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'domains' | 'context' | 'preview' | 'done';

export function AiGenerateModal({ isOpen, onClose }: AiGenerateModalProps) {
  const { data: family } = useMyFamily();
  const { data: children } = useChildren(family?.id);
  const { selectedChildId } = useChildStore();
  const createQuestionnaire = useCreateQuestionnaire(family?.id);
  const aiGenerate = useAiGenerate();

  const [step, setStep] = useState<WizardStep>('domains');
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [result, setResult] = useState<AiGenerateResult | null>(null);

  const selectedChild = children?.find((c) => c.id === selectedChildId) || children?.[0];

  if (!isOpen) return null;

  const toggleDomain = (domain: Domain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  };

  const handleGenerate = () => {
    if (!selectedChild || selectedDomains.length === 0) return;

    setStep('preview');
    aiGenerate.mutate(
      {
        childId: selectedChild.id,
        familyId: family?.id,
        childAgeMonths: getChildAgeMonths(selectedChild),
        targetDomains: selectedDomains,
        additionalContext: additionalContext.trim() || undefined,
      },
      {
        onSuccess: (data) => setResult(data),
      },
    );
  };

  const handleSave = () => {
    if (!result) return;

    createQuestionnaire.mutate(
      {
        name: result.name,
        description: result.description,
        domains: selectedDomains.length > 0
          ? selectedDomains
          : [...new Set(result.items.map((i) => i.domain))],
        items: result.items.map((item, idx) => ({
          domain: item.domain,
          text: item.text,
          weight: item.weight,
          orderIndex: idx,
        })),
      },
      {
        onSuccess: () => setStep('done'),
      },
    );
  };

  const handleRegenerate = () => {
    setResult(null);
    handleGenerate();
  };

  const handleClose = () => {
    setStep('domains');
    setSelectedDomains([]);
    setAdditionalContext('');
    setResult(null);
    onClose();
  };

  const stepIndex = ['domains', 'context', 'preview', 'done'].indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[#2C3E50]/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] mx-4 flex flex-col bg-white rounded-[16px] border border-[#E8E4DF] shadow-[0_8px_32px_rgba(91,138,114,0.12)] animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-center gap-2 pt-5 pb-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? 'w-6 bg-[#5B8A72]'
                  : i < stepIndex
                  ? 'w-2 bg-[#5B8A72]/40'
                  : 'w-2 bg-[#E8E4DF]'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <h2 className="text-lg font-bold text-[#2C3E50] flex items-center gap-2">
            <span className="text-base">✨</span> AI로 질문지 생성하기
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-[12px] text-[#6B7B8D] hover:bg-[#FDFBF7] hover:text-[#2C3E50] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 'domains' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div>
                <h3 className="text-base font-semibold text-[#2C3E50] mb-1">
                  어떤 발달 영역에 초점을 맞출까요?
                </h3>
                <p className="text-sm text-[#6B7B8D]">1개 이상 선택해주세요</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {DOMAIN_OPTIONS.map((domain) => {
                  const isSelected = selectedDomains.includes(domain.value);
                  return (
                    <button
                      key={domain.value}
                      type="button"
                      onClick={() => toggleDomain(domain.value)}
                      className="flex items-center gap-2.5 px-4 py-3.5 rounded-[12px] border-[1.5px] text-left transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? `${domain.color}12` : '#FDFBF7',
                        borderColor: isSelected ? domain.color : '#E8E4DF',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-all"
                        style={{
                          borderColor: isSelected ? domain.color : '#C4B5A0',
                          backgroundColor: isSelected ? domain.color : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: isSelected ? domain.color : '#6B7B8D' }}
                      >
                        {domain.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setStep('context')}
                  disabled={selectedDomains.length === 0}
                  className="w-full h-[48px] rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          
          {step === 'context' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              <div>
                <h3 className="text-base font-semibold text-[#2C3E50] mb-1">
                  아이에 대해 더 알려주세요
                </h3>
                <p className="text-sm text-[#6B7B8D]">선택사항이에요. 비워두셔도 괜찮아요.</p>
              </div>

              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="예: 언어 지연이 있고 눈맞춤이 부족합니다"
                rows={4}
                className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 transition-all resize-none"
              />

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setStep('domains')}
                  className="flex-1 h-[48px] rounded-[12px] border-[1.5px] border-[#5B8A72] text-[#5B8A72] text-[15px] font-semibold hover:bg-[#E8F5EE] transition-colors"
                >
                  ← 이전
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 h-[48px] rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:-translate-y-[1px] active:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  <span>✨</span> AI 생성하기
                </button>
              </div>
            </div>
          )}

          
          {step === 'preview' && (
            <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
              {aiGenerate.isPending && !result && (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#5B8A72] animate-[bounce_1s_ease-in-out_infinite]" />
                    <div className="w-3 h-3 rounded-full bg-[#5B8A72] animate-[bounce_1s_ease-in-out_0.15s_infinite]" />
                    <div className="w-3 h-3 rounded-full bg-[#5B8A72] animate-[bounce_1s_ease-in-out_0.3s_infinite]" />
                  </div>
                  <p className="text-sm text-[#6B7B8D] font-medium">
                    AI가 맞춤 질문지를 만들고 있어요...
                  </p>
                </div>
              )}

              {aiGenerate.isError && (
                <div className="py-8 text-center">
                  <p className="text-sm text-red-600 mb-4">생성에 실패했습니다. 다시 시도해주세요.</p>
                  <button
                    onClick={handleRegenerate}
                    className="px-5 py-2.5 rounded-[10px] bg-[#5B8A72] text-white text-sm font-medium hover:bg-[#3D6B54] transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {result && (
                <>
                  <div>
                    <h3 className="text-base font-semibold text-[#2C3E50] mb-1">
                      AI가 생성한 질문지
                    </h3>
                  </div>

                  <div className="rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E8E4DF]">
                      <h4 className="text-sm font-semibold text-[#2C3E50]">{result.name}</h4>
                      {result.description && (
                        <p className="text-xs text-[#6B7B8D] mt-0.5">{result.description}</p>
                      )}
                    </div>

                    <div className="divide-y divide-[#E8E4DF]">
                      {result.items.map((item, idx) => {
                        const domainInfo = DOMAIN_OPTIONS.find((d) => d.value === item.domain);
                        return (
                          <div key={idx} className="px-4 py-2.5 flex items-center gap-2.5">
                            <span
                              className="shrink-0 px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
                              style={{
                                backgroundColor: `${domainInfo?.color || '#C4B5A0'}18`,
                                color: domainInfo?.color || '#C4B5A0',
                              }}
                            >
                              {domainInfo?.label || '기타'}
                            </span>
                            <span className="text-sm text-[#2C3E50] line-clamp-1">{item.text}</span>
                          </div>
                        );
                      })}
                    </div>

                    {result.filterResult && (
                      <div className="px-4 py-2.5 border-t border-[#E8E4DF] bg-white">
                        <span className="text-xs font-medium" style={{
                          color: result.filterResult.overallRisk === 'LOW' ? '#5B8A72' :
                                 result.filterResult.overallRisk === 'MEDIUM' ? '#F0A86E' : '#E88B8B'
                        }}>
                          AI 검토 결과: {result.filterResult.overallRisk === 'LOW' ? '전체 안전 ✓' :
                                       result.filterResult.overallRisk === 'MEDIUM' ? '일부 주의 필요 ⚠' : '위험 항목 있음 ✗'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleRegenerate}
                      disabled={aiGenerate.isPending}
                      className="flex-1 h-[48px] rounded-[12px] border-[1.5px] border-[#5B8A72] text-[#5B8A72] text-[15px] font-semibold hover:bg-[#E8F5EE] disabled:opacity-40 transition-colors"
                    >
                      ← 다시 생성
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={createQuestionnaire.isPending}
                      className="flex-1 h-[48px] rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 transition-all"
                    >
                      {createQuestionnaire.isPending ? '저장 중...' : '저장하기 →'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          
          {step === 'done' && (
            <div className="py-10 flex flex-col items-center gap-5 animate-[fadeIn_0.2s_ease-out]">
              <div className="w-16 h-16 rounded-full bg-[#5B8A72]/10 flex items-center justify-center">
                <span className="text-3xl">🎉</span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-[#2C3E50] mb-1">
                  질문지가 생성됐어요!
                </h3>
                <p className="text-sm text-[#6B7B8D]">
                  질문지 목록에서 확인할 수 있어요.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-[48px] px-8 rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:-translate-y-[1px] active:translate-y-0 transition-all"
              >
                질문지 보기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
