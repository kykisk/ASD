import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useCreateClinicalReport,
  useExtractFromImage,
  type SectionScore,
  type ClinicalReportExtraction,
} from '../../hooks/use-clinical-reports';

type TabKey = 'image' | 'manual';

const ANALYSIS_STEPS = [
  { delay: 0, icon: '📷', text: '이미지 분석 중...' },
  { delay: 2000, icon: '🔍', text: '내용 추출 중...' },
  { delay: 5000, icon: '📋', text: '보고서 정리 중...' },
  { delay: 9000, icon: '✨', text: '완료 중...' },
];

function AnalysisProgress() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers = ANALYSIS_STEPS.slice(1).map((s, i) =>
      setTimeout(() => setStepIdx(i + 1), s.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const current = ANALYSIS_STEPS[stepIdx];
  const progress = Math.min(((stepIdx + 1) / ANALYSIS_STEPS.length) * 100, 95);

  return (
    <div className="px-4 py-5 rounded-[12px] bg-[#5B8A72]/[0.05] border border-[#5B8A72]/20">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">{current.icon}</span>
        <span className="text-sm font-medium text-[#5B8A72] transition-all duration-300">
          {current.text}
        </span>
      </div>
      <div className="h-1.5 bg-[#5B8A72]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#5B8A72] rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  childId: string | null;
}

export function ClinicalReportModal({ isOpen, onClose, childId }: Props) {
  const createReport = useCreateClinicalReport(childId);
  const extractFromImage = useExtractFromImage(childId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('image');
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Form state (shared between manual input and extraction preview)
  const [assessmentTool, setAssessmentTool] = useState('');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [evaluatorType, setEvaluatorType] = useState('');
  const [institution, setInstitution] = useState('');
  const [totalScore, setTotalScore] = useState<string>('');
  const [totalScoreUnit, setTotalScoreUnit] = useState('점');
  const [sectionScores, setSectionScores] = useState<SectionScore[]>([]);
  const [clinicalFindings, setClinicalFindings] = useState('');

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback(() => {
    setActiveTab('image');
    setStep('input');
    setSelectedFiles([]);
    setIsDragging(false);
    setAssessmentTool('');
    setAssessmentDate('');
    setEvaluatorType('');
    setInstitution('');
    setTotalScore('');
    setTotalScoreUnit('점');
    setSectionScores([]);
    setClinicalFindings('');
    setError('');
    setIsSaving(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const populateFromExtraction = (ext: ClinicalReportExtraction) => {
    setAssessmentTool(ext.assessmentTool || '');
    setAssessmentDate(ext.assessmentDate || '');
    setEvaluatorType(ext.evaluatorType || '');
    setInstitution(ext.institution || '');
    setTotalScore(ext.totalScore !== null ? String(ext.totalScore) : '');
    setTotalScoreUnit(ext.totalScoreUnit || '점');
    setSectionScores(ext.sectionScores || []);
    setClinicalFindings(ext.clinicalFindings || '');
  };

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

    extractFromImage.mutate(images, {
      onSuccess: (result) => {
        populateFromExtraction(result.extraction);
        setStep('preview');
      },
      onError: () => {
        setError('이미지 분석에 실패했습니다. 다시 시도해주세요.');
      },
    });
  };

  const handleSave = async () => {
    setError('');
    if (!assessmentTool.trim()) {
      setError('평가 도구명을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      await createReport.mutateAsync({
        assessmentTool: assessmentTool.trim(),
        assessmentDate: assessmentDate || null,
        evaluatorType: evaluatorType || null,
        institution: institution || null,
        sectionScores,
        totalScore: totalScore ? Number(totalScore) : null,
        totalScoreUnit: totalScoreUnit || null,
        clinicalFindings: clinicalFindings || null,
        source: activeTab === 'image' ? 'IMAGE_IMPORT' : 'MANUAL',
      });
      handleClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // Section score management
  const addSectionScore = () => {
    setSectionScores((prev) => [...prev, { name: '', score: null, unit: '점', percentile: null }]);
  };

  const updateSectionScore = (
    index: number,
    field: keyof SectionScore,
    value: string | number | null,
  ) => {
    setSectionScores((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeSectionScore = (index: number) => {
    setSectionScores((prev) => prev.filter((_, i) => i !== index));
  };

  const renderForm = () => (
    <div className="space-y-4">
      {/* 평가 도구명 */}
      <div>
        <label className="block text-sm font-semibold text-[#2C3E50] mb-1.5">
          평가 도구명 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={assessmentTool}
          onChange={(e) => setAssessmentTool(e.target.value)}
          placeholder="예: PRES 언어발달검사, K-WISC-V"
          className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 transition-all text-sm"
        />
      </div>

      {/* 날짜 + 평가사 + 기관 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7B8D] mb-1.5">평가 날짜</label>
          <input
            type="date"
            value={assessmentDate}
            onChange={(e) => setAssessmentDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] text-sm focus:outline-none focus:border-[#5B8A72]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7B8D] mb-1.5">평가사 직종</label>
          <input
            type="text"
            value={evaluatorType}
            onChange={(e) => setEvaluatorType(e.target.value)}
            placeholder="언어치료사"
            className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] text-sm focus:outline-none focus:border-[#5B8A72]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7B8D] mb-1.5">기관명</label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="OO 발달센터"
            className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] text-sm focus:outline-none focus:border-[#5B8A72]"
          />
        </div>
      </div>

      {/* 전체 점수 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7B8D] mb-1.5">전체 점수</label>
          <input
            type="number"
            value={totalScore}
            onChange={(e) => setTotalScore(e.target.value)}
            placeholder="78"
            className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] text-sm focus:outline-none focus:border-[#5B8A72]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7B8D] mb-1.5">단위</label>
          <input
            type="text"
            value={totalScoreUnit}
            onChange={(e) => setTotalScoreUnit(e.target.value)}
            placeholder="점"
            className="w-full px-3 py-2.5 rounded-[10px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] text-sm focus:outline-none focus:border-[#5B8A72]"
          />
        </div>
      </div>

      {/* 섹션별 점수 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-[#2C3E50]">
            섹션별 점수
            {sectionScores.length > 0 && (
              <span className="ml-2 text-xs font-normal text-[#94A3B4]">
                {sectionScores.length}개
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={addSectionScore}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5B8A72] hover:bg-[#5B8A72]/[0.08] rounded-[8px] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            섹션 추가
          </button>
        </div>

        {sectionScores.length > 0 && (
          <div className="space-y-2">
            {sectionScores.map((section, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 rounded-[10px] border border-[#E8E4DF] bg-white group"
              >
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => updateSectionScore(idx, 'name', e.target.value)}
                  placeholder="영역명"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-[8px] border border-[#E8E4DF] bg-[#FDFBF7] text-xs text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72]"
                />
                <input
                  type="number"
                  value={section.score ?? ''}
                  onChange={(e) =>
                    updateSectionScore(
                      idx,
                      'score',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                  placeholder="점수"
                  className="w-16 px-2 py-1.5 rounded-[8px] border border-[#E8E4DF] bg-[#FDFBF7] text-xs text-[#2C3E50] text-center placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72]"
                />
                <input
                  type="text"
                  value={section.unit ?? ''}
                  onChange={(e) => updateSectionScore(idx, 'unit', e.target.value)}
                  placeholder="단위"
                  className="w-12 px-2 py-1.5 rounded-[8px] border border-[#E8E4DF] bg-[#FDFBF7] text-xs text-[#2C3E50] text-center placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72]"
                />
                <input
                  type="number"
                  value={section.percentile ?? ''}
                  onChange={(e) =>
                    updateSectionScore(
                      idx,
                      'percentile',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                  placeholder="%ile"
                  className="w-16 px-2 py-1.5 rounded-[8px] border border-[#E8E4DF] bg-[#FDFBF7] text-xs text-[#2C3E50] text-center placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72]"
                />
                <button
                  onClick={() => removeSectionScore(idx)}
                  className="shrink-0 p-1 rounded text-[#94A3B4] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 소견 */}
      <div>
        <label className="block text-xs font-medium text-[#6B7B8D] mb-1.5">소견</label>
        <textarea
          value={clinicalFindings}
          onChange={(e) => setClinicalFindings(e.target.value)}
          rows={3}
          placeholder="임상 소견을 입력하세요..."
          className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] text-sm focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 resize-none transition-all"
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2C3E50]/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col bg-white rounded-[16px] border border-[#E8E4DF] shadow-[0_8px_32px_rgba(91,138,114,0.12)] animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF] shrink-0">
          <h2 className="text-lg font-bold text-[#2C3E50]">📋 보고서 추가</h2>
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

        {/* Tab switcher */}
        {step === 'input' && (
          <div className="flex gap-1 px-6 pt-4 shrink-0">
            {[
              { key: 'image' as const, label: '📷 이미지 업로드' },
              { key: 'manual' as const, label: '✏️ 직접 입력' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#5B8A72] text-white shadow-sm'
                    : 'text-[#6B7B8D] hover:bg-[#5B8A72]/[0.05]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Image upload tab */}
          {step === 'input' && activeTab === 'image' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7B8D]">
                임상 보고서 사진을 업로드하면 AI가 내용을 추출합니다. (최대 5장)
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
                  보고서 이미지를 드래그하거나 클릭하여 선택
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

              {/* Analysis progress */}
              {extractFromImage.isPending && <AnalysisProgress />}

              {/* Selected files */}
              {selectedFiles.length > 0 && !extractFromImage.isPending && (
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
            </div>
          )}

          {/* Manual input tab */}
          {step === 'input' && activeTab === 'manual' && renderForm()}

          {/* Extraction preview (editable) */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-[12px] bg-[#E8F5EE] border border-[#5B8A72]/20">
                <p className="text-sm font-medium text-[#5B8A72]">
                  ✅ AI가 보고서 내용을 추출했습니다. 아래 내용을 확인 후 저장하세요.
                </p>
              </div>
              {renderForm()}
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

          {step === 'input' && activeTab === 'image' && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={selectedFiles.length === 0 || extractFromImage.isPending}
              className="h-[48px] px-8 rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:shadow-[0_6px_16px_rgba(91,138,114,0.3)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {extractFromImage.isPending ? '분석 중...' : '분석하기'}
            </button>
          )}

          {(step === 'preview' || (step === 'input' && activeTab === 'manual')) && (
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
