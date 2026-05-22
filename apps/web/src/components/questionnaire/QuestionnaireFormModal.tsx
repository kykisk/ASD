import { useState, useEffect } from 'react';
import type { Domain, QuestionnaireItem, Questionnaire } from '../../hooks/use-questionnaires';
import { useCreateQuestionnaire } from '../../hooks/use-questionnaires';
import { useMyFamily } from '../../hooks/use-families';
import { useAiFilter, type AiFilterItemResult, type OverallRisk } from '../../hooks/use-questionnaire-ai';

const DOMAIN_OPTIONS: { value: Domain; label: string; color: string }[] = [
  { value: 'COMMUNICATION', label: '의사소통', color: '#7B9FD4' },
  { value: 'SOCIAL', label: '사회성', color: '#E8A87C' },
  { value: 'MOTOR', label: '운동', color: '#9B8EC4' },
  { value: 'COGNITIVE', label: '인지', color: '#7EC8C8' },
  { value: 'EMOTIONAL', label: '정서', color: '#F2B880' },
  { value: 'DAILY_LIVING', label: '일상생활', color: '#94B8A0' },
  { value: 'OTHER', label: '기타', color: '#C4B5A0' },
];

function getDomainInfo(domain: Domain) {
  return DOMAIN_OPTIONS.find((d) => d.value === domain) || DOMAIN_OPTIONS[6];
}

interface QuestionnaireFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuestionnaire?: Questionnaire | null;
}

