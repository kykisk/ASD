import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChildStore } from '../../stores/child.store';
import { useCreateAssessment } from '../../hooks/use-assessments';
import { useMyFamily } from '../../hooks/use-families';
import { useQuestionnaires, useCreateQuestionnaire } from '../../hooks/use-questionnaires';

const domains = [
  { id: 'communication', name: '의사소통', icon: '🗣️', color: '#7B9FD4' },
  { id: 'social', name: '사회성', icon: '🤝', color: '#E8A87C' },
  { id: 'motor', name: '운동', icon: '🏃', color: '#9B8EC4' },
  { id: 'cognitive', name: '인지', icon: '🧠', color: '#7EC8C8' },
  { id: 'emotional', name: '정서', icon: '💛', color: '#F2B880' },
];

const scaleOptions = [
  { score: 1, emoji: '😢', color: '#E88B8B', bg: '#FFE8E8', label: '관심 필요' },
  { score: 2, emoji: '😟', color: '#F0A86E', bg: '#FFF0E8', label: '노력 필요' },
  { score: 3, emoji: '😐', color: '#D4A800', bg: '#FFFBE8', label: '보통' },
  { score: 4, emoji: '🙂', color: '#5BAA5B', bg: '#EEF8EE', label: '좋음' },
  { score: 5, emoji: '😊', color: '#5B8A72', bg: '#E8F5EE', label: '매우 좋음' },
];

const questions: Record<string, { id: string; text: string }[]> = {
  communication: [{ id: 'comm-1', text: '오늘 아이의 의사소통 능력은 어떠했나요?' }],
  social: [{ id: 'social-1', text: '오늘 아이의 사회적 상호작용은 어떠했나요?' }],
  motor: [{ id: 'motor-1', text: '오늘 아이의 운동 능력은 어떠했나요?' }],
  cognitive: [{ id: 'cognitive-1', text: '오늘 아이의 인지 발달은 어떠했나요?' }],
  emotional: [{ id: 'emotional-1', text: '오늘 아이의 정서 상태는 어떠했나요?' }],
};

const DEFAULT_QUESTIONNAIRE_ITEMS = [
  {
    domain: 'COMMUNICATION' as const,
    text: '오늘 아이의 의사소통 능력은 어떠했나요?',
    orderIndex: 0,
    weight: 1,
  },
  {
    domain: 'SOCIAL' as const,
    text: '오늘 아이의 사회적 상호작용은 어떠했나요?',
    orderIndex: 1,
    weight: 1,
  },
  {
    domain: 'MOTOR' as const,
    text: '오늘 아이의 운동 능력은 어떠했나요?',
    orderIndex: 2,
    weight: 1,
  },
  {
    domain: 'COGNITIVE' as const,
    text: '오늘 아이의 인지 발달은 어떠했나요?',
    orderIndex: 3,
    weight: 1,
  },
  {
    domain: 'EMOTIONAL' as const,
    text: '오늘 아이의 정서 상태는 어떠했나요?',
    orderIndex: 4,
    weight: 1,
  },
];

interface DomainAnswer {
  score: number | null;
  notes: string;
}

type Step = 'select' | 'assess' | 'summary' | 'done';

interface QuestionnaireState {
  id: string;
  items: Record<string, string>; // domain (lowercase) → itemId
}

