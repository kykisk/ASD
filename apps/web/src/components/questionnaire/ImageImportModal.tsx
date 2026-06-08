import { useState, useRef, useCallback } from 'react';
import { useMyFamily } from '../../hooks/use-families';
import { useChildStore } from '../../stores/child.store';
import {
  useCreateQuestionnaire,
  useImportFromImage,
  type Domain,
} from '../../hooks/use-questionnaires';
import { useCreateAssessment } from '../../hooks/use-assessments';

const DOMAIN_OPTIONS = [
  { value: 'COMMUNICATION', label: '의사소통' },
  { value: 'SOCIAL', label: '사회성' },
  { value: 'MOTOR', label: '운동' },
  { value: 'COGNITIVE', label: '인지' },
  { value: 'EMOTIONAL', label: '정서' },
  { value: 'DAILY_LIVING', label: '일상생활' },
  { value: 'OTHER', label: '기타' },
] as const;

interface ExtractionItem {
  text: string;
  domain: string;
  score: number | null;
  description?: string;
}

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageImportModal({ isOpen, onClose }: ImageImportModalProps) {
  const { data: family } = useMyFamily();
  const { selectedChildId } = useChildStore();
  const importFromImage = useImportFromImage(family?.id ?? null);
  const createQuestionnaire = useCreateQuestionnaire(family?.id);
  const createAssessment = useCreateAssessment();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Preview/Edit state
  const [name, setName] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [items, setItems] = useState<ExtractionItem[]>([]);
  const [saveScores, setSaveScores] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback(() => {
    setStep('upload');
    setSelectedFiles([]);
    setIsDragging(false);
    setName('');
    setDomains([]);
    setItems([]);
    setSaveScores(true);
    setError('');
    setIsSaving(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files)
      .filter((f) => f.type === 'image/jpeg' || f.type === 'image/png')
      .slice(0, 5);
    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    setError('');
    const images: Array<{ base64: string; mimeType: string }> = [];

    for (const file of selectedFiles) {
      const base64 = await fileToBase64(file);
      images.push({ base64, mimeType: file.type });
    }

    importFromImage.mutate(images, {
      onSuccess: (data) => {
        const ext = data.extraction;
        setName(ext.name);
        setDomains(ext.domains);
        setItems(ext.items);
        setStep('preview');
      },
      onError: () => {
        setError('이미지 분석에 실패했습니다. 다시 시도해주세요.');
      },
    });
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('질문지 이름을 입력해주세요.');
      return;
    }
    if (items.length === 0) {
      setError('최소 1개의 문항이 필요합니다.');
      return;
    }

    setIsSaving(true);

    try {
      const questionnaire = await createQuestionnaire.mutateAsync({
        name: name.trim(),
        domains: domains as Domain[],
        items: items.map((item, idx) => ({
          domain: item.domain as Domain,
          text: item.text,
          weight: 1.0,
          orderIndex: idx,
        })),
      });

      const hasScores = items.some((item) => item.score !== null);
      if (saveScores && hasScores && selectedChildId && questionnaire.items) {
        const scores = items
          .map((item, idx) => {
            if (item.score === null) return null;
            const savedItem = questionnaire.items[idx];
            if (!savedItem?.id) return null;
            return {
              itemId: savedItem.id,
              domain: item.domain,
              score: item.score,
            };
          })
          .filter((s): s is { itemId: string; domain: string; score: number } => s !== null);

        if (scores.length > 0) {
          await createAssessment.mutateAsync({
            childId: selectedChildId,
            input: {
              questionnaireId: questionnaire.id,
              scores,
            },
          });
        }
      }

      handleClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // Domain tag management
  const addDomain = (domain: string) => {
    if (!domains.includes(domain)) {
      setDomains((prev) => [...prev, domain]);
    }
  };

  const removeDomain = (domain: string) => {
    setDomains((prev) => prev.filter((d) => d !== domain));
  };

  // Item management
  const updateItem = (
    index: number,
    field: keyof ExtractionItem,
    value: string | number | null,
  ) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { text: '', domain: domains[0] || 'OTHER', score: null }]);
  };

  const hasAnyScore = items.some((item) => item.score !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2C3E50]/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col bg-white rounded-[16px] border border-[#E8E4DF] shadow-[0_8px_32px_rgba(91,138,114,0.12)] animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF] shrink-0">
          <h2 className="text-lg font-bold text-[#2C3E50]">📷 사진으로 가져오기</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-[12px] text-[#6B7B8D] hover:bg-[#FDFBF7] hover:text-[#2C3E50] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7B8D]">
                질문지 사진을 업로드하면 AI가 문항을 추출합니다. (최대 5장)
              </p>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center py-12 rounded-[12px] border-2 border-dashed cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#5B8A72] bg-[#5B8A72]/[0.05]'
                    : 'border-[#E8E4DF] bg-[#FDFBF7] hover:border-[#5B8A72]/50 hover:bg-[#5B8A72]/[0.02]'
                }`}
              >
                <svg
                  className="w-10 h-10 text-[#94A3B4] mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                  />
                </svg>
                <span className="text-sm font-medium text-[#6B7B8D]">
                  이미지를 드래그하거나 클릭하여 선택
                </span>
                <span className="text-xs text-[#94A3B4] mt-1">JPG, PNG (최대 5장)</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />

              {/* Selected files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-white"
                    >
                      <svg
                        className="w-4 h-4 text-[#5B8A72] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                      <span className="flex-1 text-sm text-[#2C3E50] truncate">{file.name}</span>
                      <span className="text-xs text-[#94A3B4]">{formatFileSize(file.size)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="p-1 rounded text-[#94A3B4] hover:text-red-500 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading state */}
              {importFromImage.isPending && (
                <div className="flex items-center gap-3 px-4 py-4 rounded-[12px] bg-[#5B8A72]/[0.05] border border-[#5B8A72]/20">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#5B8A72] animate-[pulse_1s_ease-in-out_infinite]" />
                    <div className="w-2 h-2 rounded-full bg-[#5B8A72] animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                    <div className="w-2 h-2 rounded-full bg-[#5B8A72] animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                  </div>
                  <span className="text-sm font-medium text-[#5B8A72]">
                    AI가 이미지를 분석하고 있습니다...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview/Edit */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                  질문지 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 transition-all"
                />
              </div>

              {/* Domain tags */}
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-2">발달 영역</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {domains.map((domain) => {
                    const opt = DOMAIN_OPTIONS.find((o) => o.value === domain);
                    return (
                      <span
                        key={domain}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium bg-[#5B8A72]/10 text-[#5B8A72]"
                      >
                        {opt?.label ?? domain}
                        <button
                          onClick={() => removeDomain(domain)}
                          className="hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addDomain(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-2 rounded-[10px] border border-[#E8E4DF] bg-white text-sm text-[#6B7B8D] focus:outline-none focus:border-[#5B8A72]"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + 영역 추가
                  </option>
                  {DOMAIN_OPTIONS.filter((o) => !domains.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-[#2C3E50]">
                    추출된 문항
                    <span className="ml-2 text-xs font-normal text-[#94A3B4]">
                      {items.length}개
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5B8A72] hover:bg-[#5B8A72]/[0.08] rounded-[8px] transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    문항 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-[12px] border border-[#E8E4DF] bg-white hover:border-[#5B8A72]/30 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-[#5B8A72]/10 flex items-center justify-center text-xs font-semibold text-[#5B8A72]">
                          {idx + 1}
                        </span>
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={item.text}
                            onChange={(e) => updateItem(idx, 'text', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-[8px] border border-[#E8E4DF] bg-[#FDFBF7] text-sm text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] resize-none"
                            placeholder="문항 내용"
                          />
                          <div className="flex items-center gap-3">
                            <select
                              value={item.domain}
                              onChange={(e) => updateItem(idx, 'domain', e.target.value)}
                              className="px-2.5 py-1.5 rounded-[8px] border border-[#E8E4DF] bg-white text-xs text-[#2C3E50] focus:outline-none focus:border-[#5B8A72]"
                            >
                              {DOMAIN_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-[#94A3B4]">점수</label>
                              <input
                                type="number"
                                min={1}
                                max={5}
                                value={item.score ?? ''}
                                onChange={(e) =>
                                  updateItem(
                                    idx,
                                    'score',
                                    e.target.value === '' ? null : Number(e.target.value),
                                  )
                                }
                                placeholder="—"
                                className="w-14 px-2 py-1.5 rounded-[8px] border border-[#E8E4DF] bg-white text-xs text-[#2C3E50] text-center focus:outline-none focus:border-[#5B8A72]"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          className="shrink-0 p-1.5 rounded-[8px] text-[#94A3B4] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save scores checkbox */}
              {hasAnyScore && (
                <label className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[#FDFBF7] border border-[#E8E4DF] cursor-pointer hover:border-[#5B8A72]/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={saveScores}
                    onChange={(e) => setSaveScores(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8E4DF] text-[#5B8A72] focus:ring-[#5B8A72]/20"
                  />
                  <span className="text-sm text-[#2C3E50]">
                    ☑ 답변(점수)도 함께 저장하여 평가 기록 생성
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E4DF] shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-[48px] px-6 rounded-[12px] border-[1.5px] border-[#5B8A72] text-[#5B8A72] text-[15px] font-semibold hover:bg-[#E8F5EE] transition-colors"
          >
            취소
          </button>

          {step === 'upload' && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={selectedFiles.length === 0 || importFromImage.isPending}
              className="h-[48px] px-8 rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:shadow-[0_6px_16px_rgba(91,138,114,0.3)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {importFromImage.isPending ? '분석 중...' : '분석하기'}
            </button>
          )}

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-[48px] px-8 rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:shadow-[0_6px_16px_rgba(91,138,114,0.3)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
