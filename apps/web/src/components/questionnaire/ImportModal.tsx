import { useState, useRef } from 'react';
import { useImportQuestionnaire } from '../../hooks/use-questionnaires';
import { useAuthStore } from '../../stores/auth.store';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'csv' | 'excel'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importCsv = useImportQuestionnaire(user?.familyId, 'csv');
  const importExcel = useImportQuestionnaire(user?.familyId, 'excel');
  const importMutation = activeTab === 'csv' ? importCsv : importExcel;

  if (!isOpen) return null;

  const acceptedTypes = activeTab === 'csv'
    ? '.csv,text/csv'
    : '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleImport = () => {
    setError('');
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    if (!name.trim()) {
      setError('질문지 이름을 입력해주세요.');
      return;
    }

    importMutation.mutate(
      { file, name: name.trim() },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => {
            onClose();
            setSuccess(false);
            setFile(null);
            setName('');
          }, 1500);
        },
        onError: () => {
          setError('가져오기에 실패했습니다. 파일 형식을 확인해주세요.');
        },
      },
    );
  };

  const resetAndSwitchTab = (tab: 'csv' | 'excel') => {
    setActiveTab(tab);
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[#2C3E50]/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg mx-4 bg-white rounded-[16px] border border-[#E8E4DF] shadow-[0_8px_32px_rgba(91,138,114,0.12)] animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF]">
          <h2 className="text-lg font-bold text-[#2C3E50]">파일로 가져오기</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-[12px] text-[#6B7B8D] hover:bg-[#FDFBF7] hover:text-[#2C3E50] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-[12px] bg-[#FDFBF7] border border-[#E8E4DF]">
            {(['csv', 'excel'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => resetAndSwitchTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#5B8A72] shadow-[0_2px_8px_rgba(91,138,114,0.06)]'
                    : 'text-[#6B7B8D] hover:text-[#2C3E50]'
                }`}
              >
                {tab === 'csv' ? 'CSV' : 'Excel'}
              </button>
            ))}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-[12px] bg-[#E8F5EE] border border-[#5B8A72]/20 text-sm text-[#3D6B54] font-medium">
              가져오기가 완료되었습니다!
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center py-10 px-4 rounded-[12px] border-2 border-dashed cursor-pointer transition-all ${
              dragOver
                ? 'border-[#5B8A72] bg-[#5B8A72]/[0.04]'
                : file
                ? 'border-[#5B8A72]/40 bg-[#E8F5EE]/30'
                : 'border-[#E8E4DF] bg-[#FDFBF7] hover:border-[#5B8A72]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <>
                <div className="w-10 h-10 rounded-full bg-[#E8F5EE] flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#5B8A72]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#2C3E50]">{file.name}</p>
                <p className="text-xs text-[#94A3B4] mt-1">
                  {(file.size / 1024).toFixed(1)}KB
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-[#FDFBF7] border border-[#E8E4DF] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#94A3B4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#2C3E50]">
                  파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-xs text-[#94A3B4] mt-1">
                  {activeTab === 'csv' ? '.csv 파일' : '.xlsx, .xls 파일'}
                </p>
              </>
            )}
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
              질문지 이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="가져올 질문지의 이름을 입력하세요"
              className="w-full px-4 py-3 rounded-[12px] border border-[#E8E4DF] bg-[#FDFBF7] text-[#2C3E50] placeholder:text-[#94A3B4] focus:outline-none focus:border-[#5B8A72] focus:ring-2 focus:ring-[#5B8A72]/15 transition-all"
            />
          </div>

          {/* Example Format */}
          <div>
            <button
              type="button"
              onClick={() => setShowExample(!showExample)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#6B7B8D] hover:text-[#5B8A72] transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showExample ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              예상 파일 형식 보기
            </button>
            {showExample && (
              <div className="mt-2 p-3 rounded-[10px] bg-[#2C3E50] text-xs font-mono text-green-300 overflow-x-auto">
                <p className="text-[#94A3B4]">domain,text,description,weight</p>
                <p>COMMUNICATION,오늘 말로 요구를 표현했나요?,언어적 요청,1.0</p>
                <p>SOCIAL,또래와 눈 맞춤이 있었나요?,,1.5</p>
                <p>MOTOR,소근육 활동을 수행했나요?,그리기/오리기,1.0</p>
              </div>
            )}
            <p className="mt-2 text-xs text-[#94A3B4]">
              사용 가능한 영역: COMMUNICATION, SOCIAL, MOTOR, COGNITIVE, EMOTIONAL, DAILY_LIVING, OTHER
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E4DF]">
          <button
            type="button"
            onClick={onClose}
            className="h-[48px] px-6 rounded-[12px] border-[1.5px] border-[#5B8A72] text-[#5B8A72] text-[15px] font-semibold hover:bg-[#E8F5EE] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importMutation.isPending || !file || !name.trim()}
            className="h-[48px] px-8 rounded-[12px] bg-[#5B8A72] text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(91,138,114,0.25)] hover:bg-[#3D6B54] hover:shadow-[0_6px_16px_rgba(91,138,114,0.3)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {importMutation.isPending ? '가져오는 중...' : '가져오기'}
          </button>
        </div>
      </div>
    </div>
  );
}
