import { useState, useEffect, useRef } from 'react';
import {
  useCreateSessionFeedback,
  useSessionFeedbackAutocomplete,
  type CreateSessionFeedbackInput,
} from '../../hooks/use-session-feedbacks.js';
import { useSchedules } from '../../hooks/use-schedules.js';
import { useChildStore } from '../../stores/child.store.js';

type FeedbackType = 'SESSION' | 'DAILY_LOG' | 'BEHAVIORAL_ISSUE';

const FEEDBACK_TYPE_OPTIONS: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'SESSION', label: '수업 피드백', emoji: '📚' },
  { value: 'DAILY_LOG', label: '일상 기록', emoji: '📝' },
  { value: 'BEHAVIORAL_ISSUE', label: '문제행동', emoji: '⚠️' },
];

const BEHAVIOR_TAGS = ['발작', '자해', '공격', '탈주', '멜트다운', '상동행동', '기타'];

const SESSION_TYPES = [
  'ABA',
  '언어치료',
  '감각통합',
  '작업치료',
  '행동치료',
  '놀이치료',
  '음악치료',
  '미술치료',
  '물리치료',
  '기타',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultScheduleId?: string | null;
}

export function SessionFeedbackModal({ isOpen, onClose, defaultScheduleId }: Props) {
  const { selectedChildId } = useChildStore();
  const createFeedback = useCreateSessionFeedback(selectedChildId);
  const { data: autocomplete } = useSessionFeedbackAutocomplete(selectedChildId);

  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(today + 'T00:00:00.000Z').toISOString();
  const todayEnd = new Date(today + 'T23:59:59.999Z').toISOString();
  const { data: todaySchedules } = useSchedules(selectedChildId, todayStart, todayEnd);

  // Feedback type
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('SESSION');

  // Required fields
  const [sessionType, setSessionType] = useState('');
  const [customSessionType, setCustomSessionType] = useState('');
  const [sessionDate, setSessionDate] = useState(today);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');

  // Behavioral issue fields
  const [severity, setSeverity] = useState<number>(0);
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);

  // Optional fields
  const [showOptional, setShowOptional] = useState(false);
  const [progress, setProgress] = useState('');
  const [challenges, setChallenges] = useState('');
  const [homeWork, setHomeWork] = useState('');
  const [parentNote, setParentNote] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [institution, setInstitution] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [scheduleId, setScheduleId] = useState<string | null>(defaultScheduleId ?? null);

  // Autocomplete state
  const [showTherapistSuggestions, setShowTherapistSuggestions] = useState(false);
  const [showInstitutionSuggestions, setShowInstitutionSuggestions] = useState(false);
  const therapistRef = useRef<HTMLDivElement>(null);
  const institutionRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFeedbackType('SESSION');
      setSessionType('');
      setCustomSessionType('');
      setSessionDate(today);
      setRating(0);
      setContent('');
      setSeverity(0);
      setBehaviorTags([]);
      setProgress('');
      setChallenges('');
      setHomeWork('');
      setParentNote('');
      setTherapistName('');
      setInstitution('');
      setDurationMin('');
      setScheduleId(defaultScheduleId ?? null);
      setShowOptional(!!defaultScheduleId);
      setError('');
    }
  }, [isOpen, defaultScheduleId, today]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (therapistRef.current && !therapistRef.current.contains(e.target as Node)) {
        setShowTherapistSuggestions(false);
      }
      if (institutionRef.current && !institutionRef.current.contains(e.target as Node)) {
        setShowInstitutionSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTherapists = (autocomplete?.therapistNames ?? []).filter(
    (n) => n.toLowerCase().includes(therapistName.toLowerCase()) && n !== therapistName,
  );
  const filteredInstitutions = (autocomplete?.institutions ?? []).filter(
    (n) => n.toLowerCase().includes(institution.toLowerCase()) && n !== institution,
  );

  const finalSessionType = sessionType === '직접입력' ? customSessionType : sessionType;

  function handleSubmit() {
    setError('');
    if (feedbackType === 'SESSION' && !finalSessionType) {
      setError('수업 유형을 선택해주세요.');
      return;
    }
    if (!sessionDate) {
      setError('날짜를 입력해주세요.');
      return;
    }
    if (feedbackType === 'SESSION' && rating === 0) {
      setError('만족도를 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }
    if (feedbackType === 'BEHAVIORAL_ISSUE' && severity === 0) {
      setError('심각도를 선택해주세요.');
      return;
    }

    const input: CreateSessionFeedbackInput = {
      sessionDate,
      sessionType: feedbackType === 'SESSION' ? finalSessionType : feedbackType,
      rating: rating || 3,
      content: content.trim(),
      therapistName: therapistName.trim() || null,
      institution: institution.trim() || null,
      durationMin: durationMin ? parseInt(durationMin, 10) : null,
      scheduleId: scheduleId || null,
      progress: progress.trim() || null,
      challenges: challenges.trim() || null,
      homeWork: homeWork.trim() || null,
      parentNote: parentNote.trim() || null,
      feedbackType,
      severity: feedbackType === 'BEHAVIORAL_ISSUE' ? severity : null,
      behaviorTags: feedbackType === 'BEHAVIORAL_ISSUE' ? behaviorTags : [],
    };

    createFeedback.mutate(input, {
      onSuccess: () => onClose(),
      onError: () => setError('저장에 실패했습니다. 다시 시도해주세요.'),
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-[#e8e4df] shadow-[0_8px_32px_rgba(91,138,114,0.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e8e4df] px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
              <span>📝</span> 수업 피드백 작성
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
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

        <div
          className={`px-6 py-5 space-y-5 ${feedbackType === 'BEHAVIORAL_ISSUE' ? 'bg-orange-50/40' : ''}`}
        >
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Feedback Type Selector */}
          <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 border border-[#e8e4df]">
            {FEEDBACK_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFeedbackType(opt.value)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  feedbackType === opt.value
                    ? 'bg-[#5B8A72] text-white shadow-sm'
                    : 'bg-white text-neutral-500 border border-transparent hover:text-neutral-700'
                }`}
              >
                <span className="mr-1">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Session Type - only for SESSION */}
          {feedbackType === 'SESSION' && (
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                수업 유형 <span className="text-red-400">*</span>
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
              >
                <option value="">선택하세요</option>
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="직접입력">직접 입력</option>
              </select>
              {sessionType === '직접입력' && (
                <input
                  type="text"
                  value={customSessionType}
                  onChange={(e) => setCustomSessionType(e.target.value)}
                  placeholder="수업 유형을 입력하세요"
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
              )}
            </div>
          )}

          {/* Session Date */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              {feedbackType === 'SESSION' ? '수업 날짜' : '날짜'}{' '}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
            />
          </div>

          {/* Rating - required for SESSION, optional for DAILY_LOG, hidden for BEHAVIORAL_ISSUE */}
          {feedbackType !== 'BEHAVIORAL_ISSUE' && (
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                만족도 {feedbackType === 'SESSION' && <span className="text-red-400">*</span>}
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                      star <= rating
                        ? 'bg-amber-50 scale-110'
                        : 'bg-neutral-50 hover:bg-neutral-100 opacity-40 hover:opacity-70'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-neutral-500 self-center">{rating}점</span>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              {feedbackType === 'BEHAVIORAL_ISSUE' ? '상황 설명' : '피드백 내용'}{' '}
              <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                feedbackType === 'DAILY_LOG'
                  ? '오늘 아이는 어땠나요? 있었던 일을 자유롭게 기록하세요'
                  : feedbackType === 'BEHAVIORAL_ISSUE'
                    ? '어떤 문제행동이 있었나요?'
                    : '오늘 수업은 어떠셨나요? 아이의 반응이나 특이사항을 기록해주세요.'
              }
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all resize-none"
            />
          </div>

          {/* Severity - BEHAVIORAL_ISSUE only */}
          {feedbackType === 'BEHAVIORAL_ISSUE' && (
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                심각도 <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      severity === level
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-white text-neutral-600 border-[#e8e4df] hover:border-orange-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1.5 px-1">
                <span className="text-xs text-neutral-400">경미</span>
                <span className="text-xs text-neutral-400">심각</span>
              </div>
            </div>
          )}

          {/* Behavior Tags - BEHAVIORAL_ISSUE only */}
          {feedbackType === 'BEHAVIORAL_ISSUE' && (
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                행동 유형 (복수 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {BEHAVIOR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setBehaviorTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all border ${
                      behaviorTags.includes(tag)
                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                        : 'bg-white text-neutral-600 border-[#e8e4df] hover:border-orange-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Section Toggle */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-[#e8e4df] text-sm text-neutral-500 hover:text-neutral-700 hover:border-[#5B8A72]/30 transition-all"
          >
            <span className="font-medium">상세 정보 (선택)</span>
            <svg
              className={`w-4 h-4 transition-transform ${showOptional ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showOptional && (
            <div className="space-y-4 pl-2 border-l-2 border-[#e8e4df]">
              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  진전 사항
                </label>
                <input
                  type="text"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  placeholder="이번 수업에서 보인 진전이 있다면"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
              </div>

              {/* Challenges */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  어려운 점
                </label>
                <input
                  type="text"
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="어려웠던 부분이 있다면"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
              </div>

              {/* HomeWork */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  숙제 / 가정 과제
                </label>
                <input
                  type="text"
                  value={homeWork}
                  onChange={(e) => setHomeWork(e.target.value)}
                  placeholder="선생님이 알려주신 가정 연습 내용"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
              </div>

              {/* Parent Note */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  부모 메모
                </label>
                <input
                  type="text"
                  value={parentNote}
                  onChange={(e) => setParentNote(e.target.value)}
                  placeholder="개인적인 메모"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
              </div>

              {/* Therapist Name with Autocomplete */}
              <div ref={therapistRef} className="relative">
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  치료사 이름
                </label>
                <input
                  type="text"
                  value={therapistName}
                  onChange={(e) => {
                    setTherapistName(e.target.value);
                    setShowTherapistSuggestions(true);
                  }}
                  onFocus={() => setShowTherapistSuggestions(true)}
                  placeholder="치료사 선생님 이름"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
                {showTherapistSuggestions && filteredTherapists.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e4df] rounded-xl shadow-lg z-20 max-h-32 overflow-y-auto">
                    {filteredTherapists.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setTherapistName(name);
                          setShowTherapistSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-[#e8f5ee] transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Institution with Autocomplete */}
              <div ref={institutionRef} className="relative">
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">기관명</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => {
                    setInstitution(e.target.value);
                    setShowInstitutionSuggestions(true);
                  }}
                  onFocus={() => setShowInstitutionSuggestions(true)}
                  placeholder="치료 센터 또는 기관 이름"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
                {showInstitutionSuggestions && filteredInstitutions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e4df] rounded-xl shadow-lg z-20 max-h-32 overflow-y-auto">
                    {filteredInstitutions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setInstitution(name);
                          setShowInstitutionSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-[#e8f5ee] transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                  수업 시간 (분)
                </label>
                <input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="예: 50"
                  min={1}
                  max={300}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                />
              </div>

              {/* Schedule ID */}
              {todaySchedules && todaySchedules.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                    연결할 일정
                  </label>
                  <select
                    value={scheduleId ?? ''}
                    onChange={(e) => setScheduleId(e.target.value || null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df] bg-[#fdfbf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8A72]/30 focus:border-[#5B8A72] transition-all"
                  >
                    <option value="">선택 안 함</option>
                    {todaySchedules.map((s) => (
                      <option key={s.id} value={s.id.includes('_') ? s.id.split('_')[0] : s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#e8e4df] px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors min-h-[44px]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={createFeedback.isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5B8A72] hover:bg-[#3d6b54] disabled:opacity-50 transition-all min-h-[44px] shadow-[0_2px_8px_rgba(91,138,114,0.2)]"
          >
            {createFeedback.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