export function AssessmentForm() {
  const { selectedChildId } = useChildStore();
  const createAssessment = useCreateAssessment();

  const { data: family } = useMyFamily();
  const familyId = family?.id ?? null;
  const { data: questionnaires, isLoading: questionnairesLoading } = useQuestionnaires(familyId);
  const createQuestionnaire = useCreateQuestionnaire(familyId);
  const location = useLocation();
  const preselectedQuestionnaireId =
    (location.state as { questionnaireId?: string } | null)?.questionnaireId ?? null;

  const [step, setStep] = useState<Step>('select');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DomainAnswer>>(() =>
    Object.fromEntries(domains.map((d) => [d.id, { score: null, notes: '' }])),
  );
  const [overallNotes, setOverallNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [photoMessage, setPhotoMessage] = useState(false);
  const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionnaireCreatedRef = useRef(false);

  const currentDomain = domains[currentDomainIndex];
  const completedCount = domains.filter((d) => answers[d.id].score !== null).length;

  useEffect(() => {
    if (!familyId || questionnairesLoading || questionnaireCreatedRef.current) return;
    if (questionnaires && questionnaires.length > 0) {
      const q = preselectedQuestionnaireId
        ? (questionnaires.find((x) => x.id === preselectedQuestionnaireId) ?? questionnaires[0])
        : questionnaires[0];
      const itemsMap: Record<string, string> = {};
      for (const item of q.items) {
        const domainLower = item.domain.toLowerCase();
        if (!itemsMap[domainLower] && item.id) {
          itemsMap[domainLower] = item.id;
        }
      }
      setQuestionnaireState({ id: q.id, items: itemsMap });
      questionnaireCreatedRef.current = true;
    } else if (questionnaires && questionnaires.length === 0) {
      questionnaireCreatedRef.current = true;
      createQuestionnaire.mutate(
        {
          name: '일일 발달 평가',
          description: '5개 영역 일일 발달 평가',
          domains: ['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL'],
          items: DEFAULT_QUESTIONNAIRE_ITEMS,
        },
        {
          onSuccess: (created) => {
            const itemsMap: Record<string, string> = {};
            for (const item of created.items) {
              const domainLower = item.domain.toLowerCase();
              if (!itemsMap[domainLower] && item.id) {
                itemsMap[domainLower] = item.id;
              }
            }
            setQuestionnaireState({ id: created.id, items: itemsMap });
          },
        },
      );
    }
  }, [familyId, questionnaires, questionnairesLoading, createQuestionnaire]);

  const handleScoreSelect = (score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentDomain.id]: { ...prev[currentDomain.id], score },
    }));
  };

  const handleNotesChange = (notes: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentDomain.id]: { ...prev[currentDomain.id], notes },
    }));
  };

  const handlePhotoClick = () => {
    setPhotoMessage(true);
    setTimeout(() => setPhotoMessage(false), 3000);
  };

  const handleNext = () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex((i) => i + 1);
      setShowNotes(false);
    } else {
      setStep('summary');
    }
  };

  const handlePrev = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex((i) => i - 1);
      setShowNotes(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedChildId || !questionnaireState) return;

    const scores = domains
      .filter((d) => answers[d.id].score !== null)
      .map((d) => ({
        itemId: questionnaireState.items[d.id] || d.id,
        domain: d.id.toUpperCase(),
        score: answers[d.id].score!,
        notes: answers[d.id].notes || undefined,
      }));

    try {
      await createAssessment.mutateAsync({
        childId: selectedChildId,
        input: {
          questionnaireId: questionnaireState.id,
          frequency: 'DAILY',
          notes: overallNotes || undefined,
          scores,
        },
      });
      setStep('done');
    } catch {
      /* no-op */
    }
  };

  const overallScore = (() => {
    const scored = domains.filter((d) => answers[d.id].score !== null);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((sum, d) => sum + answers[d.id].score!, 0) / scored.length);
  })();

  if (step === 'select') {
    if (!selectedChildId) {
      return (
        <div className="assessment-root">
          <div className="assessment-animate-in" style={{ marginBottom: 32 }}>
            <h1 className="assessment-title">오늘의 평가</h1>
            <p className="assessment-subtitle">아이의 하루를 기록해주세요</p>
          </div>
          <div
            className="assessment-card assessment-animate-in"
            style={{ animationDelay: '120ms', textAlign: 'center', padding: '32px 24px' }}
          >
            <p style={{ color: '#6B7B8D', fontSize: 15 }}>아이를 먼저 선택해주세요</p>
          </div>
        </div>
      );
    }

    return (
      <div className="assessment-root">
        <div className="assessment-animate-in" style={{ marginBottom: 32 }}>
          <h1 className="assessment-title">오늘의 평가</h1>
          <p className="assessment-subtitle">아이의 하루를 기록해주세요</p>
        </div>

        <div
          className="assessment-card assessment-animate-in"
          style={{ animationDelay: '120ms', cursor: 'pointer' }}
          onClick={() => setStep('assess')}
        >
          <div className="assessment-questionnaire-card">
            <div className="assessment-questionnaire-icon">📋</div>
            <div>
              <h3 className="assessment-questionnaire-name">일일 발달 평가</h3>
              <p className="assessment-questionnaire-desc">5개 영역 · 약 3분 소요</p>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ marginLeft: 'auto' }}
            >
              <path
                d="M7 5l5 5-5 5"
                stroke="#5B8A72"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="assessment-root">
        <div className="assessment-animate-in" style={{ textAlign: 'center', paddingTop: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🌱</div>
          <h1 className="assessment-title" style={{ marginBottom: 8 }}>
            오늘도 수고했어요
          </h1>
          <p className="assessment-subtitle" style={{ marginBottom: 32 }}>
            아이의 성장을 함께 기록하고 있어요
          </p>

          <div className="assessment-card" style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#6B7B8D', marginBottom: 16 }}>
              오늘의 요약
            </h3>
            <div className="assessment-summary-grid">
              {domains.map((d, i) => {
                const score = answers[d.id].score;
                const option = score ? scaleOptions[score - 1] : null;
                return (
                  <div
                    key={d.id}
                    className="assessment-summary-item assessment-animate-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="assessment-summary-dot" style={{ background: d.color }} />
                    <span className="assessment-summary-domain">{d.name}</span>
                    {option && (
                      <span className="assessment-summary-score" style={{ color: option.color }}>
                        {option.emoji} {option.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="assessment-btn-primary"
            style={{ marginTop: 24 }}
            onClick={() => {
              setStep('select');
              setCurrentDomainIndex(0);
              setAnswers(
                Object.fromEntries(domains.map((d) => [d.id, { score: null, notes: '' }])),
              );
              setOverallNotes('');
            }}
          >
            새 평가 시작
          </button>
        </div>
      </div>
    );
  }

  if (step === 'summary') {
    return (
      <div className="assessment-root">
        <div className="assessment-animate-in" style={{ marginBottom: 24 }}>
          <h1 className="assessment-title">평가 요약</h1>
          <p className="assessment-subtitle">결과를 확인하고 제출해주세요</p>
        </div>

        <div className="assessment-card assessment-animate-in" style={{ animationDelay: '80ms' }}>
          <div className="assessment-overall-score">
            <div
              className="assessment-overall-circle"
              style={{
                borderColor: overallScore > 0 ? scaleOptions[overallScore - 1].color : '#E8E4DF',
                background:
                  overallScore > 0 ? `${scaleOptions[overallScore - 1].color}15` : '#F8F8F8',
              }}
            >
              <span style={{ fontSize: 32 }}>
                {overallScore > 0 ? scaleOptions[overallScore - 1].emoji : '—'}
              </span>
            </div>
            <div>
              <div className="assessment-overall-label">전체 평균</div>
              <div
                className="assessment-overall-value"
                style={{
                  color: overallScore > 0 ? scaleOptions[overallScore - 1].color : '#94A3B4',
                }}
              >
                {overallScore > 0 ? scaleOptions[overallScore - 1].label : '미완료'}
              </div>
            </div>
          </div>

          <div className="assessment-divider" />

          <div className="assessment-summary-grid">
            {domains.map((d, i) => {
              const score = answers[d.id].score;
              const option = score ? scaleOptions[score - 1] : null;
              return (
                <div
                  key={d.id}
                  className="assessment-summary-item assessment-animate-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="assessment-summary-dot" style={{ background: d.color }} />
                  <span className="assessment-summary-domain">{d.name}</span>
                  {option ? (
                    <span className="assessment-summary-score" style={{ color: option.color }}>
                      {option.emoji} {score}점
                    </span>
                  ) : (
                    <span className="assessment-summary-score" style={{ color: '#94A3B4' }}>
                      미응답
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="assessment-card assessment-animate-in"
          style={{ animationDelay: '160ms', marginTop: 16 }}
        >
          <label className="assessment-notes-label">전체 메모 (선택사항)</label>
          <textarea
            className="assessment-textarea"
            placeholder="오늘 전체적으로 특별한 점이 있었나요?"
            rows={3}
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
          />
        </div>

        <div className="assessment-nav" style={{ marginTop: 20 }}>
          <button
            className="assessment-btn-secondary"
            onClick={() => {
              setStep('assess');
              setCurrentDomainIndex(domains.length - 1);
            }}
          >
            ← 이전
          </button>
          <button
            className="assessment-btn-primary"
            onClick={handleSubmit}
            disabled={createAssessment.isPending || !questionnaireState}
          >
            {createAssessment.isPending
              ? '제출 중...'
              : !questionnaireState
                ? '준비 중...'
                : '제출하기'}
          </button>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentDomain.id];
  const currentQuestion = questions[currentDomain.id][0];
  const selectedOption = currentAnswer.score ? scaleOptions[currentAnswer.score - 1] : null;

  return (
    <div className="assessment-root">
      <div className="assessment-animate-in" style={{ marginBottom: 28 }}>
        <div className="assessment-progress-header">
          <span className="assessment-progress-text">
            {completedCount}/{domains.length} 영역 완료
          </span>
          <span className="assessment-progress-current">
            {currentDomain.icon} {currentDomain.name}
          </span>
        </div>
        <div className="assessment-progress-track">
          <div
            className="assessment-progress-bar"
            style={{
              width: `${(completedCount / domains.length) * 100}%`,
              background: currentDomain.color,
            }}
          />
        </div>
      </div>

      <div
        className="assessment-card assessment-animate-in"
        style={{ animationDelay: '100ms', padding: '28px 24px' }}
      >
        <div className="assessment-domain-badge" style={{ background: `${currentDomain.color}20` }}>
          <span style={{ fontSize: 24 }}>{currentDomain.icon}</span>
        </div>

        <h2 className="assessment-question-text">{currentQuestion.text}</h2>
        <p className="assessment-question-hint">전체적인 인상을 편하게 선택해주세요</p>

        <div className="assessment-scale">
          {scaleOptions.map((option) => (
            <button
              key={option.score}
              className="assessment-scale-btn"
              onClick={() => handleScoreSelect(option.score)}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border:
                  currentAnswer.score === option.score
                    ? `3px solid ${option.color}`
                    : '2px solid #E8E4DF',
                background: currentAnswer.score === option.score ? option.bg : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                cursor: 'pointer',
                boxShadow:
                  currentAnswer.score === option.score ? `0 4px 12px ${option.color}40` : 'none',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {option.emoji}
            </button>
          ))}
        </div>

        {selectedOption && (
          <div
            className="assessment-selected-label assessment-animate-in"
            style={{ background: `${selectedOption.color}15` }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: selectedOption.color }}>
              {selectedOption.label}
            </span>
          </div>
        )}

        <div className="assessment-media-row">
          <button
            className="assessment-media-btn"
            onClick={handlePhotoClick}
            title="사진/영상 첨부"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5B8A72"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
            <span>사진/영상</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={() => {
              /* disabled */
            }}
          />
          {photoMessage && (
            <span
              className="assessment-animate-in"
              style={{ fontSize: 12, color: '#6B7B8D', marginLeft: 8 }}
            >
              사진 첨부는 프로덕션 환경에서 사용 가능합니다
            </span>
          )}
        </div>

        <div className="assessment-notes-section">
          <button className="assessment-notes-toggle" onClick={() => setShowNotes(!showNotes)}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            메모 {showNotes ? '접기' : '추가'}
          </button>
          {showNotes && (
            <textarea
              className="assessment-textarea assessment-animate-in"
              placeholder="오늘 특별히 기억나는 순간이 있나요?"
              rows={3}
              value={currentAnswer.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="assessment-dots assessment-animate-in" style={{ animationDelay: '180ms' }}>
        {domains.map((d, i) => (
          <div
            key={d.id}
            className="assessment-dot"
            style={{
              background:
                i === currentDomainIndex
                  ? d.color
                  : answers[d.id].score !== null
                    ? `${d.color}80`
                    : '#E8E4DF',
              transform: i === currentDomainIndex ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <div className="assessment-nav">
        <button
          className="assessment-btn-secondary"
          onClick={handlePrev}
          disabled={currentDomainIndex === 0}
          style={{ opacity: currentDomainIndex === 0 ? 0.4 : 1 }}
        >
          ← 이전
        </button>
        <button
          className="assessment-btn-primary"
          onClick={handleNext}
          disabled={currentAnswer.score === null}
          style={{ opacity: currentAnswer.score === null ? 0.5 : 1 }}
        >
          {currentDomainIndex === domains.length - 1 ? '요약 보기' : '다음 영역 →'}
        </button>
      </div>
    </div>
  );
}
