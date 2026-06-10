import { useState, useEffect } from 'react';
import { useChildStore } from '../../stores/child.store.js';
import {
  useCreateMedication,
  useUpdateMedication,
  type Medication,
  type CreateMedicationInput,
  type UpdateMedicationInput,
} from '../../hooks/use-medications.js';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication?: Medication | null;
}

const METHOD_OPTIONS = ['경구', '주사', '패치', '흡입', '기타'];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MedicationModal({ isOpen, onClose, medication }: MedicationModalProps) {
  const { selectedChildId } = useChildStore();
  const createMutation = useCreateMedication(selectedChildId);
  const updateMutation = useUpdateMedication();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [method, setMethod] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (medication) {
      setName(medication.name);
      setDosage(medication.dosage || '');
      setMethod(medication.method || '');
      setPrescribedBy(medication.prescribedBy || '');
      setStartDate(medication.startDate ? medication.startDate.slice(0, 10) : todayStr());
      setEndDate(medication.endDate ? medication.endDate.slice(0, 10) : '');
      setFrequency(medication.frequency || '');
      setNotes(medication.notes || '');
    } else {
      setName('');
      setDosage('');
      setMethod('');
      setPrescribedBy('');
      setStartDate(todayStr());
      setEndDate('');
      setFrequency('');
      setNotes('');
    }
  }, [medication, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (medication) {
      const input: UpdateMedicationInput = {
        id: medication.id,
        name: name.trim(),
        dosage: dosage.trim() || null,
        method: method || null,
        prescribedBy: prescribedBy.trim() || null,
        startDate,
        endDate: endDate || null,
        frequency: frequency.trim() || null,
        notes: notes.trim() || null,
      };
      await updateMutation.mutateAsync(input);
    } else {
      const input: CreateMedicationInput = {
        name: name.trim(),
        dosage: dosage.trim() || null,
        method: method || null,
        prescribedBy: prescribedBy.trim() || null,
        startDate,
        endDate: endDate || null,
        frequency: frequency.trim() || null,
        notes: notes.trim() || null,
      };
      await createMutation.mutateAsync(input);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-[#e8e4df] shadow-[0_8px_32px_rgba(91,138,114,0.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e8e4df] px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-800">
              {medication ? '약물 수정' : '약물 추가'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
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
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 약물명 (필수) */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              약물명 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 리스페리돈"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 용량 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">용량</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="예: 0.5mg"
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 투약방법 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">투약방법</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            >
              <option value="">선택 안 함</option>
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 처방의사/병원 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              처방의사/병원
            </label>
            <input
              type="text"
              value={prescribedBy}
              onChange={(e) => setPrescribedBy(e.target.value)}
              placeholder="예: 서울아동병원 김OO 의사"
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 복약시작일 / 복약종료일 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                복약시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                복약종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
              />
            </div>
          </div>

          {/* 복약주기 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">복약주기</label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="예: 1일 2회 (아침, 저녁)"
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="참고사항이 있으면 기록하세요"
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all resize-none"
            />
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 leading-relaxed">
            ⚠️ 약물 추가 또는 변경 시 반드시 담당 의료진과 상담하세요. 이 앱은 복약 기록 보조 도구일
            뿐 의료적 판단을 제공하지 않습니다.
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all min-h-[48px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#5B8A72] hover:bg-[#3d6b54] disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] shadow-[0_2px_8px_rgba(91,138,114,0.2)]"
            >
              {isPending ? '저장 중...' : medication ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
