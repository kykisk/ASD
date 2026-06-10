import { useState, useMemo } from 'react';
import { useChildStore } from '../stores/child.store.js';
import {
  useMedications,
  useMedicationLogs,
  useMedicationSummary,
  useUpdateMedication,
  useDeleteMedication,
  useUpsertMedicationLog,
  type Medication,
  type MedicationLog,
  type MedicationSummary,
} from '../hooks/use-medications.js';
import { MedicationModal } from '../components/medication/MedicationModal.js';
import { PageHeader } from '../components/ui/index.js';

type MedTab = 'list' | 'logs' | 'summary';

const TABS: { key: MedTab; label: string }[] = [
  { key: 'list', label: '약물 목록' },
  { key: 'logs', label: '복용 기록' },
  { key: 'summary', label: '진료 요약' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Tab 1: 약물 목록 ───────────────────────────────────────────────────────
function MedicationListTab({
  childId,
  onEdit,
}: {
  childId: string;
  onEdit: (med: Medication) => void;
}) {
  const { data: medications, isLoading } = useMedications(childId);
  const updateMutation = useUpdateMedication();
  const deleteMutation = useDeleteMedication(childId);
  const [showInactive, setShowInactive] = useState(false);

  const activeMeds = medications?.filter((m) => m.isActive) || [];
  const inactiveMeds = medications?.filter((m) => !m.isActive) || [];

  const handleDeactivate = (med: Medication) => {
    if (window.confirm(`'${med.name}' 복용을 종료하시겠습니까?`)) {
      updateMutation.mutate({ id: med.id, isActive: false });
    }
  };

  const handleDelete = (med: Medication) => {
    if (
      window.confirm(`'${med.name}'을(를) 완전히 삭제하시겠습니까? 복용 기록도 함께 삭제됩니다.`)
    ) {
      deleteMutation.mutate(med.id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
        <div className="text-2xl mb-2 animate-pulse">💊</div>
        <p className="text-sm text-neutral-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Medications */}
      {activeMeds.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-3xl mb-2">💊</div>
          <p className="text-sm font-medium text-neutral-500">등록된 약물이 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">
            '약물 추가' 버튼을 눌러 복용 중인 약물을 등록하세요
          </p>
        </div>
      )}

      {activeMeds.map((med) => (
        <div
          key={med.id}
          className="bg-white rounded-xl border border-[#e8e4df] p-5 shadow-[0_2px_8px_rgba(91,138,114,0.04)] hover:shadow-[0_4px_16px_rgba(91,138,114,0.08)] transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-[#e8f5ee] text-[#3d6b54] text-xs font-semibold">
                복용중
              </span>
              <h3 className="text-base font-bold text-neutral-800">{med.name}</h3>
              {med.dosage && <span className="text-sm text-neutral-500">{med.dosage}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(med)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-500 hover:text-[#5B8A72] hover:bg-[#e8f5ee] transition-colors"
              >
                수정
              </button>
              <button
                onClick={() => handleDeactivate(med)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              >
                복용 종료
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-600">
            {med.method && (
              <div>
                <span className="text-neutral-400 block mb-0.5">투약방법</span>
                <span className="font-medium">{med.method}</span>
              </div>
            )}
            {med.prescribedBy && (
              <div>
                <span className="text-neutral-400 block mb-0.5">처방</span>
                <span className="font-medium">{med.prescribedBy}</span>
              </div>
            )}
            <div>
              <span className="text-neutral-400 block mb-0.5">기간</span>
              <span className="font-medium">
                {formatDate(med.startDate)}
                {med.endDate ? ` ~ ${formatDate(med.endDate)}` : ' ~'}
              </span>
            </div>
            {med.frequency && (
              <div>
                <span className="text-neutral-400 block mb-0.5">복약주기</span>
                <span className="font-medium">{med.frequency}</span>
              </div>
            )}
          </div>

          {med.notes && (
            <p className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
              {med.notes}
            </p>
          )}
        </div>
      ))}

      {/* Inactive Medications (collapsed) */}
      {inactiveMeds.length > 0 && (
        <div className="border border-[#e8e4df] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full flex items-center justify-between px-5 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
          >
            <span className="text-sm font-semibold text-neutral-500">
              종료된 약물 ({inactiveMeds.length})
            </span>
            <svg
              className={`w-4 h-4 text-neutral-400 transition-transform ${showInactive ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showInactive && (
            <div className="divide-y divide-[#e8e4df]">
              {inactiveMeds.map((med) => (
                <div key={med.id} className="px-5 py-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 text-xs font-medium">
                        종료
                      </span>
                      <span className="text-sm font-medium text-neutral-500">{med.name}</span>
                      {med.dosage && <span className="text-xs text-neutral-400">{med.dosage}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateMutation.mutate({ id: med.id, isActive: true })}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-[#5B8A72] hover:bg-[#e8f5ee] transition-colors"
                      >
                        재복용
                      </button>
                      <button
                        onClick={() => handleDelete(med)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {formatDate(med.startDate)}
                    {med.endDate ? ` ~ ${formatDate(med.endDate)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: 복용 기록 ───────────────────────────────────────────────────────
function MedicationLogsTab({ childId }: { childId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { from, to } = getMonthRange(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const { data: medications } = useMedications(childId, true);
  const { data: logs, isLoading } = useMedicationLogs(childId, from, to);
  const upsertLog = useUpsertMedicationLog();

  const [inlineForm, setInlineForm] = useState<{
    medicationId: string;
    day: number;
  } | null>(null);
  const [formTaken, setFormTaken] = useState(true);
  const [formTime, setFormTime] = useState('');
  const [formReason, setFormReason] = useState('');

  // Build lookup: medicationId -> day -> log
  const logMap = useMemo(() => {
    const map: Record<string, Record<number, MedicationLog>> = {};
    if (!logs) return map;
    for (const log of logs) {
      const day = new Date(log.logDate).getDate();
      if (!map[log.medicationId]) map[log.medicationId] = {};
      map[log.medicationId][day] = log;
    }
    return map;
  }, [logs]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const openInlineForm = (medicationId: string, day: number) => {
    const existing = logMap[medicationId]?.[day];
    setInlineForm({ medicationId, day });
    setFormTaken(existing ? existing.taken : true);
    setFormTime(existing?.takenAt ? existing.takenAt.slice(11, 16) : '');
    setFormReason(existing?.skippedReason || '');
  };

  const submitInlineForm = () => {
    if (!inlineForm) return;
    const logDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(inlineForm.day).padStart(2, '0')}`;
    upsertLog.mutate({
      medicationId: inlineForm.medicationId,
      logDate,
      taken: formTaken,
      takenAt: formTaken && formTime ? `${logDate}T${formTime}:00` : null,
      skippedReason: !formTaken && formReason ? formReason : null,
    });
    setInlineForm(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
        <div className="text-2xl mb-2 animate-pulse">📅</div>
        <p className="text-sm text-neutral-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#e8e4df] px-5 py-3">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-bold text-neutral-800">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Medication rows */}
      {(!medications || medications.length === 0) && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm font-medium text-neutral-500">복용 중인 약물이 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">약물 목록 탭에서 약물을 먼저 등록하세요</p>
        </div>
      )}

      {medications?.map((med) => (
        <div
          key={med.id}
          className="bg-white rounded-xl border border-[#e8e4df] p-4 shadow-[0_2px_8px_rgba(91,138,114,0.04)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-neutral-800">{med.name}</span>
            {med.dosage && <span className="text-xs text-neutral-400">{med.dosage}</span>}
          </div>

          {/* Day cells grid */}
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const log = logMap[med.id]?.[day];
              let cellClass = 'bg-neutral-100 text-neutral-300'; // no record
              let cellContent = String(day);

              if (log) {
                if (log.taken) {
                  cellClass = 'bg-green-100 text-green-700 border-green-200';
                  cellContent = '✓';
                } else {
                  cellClass = 'bg-red-100 text-red-600 border-red-200';
                  cellContent = '✗';
                }
              }

              const isSelected = inlineForm?.medicationId === med.id && inlineForm?.day === day;

              return (
                <button
                  key={day}
                  onClick={() => openInlineForm(med.id, day)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center ${cellClass} ${isSelected ? 'ring-2 ring-[#5B8A72] ring-offset-1' : 'hover:ring-1 hover:ring-neutral-300'}`}
                >
                  {cellContent}
                </button>
              );
            })}
          </div>

          {/* Inline form */}
          {inlineForm?.medicationId === med.id && (
            <div className="mt-3 p-3 rounded-lg bg-[#fdfbf7] border border-[#e8e4df] space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-neutral-600">
                  {month + 1}월 {inlineForm.day}일
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`taken-${med.id}`}
                    checked={formTaken}
                    onChange={() => setFormTaken(true)}
                    className="accent-[#5B8A72]"
                  />
                  <span className="text-xs text-neutral-700">복용함</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`taken-${med.id}`}
                    checked={!formTaken}
                    onChange={() => setFormTaken(false)}
                    className="accent-[#5B8A72]"
                  />
                  <span className="text-xs text-neutral-700">미복용</span>
                </label>
              </div>

              {formTaken && (
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">복용 시간</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e8e4df] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
                  />
                </div>
              )}

              {!formTaken && (
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">미복용 사유</label>
                  <input
                    type="text"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="예: 구토로 인해 미복용"
                    className="w-full px-3 py-2 rounded-lg border border-[#e8e4df] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={submitInlineForm}
                  disabled={upsertLog.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#5B8A72] hover:bg-[#3d6b54] disabled:opacity-50 transition-all"
                >
                  {upsertLog.isPending ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setInlineForm(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab 3: 진료 요약 ───────────────────────────────────────────────────────
function MedicationSummaryTab({ childId }: { childId: string }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(
    `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`,
  );
  const [toDate, setToDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  );

  const { data: summaries, isLoading } = useMedicationSummary(childId, fromDate, toDate);

  const copyToClipboard = () => {
    if (!summaries || summaries.length === 0) return;

    let text = `📋 복약 요약 (${fromDate} ~ ${toDate})\n\n`;

    for (const s of summaries) {
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💊 ${s.name}${s.dosage ? ` (${s.dosage})` : ''}\n`;
      text += `   상태: ${s.isActive ? '복용중' : '종료'}\n`;
      text += `   복약 이행률: ${s.adherence.adherenceRate}% (${s.adherence.taken}/${s.adherence.total}일)\n`;

      if (s.reactions.count > 0) {
        text += `   부작용 보고: ${s.reactions.count}건\n`;
        if (s.reactions.avgMoodScore !== null) {
          text += `   평균 기분 점수: ${s.reactions.avgMoodScore.toFixed(1)}/5\n`;
        }
        if (Object.keys(s.reactions.sideEffectCounts).length > 0) {
          text += `   부작용 종류: ${Object.entries(s.reactions.sideEffectCounts)
            .map(([k, v]) => `${k}(${v})`)
            .join(', ')}\n`;
        }
        if (s.reactions.recentNotes.length > 0) {
          text += `   최근 메모:\n`;
          for (const note of s.reactions.recentNotes) {
            text += `     - ${note}\n`;
          }
        }
      } else {
        text += `   부작용 보고: 없음\n`;
      }
      text += '\n';
    }

    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다. 진료 시 활용하세요.');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center">
        <div className="text-2xl mb-2 animate-pulse">📊</div>
        <p className="text-sm text-neutral-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date range picker + copy button */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-[#e8e4df]">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
        />
        <span className="text-neutral-400 text-sm">~</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30"
        />
        <button
          onClick={copyToClipboard}
          disabled={!summaries || summaries.length === 0}
          className="ml-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-[#5B8A72] bg-[#5B8A72]/[0.08] hover:bg-[#5B8A72]/[0.15] disabled:opacity-50 transition-all min-h-[44px]"
        >
          📋 클립보드 복사
        </button>
      </div>

      {/* Summaries */}
      {(!summaries || summaries.length === 0) && (
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm font-medium text-neutral-500">해당 기간 데이터가 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">복용 기록을 입력하면 요약이 생성됩니다</p>
        </div>
      )}

      {summaries?.map((s: MedicationSummary) => (
        <div
          key={s.medicationId}
          className="bg-white rounded-xl border border-[#e8e4df] p-5 shadow-[0_2px_8px_rgba(91,138,114,0.04)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-neutral-800">{s.name}</h3>
              {s.dosage && <span className="text-sm text-neutral-400">{s.dosage}</span>}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${s.isActive ? 'bg-[#e8f5ee] text-[#3d6b54]' : 'bg-neutral-100 text-neutral-400'}`}
              >
                {s.isActive ? '복용중' : '종료'}
              </span>
            </div>
          </div>

          {/* Adherence bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-600">복약 이행률</span>
              <span className="text-sm font-bold text-[#5B8A72]">{s.adherence.adherenceRate}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B8A72] to-[#7bc67e] transition-all duration-500"
                style={{ width: `${Math.min(s.adherence.adherenceRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-neutral-400">
              <span>복용 {s.adherence.taken}일</span>
              <span>미복용 {s.adherence.skipped}일</span>
              <span>전체 {s.adherence.total}일</span>
            </div>
          </div>

          {/* Reactions */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#fdfbf7] border border-[#e8e4df]">
              <div className="text-xs text-neutral-400 mb-0.5">부작용 보고</div>
              <div className="text-lg font-bold text-neutral-800">{s.reactions.count}건</div>
            </div>
            <div className="p-3 rounded-lg bg-[#fdfbf7] border border-[#e8e4df]">
              <div className="text-xs text-neutral-400 mb-0.5">평균 기분</div>
              <div className="text-lg font-bold text-neutral-800">
                {s.reactions.avgMoodScore !== null
                  ? `${s.reactions.avgMoodScore.toFixed(1)}/5`
                  : '-'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#fdfbf7] border border-[#e8e4df]">
              <div className="text-xs text-neutral-400 mb-0.5">부작용 유무</div>
              <div
                className={`text-lg font-bold ${s.reactions.hasAnySideEffect ? 'text-amber-600' : 'text-green-600'}`}
              >
                {s.reactions.hasAnySideEffect ? '있음' : '없음'}
              </div>
            </div>
          </div>

          {/* Side effect details */}
          {Object.keys(s.reactions.sideEffectCounts).length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs font-semibold text-neutral-600 mb-2">부작용 종류</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.reactions.sideEffectCounts).map(([effect, count]) => (
                  <span
                    key={effect}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs border border-amber-100"
                  >
                    {effect} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent notes */}
          {s.reactions.recentNotes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs font-semibold text-neutral-600 mb-2">최근 메모</div>
              <div className="space-y-1">
                {s.reactions.recentNotes.map((note, i) => (
                  <p key={i} className="text-xs text-neutral-500 pl-3 border-l-2 border-[#e8e4df]">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function MedicationPage() {
  const { selectedChildId } = useChildStore();
  const [activeTab, setActiveTab] = useState<MedTab>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  const handleEdit = (med: Medication) => {
    setEditingMed(med);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMed(null);
  };

  if (!selectedChildId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader title="복약 관리" subtitle="처방 약물의 복용을 기록하고 진료 시 활용하세요" />
        <div className="bg-white rounded-2xl border border-[#e8e4df] p-12 text-center shadow-[0_2px_16px_rgba(91,138,114,0.06)]">
          <div className="text-4xl mb-3">💊</div>
          <p className="text-[15px] text-neutral-600 font-medium">아이를 먼저 선택해주세요</p>
          <p className="text-sm text-neutral-400 mt-1">
            상단에서 아이를 선택하면 복약 관리를 시작할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="복약 관리" subtitle="처방 약물의 복용을 기록하고 진료 시 활용하세요" />
        <button
          onClick={() => {
            setEditingMed(null);
            setShowModal(true);
          }}
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5B8A72] hover:bg-[#3d6b54] transition-all min-h-[44px] shadow-[0_2px_8px_rgba(91,138,114,0.2)]"
        >
          + 약물 추가
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 leading-relaxed">
        ⚠️ 이 기능은 의사가 처방한 약물의 복용을 기록하는 보조 도구입니다. 약물 추가 또는 변경은
        반드시 전문 의료진과 상담하세요.
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-2xl bg-neutral-50 border border-neutral-200 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-[11px] transition-all min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && <MedicationListTab childId={selectedChildId} onEdit={handleEdit} />}
      {activeTab === 'logs' && <MedicationLogsTab childId={selectedChildId} />}
      {activeTab === 'summary' && <MedicationSummaryTab childId={selectedChildId} />}

      {/* Modal */}
      <MedicationModal isOpen={showModal} onClose={handleCloseModal} medication={editingMed} />
    </div>
  );
}