export function QuestionnaireFormModal({
  isOpen,
  onClose,
  editingQuestionnaire,
}: QuestionnaireFormModalProps) {
  const { data: family } = useMyFamily();
  const createQuestionnaire = useCreateQuestionnaire(family?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const [items, setItems] = useState<QuestionnaireItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemDomain, setNewItemDomain] = useState<Domain>('COMMUNICATION');
  const [newItemText, setNewItemText] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('1.0');
  const [error, setError] = useState('');
  const [aiFilterResults, setAiFilterResults] = useState<AiFilterItemResult[] | null>(null);
  const [overallRisk, setOverallRisk] = useState<OverallRisk | null>(null);
  const [expandedRiskItem, setExpandedRiskItem] = useState<number | null>(null);

  const aiFilter = useAiFilter();

  useEffect(() => {
    if (isOpen) {
      setName(editingQuestionnaire?.name || '');
      setDescription(editingQuestionnaire?.description || '');
      setSelectedDomains(editingQuestionnaire?.domains as Domain[] || []);
      setItems(editingQuestionnaire?.items || []);
      setAiFilterResults(null);
      setOverallRisk(null);
    }
  }, [isOpen, editingQuestionnaire]);

  if (!isOpen) return null;

  const handleAiFilter = () => {
    if (items.length === 0) return;
    aiFilter.mutate(
      items.map((item) => ({ text: item.text, domain: item.domain })),
      {
        onSuccess: (data) => {
          setAiFilterResults(data.items);
          setOverallRisk(data.overallRisk);
        },
      },
    );
  };

  const applyAiSuggestions = () => {
    if (!aiFilterResults) return;
    const newItems = items.map((item, idx) => {
      const filterItem = aiFilterResults.find((r) => r.index === idx);
      if (filterItem?.riskLevel === 'HIGH_RISK' && filterItem.suggestedRevision) {
        return { ...item, text: filterItem.suggestedRevision };
      }
      return item;
    });
    setItems(newItems);
    setAiFilterResults(null);
    setOverallRisk(null);
    setExpandedRiskItem(null);
  };

  const getItemRisk = (index: number): AiFilterItemResult | undefined => {
    return aiFilterResults?.find((r) => r.index === index);
  };

  const toggleDomain = (domain: Domain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain],
    );
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const weight = parseFloat(newItemWeight) || 1.0;
    setItems((prev) => [
      ...prev,
      { domain: newItemDomain, text: newItemText.trim(), weight },
    ]);
    setNewItemText('');
    setNewItemWeight('1.0');
    setShowAddItem(false);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const handleSubmit = () => {
    setError('');
    if (!name.trim()) {
      setError('질문지 이름을 입력해주세요.');
      return;
    }
    if (selectedDomains.length === 0) {
      setError('최소 1개의 발달 영역을 선택해주세요.');
      return;
    }

    createQuestionnaire.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        domains: selectedDomains,
        items: items.map((item) => ({
          domain: item.domain,
          text: item.text,
          weight: item.weight,
        })),
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: () => {
          setError('저장에 실패했습니다. 다시 시도해주세요.');
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2C3E50]/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col bg-white rounded-[16px] border border-[#E8E4DF] shadow-[0_8px_32px_rgba(91,138,114,0.12)] animate-[fadeIn_0.2s_ease-out]">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF] shrink-0">
          <h2 className="text-lg font-bold text-[#2C3E50]">
            {editingQuestionnaire ? '질문지 수정' : '새 질문지 만들기'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-[12px] text-[#6B7B8D] hover:bg-[#FDFBF7] hover:text-[#2C3E50] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
              질문지 이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 일상 관찰 체크리스트"
              className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
              설명 <span className="text-[#94A3B4] text-xs font-normal">(선택)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="질문지에 대한 간단한 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 transition-all resize-none"
            />
          </div>

          {/* Domains */}
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
              발달 영역 <span className="text-red-400">*</span>
              <span className="text-[#94A3B4] text-xs font-normal ml-2">1개 이상 선택</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map((domain) => {
                const isSelected = selectedDomains.includes(domain.value);
                return (
                  <button
                    key={domain.value}
                    type="button"
                    onClick={() => toggleDomain(domain.value)}
                    className="px-3.5 py-2 rounded-[10px] text-sm font-medium transition-all border"
                    style={{
                      backgroundColor: isSelected ? `${domain.color}18` : '#FDFBF7',
                      borderColor: isSelected ? domain.color : '#E8E4DF',
                      color: isSelected ? domain.color : '#6B7B8D',
                    }}
                  >
                    {domain.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[#2C3E50]">
                문항 관리
                {items.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[#94A3B4]">
                    {items.length}개
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAiFilter}
                    disabled={aiFilter.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#5B8A72] hover:bg-[#5B8A72]/[0.08] rounded-[8px] transition-colors disabled:opacity-50"
                  >
                    <span className="text-xs">✨</span>
                    {aiFilter.isPending ? 'AI 분석 중...' : 'AI 라이선스 필터 검토'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5B8A72] hover:bg-[#5B8A72]/[0.08] rounded-[8px] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  문항 추가
                </button>
              </div>
            </div>

            {aiFilter.isPending && (
              <div className="mb-3 px-4 py-3 rounded-[12px] bg-[#5B8A72]/[0.05] border border-[#5B8A72]/20 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5B8A72] animate-[pulse_1s_ease-in-out_infinite]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5B8A72] animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5B8A72] animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                </div>
                <span className="text-sm text-[#5B8A72] font-medium">AI가 문항을 분석 중입니다...</span>
              </div>
            )}

            {overallRisk && (
              <div className={`mb-3 px-4 py-3 rounded-[12px] border flex items-center justify-between ${
                overallRisk === 'LOW' ? 'bg-[#5B8A72]/[0.05] border-[#5B8A72]/20' :
                overallRisk === 'MEDIUM' ? 'bg-[#F0A86E]/[0.08] border-[#F0A86E]/30' :
                'bg-[#E88B8B]/[0.08] border-[#E88B8B]/30'
              }`}>
                <span className={`text-sm font-medium ${
                  overallRisk === 'LOW' ? 'text-[#5B8A72]' :
                  overallRisk === 'MEDIUM' ? 'text-[#D4851F]' :
                  'text-[#C0504D]'
                }`}>
                  {overallRisk === 'LOW' && '✓ 전체 안전 — 라이선스 위반 위험이 낮습니다'}
                  {overallRisk === 'MEDIUM' && '⚠ 주의 필요 — 일부 문항을 검토해주세요'}
                  {overallRisk === 'HIGH' && '✗ 위험 — 라이선스 위반 가능성이 있습니다'}
                </span>
                {(overallRisk === 'MEDIUM' || overallRisk === 'HIGH') && aiFilterResults?.some(r => r.riskLevel === 'HIGH_RISK' && r.suggestedRevision) && (
                  <button
                    type="button"
                    onClick={applyAiSuggestions}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#5B8A72] rounded-[8px] hover:bg-[#3D6B54] transition-colors"
                  >
                    적용
                  </button>
                )}
              </div>
            )}

            {/* Items List */}
            {items.length === 0 && !showAddItem && (
              <div className="py-8 text-center rounded-[12px] border border-dashed border-[#E8E4DF] bg-[#FDFBF7]/50">
                <p className="text-sm text-[#94A3B4]">
                  아직 문항이 없습니다. 문항을 추가해주세요.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item, index) => {
                const domainInfo = getDomainInfo(item.domain);
                const risk = getItemRisk(index);
                return (
                  <div key={index}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border bg-white hover:border-[#5B8A72]/30 transition-colors group ${
                        risk?.riskLevel === 'HIGH_RISK' ? 'border-[#E88B8B]/50' :
                        risk?.riskLevel === 'CAUTION' ? 'border-[#F0A86E]/50' :
                        'border-[#E8E4DF]'
                      }`}
                    >
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-[6px] text-xs font-medium"
                        style={{
                          backgroundColor: `${domainInfo.color}18`,
                          color: domainInfo.color,
                        }}
                      >
                        {domainInfo.label}
                      </span>

                      <span className="flex-1 text-sm text-[#2C3E50] truncate">
                        {item.text}
                      </span>

                      {risk && (
                        <span className={`shrink-0 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold ${
                          risk.riskLevel === 'SAFE' ? 'bg-[#5B8A72]/10 text-[#5B8A72]' :
                          risk.riskLevel === 'CAUTION' ? 'bg-[#F0A86E]/15 text-[#D4851F]' :
                          'bg-[#E88B8B]/15 text-[#C0504D]'
                        }`}>
                          {risk.riskLevel === 'SAFE' && '✓ 안전'}
                          {risk.riskLevel === 'CAUTION' && '⚠ 주의'}
                          {risk.riskLevel === 'HIGH_RISK' && '✗ 위험'}
                        </span>
                      )}

                      <span className="shrink-0 text-xs text-[#94A3B4] font-medium">
                        {item.weight}
                      </span>

                      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded text-[#94A3B4] hover:text-[#2C3E50] disabled:opacity-30"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 rounded text-[#94A3B4] hover:text-[#2C3E50] disabled:opacity-30"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 rounded text-[#94A3B4] hover:text-red-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {risk?.riskLevel === 'HIGH_RISK' && risk.suggestedRevision && (
                      <div className="ml-4 mt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedRiskItem(expandedRiskItem === index ? null : index)}
                          className="text-xs text-[#C0504D] font-medium hover:underline"
                        >
                          {expandedRiskItem === index ? '▾ 수정 제안 접기' : '▸ 수정 제안 보기'}
                        </button>
                        {expandedRiskItem === index && (
                          <div className="mt-1.5 px-3 py-2 rounded-[8px] bg-[#E88B8B]/[0.06] border border-[#E88B8B]/20 text-xs text-[#6B7B8D]">
                            <span className="font-medium text-[#2C3E50]">제안:</span> {risk.suggestedRevision}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Item Inline Form */}
            {showAddItem && (
              <div className="mt-3 p-4 rounded-[12px] border border-[#5B8A72]/30 bg-[#5B8A72]/[0.03]">
                <div className="grid grid-cols-[auto_1fr_80px] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-[#6B7B8D] mb-1">영역</label>
                    <select
                      value={newItemDomain}
                      onChange={(e) => setNewItemDomain(e.target.value as Domain)}
                      className="px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-white text-sm text-[#2C3E50] focus:outline-none focus:border-[#5B8A72]"
                    >
                      {DOMAIN_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7B8D] mb-1">문항 내용</label>
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="질문 내용을 입력하세요"
                      className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-white text-sm text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItem();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7B8D] mb-1">가중치</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={newItemWeight}
                      onChange={(e) => setNewItemWeight(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-white text-sm text-[#2C3E50] focus:outline-none focus:border-[#5B8A72]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddItem(false)}
                    className="px-3 py-1.5 text-sm font-medium text-[#6B7B8D] hover:text-[#2C3E50] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!newItemText.trim()}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-[#5B8A72] rounded-[8px] hover:bg-[#3D6B54] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E4DF] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-[48px] px-6 rounded-[12px] border-[1.5px] border-[#5B8A72] text-[#5B8A72] text-[15px] font-semibold hover:bg-[#E8F5EE] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createQuestionnaire.isPending}
            className="h-[48px] px-8 rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:shadow-[0_6px_16px_rgba(91,138,114,0.3)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {createQuestionnaire.isPending ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
